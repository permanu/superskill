import { realpath, stat, lstat, open } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { once } from "node:events";
import { openRestrictedAudit, boundedJsonLines } from "./restricted-audit.mjs";

export function assertLocalDockerEndpoint(endpoint) {
  if (typeof endpoint !== "string" || !/^unix:\/\/\/[^\r\n\0]+$/.test(endpoint)) throw new Error("Restricted mounts require an approved local Docker endpoint");
}

export function restrictedDockerArgs({ workspace, vault, image = "superskill-restricted:local", uid = 1000, gid = 1000, probe = false }) {
  if (![uid, gid].every(value => Number.isSafeInteger(value) && value > 0)) throw new Error("A non-root UID and GID are required");
  if ([workspace, vault].some(path => typeof path !== "string" || /[,\r\n\0]/.test(path) || !path.startsWith("/"))) throw new Error("Mounts require absolute paths without mount-option delimiters");
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._/:@-]*$/.test(image)) throw new Error("Invalid image reference");
  const tmpfs = `rw,noexec,nosuid,nodev,size=64m,uid=${uid},gid=${gid},mode=0700`;
  return ["run", "--rm", "--pull", "never", "-i", "--init", "--network", "none", "--read-only", "--cap-drop", "ALL", "--security-opt", "no-new-privileges:true", "--pids-limit", "64", "--memory", "512m", "--memory-swap", "512m", "--cpus", "1", "--user", `${uid}:${gid}`,
    "--mount", `type=bind,source=${workspace},target=/workspace,readonly`,
    "--mount", `type=bind,source=${vault},target=/home/node/vault/projects/project,readonly`,
    "--tmpfs", `/tmp:${tmpfs}`, "--tmpfs", `/home/node/vault:${tmpfs}`, "--tmpfs", `/workspace/.superskill:${tmpfs}`,
    image, ...(probe ? ["--probe"] : [])];
}

async function main() {
  const args = process.argv.slice(2);
  const allowed = new Set(["--workspace", "--project-vault", "--audit-log", "--image", "--probe"]);
  const values = {};
  for (let i = 0; i < args.length; i++) {
    if (!allowed.has(args[i])) throw new Error("Unknown restricted-launch option");
    if (args[i] === "--probe") values.probe = true;
    else { const key = args[i]; if (!args[i + 1] || args[i + 1].startsWith("--")) throw new Error("Missing launch option value"); values[key] = args[++i]; }
  }
  if (!values["--workspace"] || !values["--project-vault"]) throw new Error("Pass --workspace and --project-vault explicitly");
  const workspace = await realpath(resolve(values["--workspace"]));
  const vault = await realpath(resolve(values["--project-vault"]));
  const metadata = await lstat(join(workspace, ".superskill"));
  if (!(await stat(workspace)).isDirectory() || !(await stat(vault)).isDirectory() || !metadata.isDirectory() || metadata.isSymbolicLink()) throw new Error("Mount directories and a real workspace .superskill mount point must exist");
  const ignore = await open(join(workspace, ".gitignore"), constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const info = await ignore.stat();
    if (!info.isFile() || info.size > 65536) throw new Error("A bounded regular .gitignore is required");
    const buffer = Buffer.alloc(65537);
    const { bytesRead } = await ignore.read(buffer, 0, buffer.length, 0);
    if (bytesRead > 65536 || !buffer.subarray(0, bytesRead).toString("utf8").split(/\r?\n/).some(line => /^\/?\.superskill\/?$/.test(line.trim()))) throw new Error("Ignore .superskill before using the read-only runtime");
  } finally { await ignore.close(); }
  const dockerArgs = restrictedDockerArgs({ workspace, vault, image: values["--image"], uid: process.getuid?.() || 1000, gid: process.getgid?.() || 1000, probe: values.probe === true });
  if (process.env.DOCKER_HOST !== undefined) assertLocalDockerEndpoint(process.env.DOCKER_HOST);
  const endpoint = await promisify(execFile)("docker", ["context", "inspect", "--format", "{{.Endpoints.docker.Host}}"], { timeout: 10000, maxBuffer: 4096 });
  assertLocalDockerEndpoint(endpoint.stdout.trim());
  if (!values.probe && !values["--audit-log"]) throw new Error("An external audit log is required");
  const audit = values.probe ? undefined : await openRestrictedAudit(values["--audit-log"], [workspace, vault]);
  const child = spawn("docker", dockerArgs, { stdio: values.probe ? ["inherit", "inherit", "pipe"] : ["pipe", "pipe", "pipe"] });
  child.on("error", () => { console.error("Restricted runtime failed to start"); process.exitCode = 1; });
  child.on("close", code => { process.exitCode = code ?? 1; });
  let diagnosticReported = false;
  child.stderr.on("data", () => { if (!diagnosticReported) console.error("Restricted runtime diagnostic withheld"); diagnosticReported = true; });
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
  if (!audit) return;
  let failed = false;
  const abort = () => { if (!failed) console.error("Restricted protocol or audit boundary failed"); failed = true; process.exitCode = 1; child.kill("SIGTERM"); process.stdin.destroy(); };
  child.on("close", () => { process.stdin.destroy(); if (failed) process.exitCode = 1; });
  child.stdin.on("error", abort);
  process.stdout.on("error", abort);
  const write = async (stream, value) => { if (!stream.write(`${JSON.stringify(value)}\n`)) await once(stream, "drain"); };
  const pending = new Map();
  let sequence = 0;
  const inbound = (async () => {
    for await (const message of boundedJsonLines(process.stdin)) {
      if (pending.size >= 128) throw new Error("Too many outstanding requests");
      if (message.id !== undefined && pending.has(JSON.stringify(message.id))) throw new Error("Duplicate outstanding request identifier");
      const number = ++sequence;
      const operation = message.method === "tools/call" ? message.params?.name : message.method;
      await audit.record("request", number, operation, "pending");
      if (message.id !== undefined) pending.set(JSON.stringify(message.id), { number, operation });
      await write(child.stdin, message);
    }
    child.stdin.end();
  })();
  const outbound = (async () => {
    for await (const message of boundedJsonLines(child.stdout)) {
      const key = JSON.stringify(message.id);
      const request = pending.get(key);
      await audit.record("response", request?.number ?? 0, request?.operation, message.error || message.result?.isError ? "error" : "ok");
      pending.delete(key);
      await write(process.stdout, message);
    }
  })();
  const guarded = promise => promise.catch(() => { if (child.exitCode === null) abort(); });
  await Promise.all([guarded(inbound), guarded(outbound)]);
  await audit.close();
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(() => { console.error("Restricted launch refused; check explicit paths, mount points and non-root identity"); process.exitCode = 1; });
