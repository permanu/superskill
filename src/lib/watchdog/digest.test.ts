import { describe, expect, it } from "vitest";
import { renderDigest } from "./digest.js";
import { detectFailedReads, detectOversizeOutputs, detectPromptCorrections, detectRepeatedCalls, detectSessionNoteSignals, detectToolErrorLoop } from "./detectors.js";
import type { SessionTrace } from "./types.js";

const secrets = ["private-prompt", "private-title", "private-command", "private-error", "private-outcome", "private-blocker"];
function sensitiveTrace(): SessionTrace {
  return {
    ref: { tool: "opencode", id: "session-one", title: secrets[1], startedAt: 0, storagePath: "/trace.json" },
    userTurns: [`no ${secrets[0]}`, `actually ${secrets[0]}`],
    toolCalls: Array.from({ length: 3 }, (_, index) => ({ index, name: "read", status: "error", inputSummary: secrets[2], errorText: secrets[3], outputBytes: 200_000 })),
    commands: [secrets[2]],
    sessionNotes: { outcome: secrets[4], blocked: [secrets[5]] },
    filesRead: [], filesWritten: [], truncated: false,
  };
}

describe("watchdog transcript privacy", () => {
  it("keeps aggregates and call references without sensitive excerpts by default", () => {
    const trace = sensitiveTrace();
    const output = JSON.stringify({ digest: renderDigest(trace), findings: [
      ...detectToolErrorLoop(trace), ...detectRepeatedCalls(trace), ...detectFailedReads(trace),
      ...detectOversizeOutputs(trace), ...detectPromptCorrections(trace), ...detectSessionNoteSignals(trace),
    ] });
    for (const secret of secrets) expect(output).not.toContain(secret);
    expect(output).toContain("3 calls, 3 errors");
    expect(output).toContain("#0 read");
    expect(output).toContain("User corrected course 2×");
  });

  it("includes bounded sensitive excerpts only when explicitly requested", () => {
    const output = renderDigest(sensitiveTrace(), 2400, { includePrompts: true });
    for (const secret of secrets.slice(0, 5)) expect(output).toContain(secret);
  });
});
