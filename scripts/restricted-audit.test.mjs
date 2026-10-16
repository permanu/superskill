import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, rename, writeFile, symlink, link } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { openRestrictedAudit, boundedJsonLines } from "./restricted-audit.mjs";

test("audit syncs only allowlisted metadata and rejects replacement before another record", async () => {
  const root = await mkdtemp(join(tmpdir(), "restricted-audit-"));
  let audit;
  try {
    const file = join(root, "audit.jsonl");
    audit = await openRestrictedAudit(file, []);
    await audit.record("request", 1, "synthetic-private-canary", "pending");
    await audit.record("response", 1, "read", "ok");
    const text = await readFile(file, "utf8");
    assert.equal(text.includes("synthetic-private-canary"), false);
    const records = text.trim().split("\n").map(JSON.parse);
    assert.equal(records[0].operation, "other");
    assert.equal(records[1].event, "response-prepared");
    await rename(file, join(root, "prior.jsonl"));
    await writeFile(file, "replacement", { mode: 0o600 });
    await assert.rejects(audit.record("request", 2, "read", "pending"), /identity changed/);
  } finally { if (audit) await audit.close().catch(() => {}); await rm(root, { recursive: true, force: true }); }
});

test("audit refuses mounted locations, symlinks and hardlinks", async () => {
  const root = await mkdtemp(join(tmpdir(), "restricted-audit-"));
  try {
    const data = join(root, "data"); await mkdir(data);
    await assert.rejects(openRestrictedAudit(join(data, "audit"), [data]), /outside mounted/);
    const original = join(root, "original"); await writeFile(original, "", { mode: 0o600 });
    const alias = join(root, "alias"); await symlink(original, alias);
    await assert.rejects(openRestrictedAudit(alias, []));
    await rm(alias); await link(original, alias);
    await assert.rejects(openRestrictedAudit(alias, []), /owner-private/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("protocol framing bounds incomplete lines, identifiers and malformed data", async () => {
  const collect = async value => { const result = []; for await (const item of boundedJsonLines(Readable.from(value), 128)) result.push(item); return result; };
  assert.equal((await collect(['{"jsonrpc":"2.', '0","id":1,"method":"ping"}\n'])).length, 1);
  for (const input of ["x".repeat(129), '{"jsonrpc":"2.0"}', "not-json\n", '{"jsonrpc":"2.0","id":{}}\n']) await assert.rejects(collect([input]));
});

test("audit protects existing files, rejects partial history, and permits only one writer", async () => {
  const root = await mkdtemp(join(tmpdir(), "restricted-audit-history-"));
  const file = join(root, "audit.jsonl");
  let audit;
  try {
    await writeFile(file, "unrelated user file\n", { mode: 0o600 });
    await assert.rejects(openRestrictedAudit(file, []));
    assert.equal(await readFile(file, "utf8"), "unrelated user file\n");
    await writeFile(file, "");
    audit = await openRestrictedAudit(file, []);
    await assert.rejects(openRestrictedAudit(file, []), { code: "EEXIST" });
    await audit.record("request", 1, "read", "pending");
    await audit.close(); audit = undefined;
    const complete = await readFile(file, "utf8");
    audit = await openRestrictedAudit(file, []);
    await audit.close(); audit = undefined;
    await writeFile(file, complete.slice(0, -1));
    await assert.rejects(openRestrictedAudit(file, []), /Incomplete audit/);
  } finally { await audit?.close(); await rm(root, { recursive: true, force: true }); }
});
