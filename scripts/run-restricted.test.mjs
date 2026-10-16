import { test } from "node:test";
import assert from "node:assert/strict";
import { restrictedDockerArgs, assertLocalDockerEndpoint } from "./run-restricted.mjs";

test("restricted runtime has kernel boundaries and no credential or socket mounts", () => {
  const args = restrictedDockerArgs({ workspace: "/approved/repo", vault: "/approved/project" });
  for (const [flag, value] of [["--network", "none"], ["--cap-drop", "ALL"], ["--security-opt", "no-new-privileges:true"], ["--pids-limit", "64"], ["--memory", "512m"], ["--user", "1000:1000"]]) assert.equal(args[args.indexOf(flag) + 1], value);
  assert.ok(args.includes("--read-only"));
  const mounts = args.filter((_, index) => args[index - 1] === "--mount");
  assert.equal(mounts.length, 2);
  assert.ok(mounts.every(mount => mount.endsWith(",readonly")));
  assert.ok(!args.join(" ").includes("docker.sock"));
  assert.ok(!args.includes("--env-file"));
});
test("restricted runtime rejects mount-option injection and root identities", () => {
  for (const workspace of ["/repo,readonly=false", "/repo\n", "relative", "/repo\0"]) assert.throws(() => restrictedDockerArgs({ workspace, vault: "/vault" }));
  assert.throws(() => restrictedDockerArgs({ workspace: "/repo", vault: "/vault", uid: 0 }));
  assert.throws(() => restrictedDockerArgs({ workspace: "/repo", vault: "/vault", image: "--privileged" }));
});
test("restricted mounts cannot silently target a remote Docker filesystem", () => {
  assert.doesNotThrow(() => assertLocalDockerEndpoint("unix:///var/run/docker.sock"));
  for (const endpoint of ["tcp://remote:2375", "ssh://remote", "unix://relative", "unix:///socket\n"]) assert.throws(() => assertLocalDockerEndpoint(endpoint));
});
