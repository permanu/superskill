import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  parseAuditStatus,
  parseInstallCount,
  fetchSkillPage,
} from "./client.js";

const originalFetch = globalThis.fetch;

describe("parseAuditStatus", () => {
  it('returns "pass" for pass/passing/low risk', () => {
    expect(parseAuditStatus("Pass")).toBe("pass");
    expect(parseAuditStatus("passing")).toBe("pass");
    expect(parseAuditStatus("Low Risk")).toBe("pass");
    expect(parseAuditStatus("PASS")).toBe("pass");
  });

  it('returns "warn" for warn/warning/med risk/medium risk', () => {
    expect(parseAuditStatus("Warn")).toBe("warn");
    expect(parseAuditStatus("Warning")).toBe("warn");
    expect(parseAuditStatus("Med Risk")).toBe("warn");
    expect(parseAuditStatus("Medium Risk")).toBe("warn");
    expect(parseAuditStatus("WARN")).toBe("warn");
  });

  it('returns "fail" for fail/failing/critical/high risk', () => {
    expect(parseAuditStatus("Fail")).toBe("fail");
    expect(parseAuditStatus("Failing")).toBe("fail");
    expect(parseAuditStatus("Critical")).toBe("fail");
    expect(parseAuditStatus("High Risk")).toBe("fail");
    expect(parseAuditStatus("FAIL")).toBe("fail");
  });

  it('returns "unknown" for unrecognized text', () => {
    expect(parseAuditStatus("something else")).toBe("unknown");
    expect(parseAuditStatus("")).toBe("unknown");
    expect(parseAuditStatus("  ")).toBe("unknown");
  });
});

describe("parseInstallCount", () => {
  it("parses plain numbers", () => {
    expect(parseInstallCount("185")).toBe(185);
    expect(parseInstallCount("1,200")).toBe(1200);
    expect(parseInstallCount("3.5")).toBe(4);
  });

  it("parses K suffix", () => {
    expect(parseInstallCount("185K")).toBe(185_000);
    expect(parseInstallCount("1.2k")).toBe(1_200);
    expect(parseInstallCount("500K")).toBe(500_000);
  });

  it("parses M suffix", () => {
    expect(parseInstallCount("1.2M")).toBe(1_200_000);
    expect(parseInstallCount("5M")).toBe(5_000_000);
    expect(parseInstallCount("0.5m")).toBe(500_000);
  });

  it("parses B suffix", () => {
    expect(parseInstallCount("1.5B")).toBe(1_500_000_000);
  });

  it("returns 0 for unparseable text", () => {
    expect(parseInstallCount("abc")).toBe(0);
    expect(parseInstallCount("")).toBe(0);
  });
});

describe("fetchSkillPage", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const mockHtml = `
    <html><body>
      <div>185K weekly installs</div>
      <div>1.2K stars</div>
      <div class="gen badge">Pass</div>
      <div class="socket badge">Warn</div>
      <div class="snyk badge">Critical</div>
      <section class="skill-content">
        <h1>My Skill</h1>
        <p>This is the skill content.</p>
      </section>
    </body></html>
  `;

  it("fetches and parses a skill page", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(mockHtml, { status: 200 }),
    );

    const result = await fetchSkillPage("vercel-labs", "agent-skills", "react-best-practices");

    expect(result).not.toBeNull();
    expect(result!.name).toBe("react-best-practices");
    expect(result!.owner).toBe("vercel-labs");
    expect(result!.repo).toBe("agent-skills");
    expect(result!.skill).toBe("react-best-practices");
    expect(result!.installs).toBe(185_000);
    expect(result!.stars).toBe(1_200);
    expect(result!.audits.gen).toBe("pass");
    expect(result!.audits.socket).toBe("warn");
    expect(result!.audits.snyk).toBe("fail");
    expect(result!.skillMd).toContain("My Skill");
    expect(result!.skillMd).toContain("This is the skill content.");
  });

  it("returns null on non-OK response", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response("Not Found", { status: 404 }),
    );

    const result = await fetchSkillPage("owner", "repo", "skill");
    expect(result).toBeNull();
  });

  it("returns null on network error", async () => {
    vi.mocked(globalThis.fetch).mockRejectedValueOnce(
      new Error("Network error"),
    );

    const result = await fetchSkillPage("owner", "repo", "skill");
    expect(result).toBeNull();
  });

  it("returns null on timeout", async () => {
    vi.useFakeTimers();
    let signalHandler: (() => void) | null = null;
    vi.mocked(globalThis.fetch).mockImplementationOnce(
      (_input, init) =>
        new Promise((_, reject) => {
          const signal = init?.signal as AbortSignal;
          signalHandler = () => reject(new DOMException("Aborted", "AbortError"));
          signal?.addEventListener("abort", signalHandler);
        }),
    );

    const promise = fetchSkillPage("owner", "repo", "skill");
    vi.advanceTimersByTime(10_001);
    const result = await promise;
    expect(result).toBeNull();
    vi.useRealTimers();
  });

  it("constructs correct URL", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(mockHtml, { status: 200 }),
    );

    await fetchSkillPage("my-owner", "my-repo", "my-skill");
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://skills.sh/my-owner/my-repo/my-skill",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("handles empty HTML gracefully", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response("<html><body></body></html>", { status: 200 }),
    );

    const result = await fetchSkillPage("owner", "repo", "skill");
    expect(result).not.toBeNull();
    expect(result!.installs).toBe(0);
    expect(result!.stars).toBe(0);
    expect(result!.audits.gen).toBe("unknown");
    expect(result!.audits.socket).toBe("unknown");
    expect(result!.audits.snyk).toBe("unknown");
    expect(result!.skillMd).toBe("");
  });
});
