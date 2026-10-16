import { writeFile, readFile } from "node:fs/promises";
import { connect } from "node:net";

async function denied(path) {
  try { await writeFile(path, "synthetic isolation probe", { flag: "wx" }); return false; }
  catch (error) { return ["EROFS", "EACCES", "EPERM"].includes(error.code); }
}

const networkDenied = await new Promise(resolve => {
  const socket = connect({ host: "198.51.100.1", port: 443 });
  socket.setTimeout(2000, () => { socket.destroy(); resolve(false); });
  socket.once("connect", () => { socket.destroy(); resolve(false); });
  socket.once("error", error => resolve(["ENETUNREACH", "ENETDOWN", "EHOSTUNREACH", "EACCES", "EPERM"].includes(error.code)));
});
const status = await readFile("/proc/self/status", "utf8");
const checks = {
  nonRoot: process.getuid() !== 0,
  rootReadOnly: await denied("/etc/superskill-isolation-probe"),
  workspaceReadOnly: await denied("/workspace/superskill-isolation-probe"),
  vaultReadOnly: await denied("/home/node/vault/projects/project/superskill-isolation-probe"),
  networkDenied,
  noCapabilities: /^CapEff:\s+0+$/m.test(status),
  noNewPrivileges: /^NoNewPrivs:\s+1$/m.test(status),
  pidsBounded: (await readFile("/sys/fs/cgroup/pids.max", "utf8")).trim() === "64",
};
console.log(JSON.stringify(checks));
if (Object.values(checks).some(value => value !== true)) process.exitCode = 1;
