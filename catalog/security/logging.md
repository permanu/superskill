---
name: logging
pack: security
always: false
triggers: [logging, logs, leakage, redaction, secrets, diagnostics, snapshots, artifacts, telemetry]
---

# Production logging and test leakage

Use for production diagnostics, error boundaries, telemetry, tests, CI output and artifacts. The activation default policy carries the minimum rule in every phase. Treat leakage as a release blocker.

Shared atomic controls: `rule:shared-obs-allowlisted-diagnostics`, `rule:shared-test-sensitive-output`, `rule:shared-sec-scan-before-truncation`. Resolve/open only the control relevant to the current task; these invariants are shared across languages, while language adapters hold API-specific examples.

## Data minimization first

Define an allowlisted event schema before emitting data: static event name, bounded outcome/code, server-generated opaque correlation ID, duration and counts where justified. Do not pass raw Error objects, messages, stacks, causes, HTTP objects, URLs/query strings, headers/cookies, environment, CLI arguments, SQL bindings, prompts, model responses or subprocess stdout/stderr into logs. These can contain credentials or customer data even when the error looks routine. Unknown fields are omitted by default, including at debug level.

Never log passwords, tokens, private keys, connection strings, OTPs, CVV, PINs, bank/account/card identifiers, balances or personal data by default. Last-four digits, emails and hashes are not automatically anonymous. Require an explicit purpose and data classification for any exception; credentials and authentication secrets remain excluded. Do not use unkeyed hashes of low-entropy customer identifiers as anonymization.

Use reviewed error codes instead of arbitrary error text. Keep diagnostics useful with event identity and correlation; retrieve protected operational context through a separate authorized workflow. Redact before serialization, truncation and export as defense in depth, never as the only control. Normalize or reject CR/LF/control characters, bound bytes and cardinality, avoid getters/toJSON/custom inspection of untrusted objects, and test logger failure without recursive logging.

## Test and CI boundary

Use synthetic fixtures and ephemeral sandbox credentials. Do not copy production traffic, database rows, environment or credentials into fixtures. Untrusted PR jobs receive no production secrets. Avoid shell tracing, verbose HTTP/debug dumps and environment dumps. A failing assertion may print its actual value: leakage assertions compare booleans or safe codes, not raw captured payloads. Never put credential values in test titles or snapshot names.

Capture stdout/stderr, error responses, snapshots, traces, screenshots, JUnit/HTML reports, coverage source and uploaded artifacts in adversarial tests. Inject synthetic canaries through nested errors, causes, authorization headers, URL credentials, query strings, multiline keys, encoded values, buffers, thrown objects and subprocess failures. Assert the actual sinks omit sensitive values on success, failure, timeout and cancellation. Check before upload; a post-upload scan is too late. Test scanner failures and oversize inputs. Only synthetic canaries may intentionally appear in rejection fixtures.

## Operations

Restrict log access and exports, encrypt transport/storage, define retention/deletion, protect audit integrity, monitor ingestion failures and exercise incident response. Separate best-effort diagnostics from mandatory audit records; define fail-closed or durable-spool behavior for audit loss before admitting regulated mutations. Do not silently drop mandatory audit events or claim mutable local JSONL is tamper-proof.

Sources: [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html), [CWE-532](https://cwe.mitre.org/data/definitions/532.html). Record the sink, test command, result and residual limitations. A clean regex scan does not prove absence of secrets or PII.
