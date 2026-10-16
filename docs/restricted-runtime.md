# Restricted retrieval and routing runtime

This is an executable Linux-container profile for a single approved checkout and project-memory directory. It is intended for deployments that need enforced filesystem/network boundaries around SuperSkill. It does not make an unrestricted agent's other host tools safe: expose only the approved capabilities to that agent.

## Build and verify

From the repository checkout, with Docker available:

```sh
docker build -f deploy/Dockerfile -t superskill-restricted:local .
node scripts/restricted-runtime.smoke.mjs
```

The base image is digest-pinned. Dependency installation and OS package acquisition happen at build time, not runtime. The build context excludes local vault state, environment files, keys, databases, logs and node_modules. Release operators should approve the resulting image ID/digest and use it with `--image`; the launcher sets `--pull never` rather than downloading an unknown image on demand.

The smoke test uses synthetic, disposable directories. It checks actual kernel denial of external network access, root/workspace/vault writes, zero effective capabilities, no-new-privileges, non-root identity and the PID limit. It then connects a real MCP client, verifies allowed retrieval/routing, denied writes/installations/cross-project access, blocked unapproved skills, external audit records and absence of persisted routing state in the host checkout.

## Launch

The approved checkout must already contain a real `.superskill` directory and a regular `.gitignore` with a `.superskill/` entry. The launcher checks these prerequisites instead of changing a read-only checkout. Metadata contents are hidden by a private tmpfs, not changed. Use a self-contained Git checkout; linked worktrees whose Git administration directory is outside the mount are not supported by this isolated profile.

```sh
node scripts/run-restricted.mjs \
  --workspace /absolute/approved-checkout \
  --project-vault /absolute/vault/projects/approved-project \
  --audit-log /absolute/private-audit/superskill.jsonl
```

The audit parent directory must already exist under trusted ownership. Pass only the one intended project directory, never the vault root or home directory. The launcher canonicalizes paths and rejects mount-option injection. Linux and macOS Docker hosts are supported; Windows users need a Linux/WSL environment with compatible absolute paths and identity semantics.

Inside the isolated instance the mounted memory is named `project`. Use the returned `project_slug` and project-relative note paths rather than the host vault's absolute path or original slug.

## Enforced boundaries

- Network mode `none`; no published ports or host network.
- Read-only root filesystem and read-only project/vault bind mounts.
- Non-root UID/GID, all capabilities dropped, no-new-privileges and Docker's default seccomp profile.
- Bounded CPU, 512 MiB memory, 64 PIDs and bounded tmpfs scratch with noexec/nosuid/nodev.
- No host credential directories, environment files or Docker socket mounted into the container.
- Ephemeral routing metadata; raw task history disabled; telemetry disabled.
- MCP dispatch limited to `read`, `project_context`, `superskill` and `graph_traverse`.
- Non-catalog skills require host pins; this curated-only launcher supplies none. Missing capabilities are disclosed, not downloaded or executed.
- Arbitrary child diagnostics are withheld by the supervisor instead of copied into logs. Normal MCP response data is delivered to the authorized client and must follow that client's data-handling policy.

Vault mutations and remote installation are deliberately unavailable. Their denial is enforced both by tool authorization and read-only mounts. This profile does not claim to turn the general-purpose local VaultFS best-effort write log into a transactional banking ledger.

## External audit boundary

The host launcher requires an audit file outside both mounted trees. It refuses symlinks, hardlinks, unsafe ownership/permissions, path replacement and exhausted capacity. A single-writer exclusive lock prevents concurrent appenders; existing records are validated before reuse, so unrelated files and incomplete crash tails are never silently appended to. New directory entries and records are synced. The file is not visible to the container. Each accepted request receives an opaque sequence and an fsynced allowlisted metadata record **before** forwarding; each response is fsynced as `response-prepared` **before** forwarding to the client. Payloads, task text, note contents, request IDs and error messages are not recorded.

A crash can leave an exclusive lock or an incomplete tail. Preserve the journal and confirm that no writer is active before an authorized recovery or archive; the launcher never guesses that a stale-looking PID permits deleting a lock or truncating evidence.

The distinction between `request-admitted` and `response-prepared` is intentional. A crash can leave an admitted request with unknown outcome; the log does not falsely claim rollback or receipt by the client. Audit errors stop forwarding rather than silently admitting unaudited work. Protocol line size, identifier size and outstanding requests are bounded. The 32 MiB log cap fails closed; rotate/archive the log through an authorized external process between runs.

This protects the journal from the confined process, not from a compromised host administrator or failed storage hardware. Deploy the host journal on storage meeting the institution's durability/retention requirements and forward it to independently controlled immutable storage when required. A metadata journal alone does not establish institutional compliance, multi-user authentication or publisher attestation.

## Operational limits

Runtime retrieval may send authorized content to the host/model through MCP stdout; disabling container egress does not disable the client's model connection. The host/model contract, data classification, key management and operator identity remain deployment controls. Do not grant the same agent unrestricted host shell/file/network access that bypasses this profile. Restarting the container drops its tmpfs state; persistent user-authored memories remain in the read-only host project directory.
