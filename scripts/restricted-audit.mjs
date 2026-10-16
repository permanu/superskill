import { constants } from "node:fs";
import { lstat, open, realpath, unlink } from "node:fs/promises";
import { dirname, resolve, relative, isAbsolute } from "node:path";
import { randomUUID } from "node:crypto";

const MAX_AUDIT_BYTES = 32 * 1024 * 1024;
const OPERATIONS = new Set(["initialize", "ping", "tools/list", "resources/list", "prompts/list", "read", "project_context", "superskill", "graph_traverse"]);

function validAuditRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 7
    && typeof value.session === "string" && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(value.session)
    && (value.actor_uid === null || Number.isSafeInteger(value.actor_uid) && value.actor_uid >= 0)
    && typeof value.ts === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value.ts) && Number.isFinite(Date.parse(value.ts))
    && ["request-admitted", "response-prepared"].includes(value.event)
    && Number.isSafeInteger(value.sequence) && value.sequence >= 0
    && (OPERATIONS.has(value.operation) || value.operation === "other") && ["pending", "ok", "error"].includes(value.outcome);
}

async function validateAuditFile(handle, size) {
  if (size > MAX_AUDIT_BYTES) throw new Error("Audit capacity exhausted");
  const buffer = Buffer.alloc(size + 1);
  let used = 0;
  while (used < buffer.length) {
    const { bytesRead } = await handle.read(buffer, used, buffer.length - used, used);
    if (!bytesRead) break;
    used += bytesRead;
  }
  if (used !== size || (await handle.stat()).size !== size) throw new Error("Audit changed while opening");
  if (!size) return;
  if (buffer[size - 1] !== 10) throw new Error("Incomplete audit record requires recovery");
  const text = new TextDecoder("utf8", { fatal: true }).decode(buffer.subarray(0, size));
  for (const line of text.slice(0, -1).split("\n")) {
    if (Buffer.byteLength(line) > 2048 || !validAuditRecord(JSON.parse(line))) throw new Error("Invalid audit history requires recovery");
  }
}

export async function openRestrictedAudit(path, excludedRoots) {
  const parent = await realpath(dirname(resolve(path)));
  for (let directory = parent; ; directory = dirname(directory)) {
    const info = await lstat(directory);
    if (!info.isDirectory() || (info.uid !== 0 && process.getuid && info.uid !== process.getuid()) || ((info.mode & 0o022) !== 0 && (info.mode & 0o1000) === 0)) throw new Error("Audit directory ownership is unsafe");
    if (dirname(directory) === directory) break;
  }
  const target = resolve(parent, resolve(path).split(/[\\/]/).pop());
  for (const root of excludedRoots) {
    const rel = relative(await realpath(root), target);
    if (rel === "" || (!rel.startsWith("..") && !isAbsolute(rel))) throw new Error("Audit log must be outside mounted data");
  }
  const session = randomUUID();
  const lockPath = `${target}.lock`;
  const lock = await open(lockPath, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
  const lockIdentity = await lock.stat();
  const release = async () => {
    try {
      const current = await lstat(lockPath);
      if (current.dev !== lockIdentity.dev || current.ino !== lockIdentity.ino) throw new Error("Audit lock ownership changed");
      await unlink(lockPath);
    } finally { await lock.close(); }
  };
  let handle;
  let identity;
  try {
    await lock.writeFile(JSON.stringify({ pid: process.pid, session, createdAt: new Date().toISOString() }));
    await lock.sync();
    handle = await open(target, constants.O_RDWR | constants.O_APPEND | constants.O_CREAT | constants.O_NOFOLLOW, 0o600);
    identity = await handle.stat();
    if (!identity.isFile() || identity.nlink !== 1 || (identity.mode & 0o077) !== 0 || (process.getuid && identity.uid !== process.getuid())) throw new Error("Audit log must be an owner-private regular file");
    await validateAuditFile(handle, identity.size);
    const directory = await open(parent, constants.O_RDONLY | constants.O_NOFOLLOW);
    try { await directory.sync(); } finally { await directory.close(); }
  } catch (error) {
    try { await handle?.close(); } finally { await release(); }
    throw error;
  }
  let chain = Promise.resolve();
  let closed = false;
  return {
    record(event, sequence, operation, outcome) {
      if (closed) return Promise.reject(new Error("Audit is closed"));
      const record = { session, actor_uid: process.getuid?.() ?? null, ts: new Date().toISOString(), event: event === "response" ? "response-prepared" : "request-admitted", sequence: Number.isSafeInteger(sequence) && sequence >= 0 ? sequence : 0, operation: OPERATIONS.has(operation) ? operation : "other", outcome: outcome === "error" ? "error" : outcome === "ok" ? "ok" : "pending" };
      chain = chain.then(async () => {
        const current = await lstat(target);
        if (!current.isFile() || current.nlink !== 1 || current.dev !== identity.dev || current.ino !== identity.ino || (current.mode & 0o077) !== 0) throw new Error("Audit log identity changed");
        const line = `${JSON.stringify(record)}\n`;
        if ((await handle.stat()).size + Buffer.byteLength(line) > MAX_AUDIT_BYTES) throw new Error("Audit capacity exhausted");
        await handle.writeFile(line);
        await handle.sync();
      });
      return chain;
    },
    async close() {
      if (closed) return;
      closed = true;
      try { await chain; } finally { try { await handle.close(); } finally { await release(); } }
    },
  };
}

export async function* boundedJsonLines(stream, maxBytes = 1024 * 1024) {
  let pending = Buffer.alloc(0);
  for await (const chunk of stream) {
    pending = Buffer.concat([pending, Buffer.from(chunk)]);
    let end;
    while ((end = pending.indexOf(10)) !== -1) {
      if (end > maxBytes) throw new Error("Protocol line exceeds admission limit");
      const line = pending.subarray(0, end);
      pending = pending.subarray(end + 1);
      if (!line.length) continue;
      const value = JSON.parse(new TextDecoder("utf8", { fatal: true }).decode(line));
      if (!value || typeof value !== "object" || Array.isArray(value) || value.jsonrpc !== "2.0") throw new Error("Invalid protocol message");
      if (value.id !== undefined && value.id !== null && !(typeof value.id === "number" && Number.isSafeInteger(value.id)) && !(typeof value.id === "string" && Buffer.byteLength(value.id) <= 128)) throw new Error("Invalid protocol identifier");
      yield value;
    }
    if (pending.length > maxBytes) throw new Error("Protocol line exceeds admission limit");
  }
  if (pending.length) throw new Error("Incomplete protocol message");
}
