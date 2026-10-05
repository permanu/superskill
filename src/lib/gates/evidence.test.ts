import { describe, it, expect, afterEach } from "vitest";
import { createTestVault } from "../../test-helpers.js";
import {
  MAX_EVIDENCE_OUTPUT,
  appendEvidence,
  evidencePath,
  isReviewRecord,
  readEvidence,
  truncateOutput,
  type EvidenceRecord,
} from "./evidence.js";

function record(overrides: Partial<EvidenceRecord> = {}): EvidenceRecord {
  return {
    ticket: "ticket-001",
    command: "npm test",
    exit: 0,
    output: "ok",
    commit: "c1",
    ts: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("truncateOutput", () => {
  it("keeps short output intact", () => {
    expect(truncateOutput("hello", 10)).toBe("hello");
  });

  it("truncates long output with a marker", () => {
    const truncated = truncateOutput("a".repeat(20), 10);
    expect(truncated).toBe(`${"a".repeat(10)}\n...[truncated 10 chars]`);
  });

  it("uses a 4000 char default limit", () => {
    const truncated = truncateOutput("x".repeat(MAX_EVIDENCE_OUTPUT + 5));
    expect(truncated.endsWith("...[truncated 5 chars]")).toBe(true);
  });
});

describe("isReviewRecord", () => {
  it("detects review commands", () => {
    expect(isReviewRecord(record({ command: "review" }))).toBe(true);
    expect(isReviewRecord(record({ command: "Review:approved" }))).toBe(true);
    expect(isReviewRecord(record({ command: "review approved" }))).toBe(true);
    expect(isReviewRecord(record({ command: "npm test" }))).toBe(false);
  });
});

describe("evidence storage", () => {
  let cleanup: (() => Promise<void>) | undefined;

  afterEach(async () => {
    if (cleanup) await cleanup();
    cleanup = undefined;
  });

  it("appends and reads records", async () => {
    const { vaultFs, cleanup: clean } = await createTestVault();
    cleanup = clean;

    const first = await appendEvidence(vaultFs, "p", record({ command: "npm test" }));
    await appendEvidence(vaultFs, "p", record({ command: "npm run lint", exit: 1, commit: "c2" }));

    expect(first.path).toBe(evidencePath("p", "ticket-001"));
    const records = await readEvidence(vaultFs, "p", "ticket-001");
    expect(records).toHaveLength(2);
    expect(records[0].command).toBe("npm test");
    expect(records[1].exit).toBe(1);
    expect(records[1].commit).toBe("c2");
  });

  it("returns empty for a missing evidence file", async () => {
    const { vaultFs, cleanup: clean } = await createTestVault();
    cleanup = clean;
    expect(await readEvidence(vaultFs, "p", "ticket-999")).toEqual([]);
  });

  it("preserves both records when appending twice", async () => {
    const { vaultFs, cleanup: clean } = await createTestVault();
    cleanup = clean;

    await appendEvidence(vaultFs, "p", record({ ticket: "ticket-777", command: "first" }));
    await appendEvidence(vaultFs, "p", record({ ticket: "ticket-777", command: "second" }));

    const records = await readEvidence(vaultFs, "p", "ticket-777");
    expect(records.map((r) => r.command)).toEqual(["first", "second"]);

    const raw = await vaultFs.read(evidencePath("p", "ticket-777"));
    expect(raw.split("\n").filter(Boolean)).toHaveLength(2);
  });

  it("adds a separator when the existing file has no trailing newline", async () => {
    const { vaultFs, cleanup: clean } = await createTestVault();
    cleanup = clean;

    const path = evidencePath("p", "ticket-778");
    await vaultFs.write(path, JSON.stringify(record({ ticket: "ticket-778", command: "first" })));
    await appendEvidence(vaultFs, "p", record({ ticket: "ticket-778", command: "second" }));

    const records = await readEvidence(vaultFs, "p", "ticket-778");
    expect(records.map((r) => r.command)).toEqual(["first", "second"]);
  });

  it("skips malformed lines", async () => {
    const { vaultFs, cleanup: clean } = await createTestVault();
    cleanup = clean;

    await vaultFs.write(
      evidencePath("p", "ticket-001"),
      `${JSON.stringify(record())}\nnot json\n{"ticket":"ticket-001"}\n`,
    );

    const records = await readEvidence(vaultFs, "p", "ticket-001");
    expect(records).toHaveLength(1);
    expect(records[0].command).toBe("npm test");
  });
});
