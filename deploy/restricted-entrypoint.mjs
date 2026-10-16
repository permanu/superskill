import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";

if (process.argv[2] === "--probe") {
  await import("./restricted-probe.mjs");
} else {
  await mkdir("/home/node/vault", { recursive: true });
  await writeFile("/home/node/vault/project-map.json", JSON.stringify({ "/workspace": "project" }), { mode: 0o600, flag: "wx" });
  const child = spawn(process.execPath, ["/app/dist/mcp-server.js"], { stdio: ["pipe", "pipe", "pipe"] });
  let notified = false;
  child.stderr.on("data", () => {
    if (!notified) process.stderr.write('{"event":"restricted.child_diagnostic_withheld"}\n');
    notified = true;
  });
  child.on("error", () => { process.stderr.write('{"event":"restricted.start_failed"}\n'); process.exitCode = 1; });
  child.on("close", code => { process.exitCode = code ?? 1; });
  child.stdin.on("error", () => { process.stderr.write('{"event":"restricted.input_failed"}\n'); process.exitCode = 1; child.kill("SIGTERM"); });
  process.stdout.on("error", () => { child.kill("SIGTERM"); });
  process.stdin.pipe(child.stdin);
  child.stdout.pipe(process.stdout);
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
}
