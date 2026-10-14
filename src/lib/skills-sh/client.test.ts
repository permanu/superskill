import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  parseAuditStatus,
  parseInstallCount,
  fetchSkillPage,
  fetchPublisherSkills,
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
    vi.useRealTimers();
    globalThis.fetch = originalFetch;
  });

  const mockHtml = `
    <html><body>
      <div>185K weekly installs</div>
      <div>1.2K stars</div>
      <section id="security-audits">
        <div class="gen badge">Pass</div>
        <div class="socket badge">Warn</div>
        <div class="snyk badge">Critical</div>
      </section>
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

  it("never promotes unrelated Pass text into audit results", async () => {
    const html = `<div>general information about socket and snyk</div><div class="bg-green-500">Pass</div>
      <section class="skill-content"><div class="gen badge">Pass</div><div class="socket badge">Pass</div><div class="snyk badge">Pass</div></section>`;
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(new Response(html));
    const result = await fetchSkillPage("owner", "repo", "skill");
    expect(result?.audits).toEqual({ gen: "unknown", socket: "unknown", snyk: "unknown" });
  });

  it("keeps audit provider cards isolated and recognizes security links", async () => {
    const html = `<section aria-label="Security Audits"><a href="/owner/repo/skill/security/gen"><span>Gen</span><div>Fail</div></a>
      <a href="/other/repo/skill/security/socket"><span>Socket</span><div>Pass</div></a>
      <a href="/owner/repo/skill/security/snyk"><span>Snyk</span><div>Pass</div></a></section>`;
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(new Response(html));
    const result = await fetchSkillPage("owner", "repo", "skill");
    expect(result?.audits).toEqual({ gen: "fail", socket: "unknown", snyk: "pass" });
  });

  it("recognizes the current sidebar audit section after SKILL.md without trusting rendered skill badges", async () => {
    const html = `<span>SKILL.md</span><div class="prose"><section id="security-audits"><div class="gen badge">Pass</div></section></div>
      <div class="bg-background py-8"><div class="text-sm font-mono">Security Audits</div><div>
      <a href="/owner/repo/skill/security/agent-trust-hub"><span>Gen Agent Trust Hub</span><span class="bg-green-500/10">Pass</span></a>
      <a href="/owner/repo/skill/security/socket"><span>Socket</span><span>Pass</span></a>
      <a href="/owner/repo/skill/security/snyk"><span>Snyk</span><span>Fail</span></a></div></div>`;
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(new Response(html));
    const result = await fetchSkillPage("owner", "repo", "skill");
    expect(result?.audits).toEqual({ gen: "pass", socket: "pass", snyk: "fail" });
  });

  it("prefers identity-matched structured audits to unrelated HTML badges", async () => {
    const data = { props: { pageProps: { skill: { owner: "owner", repo: "repo", skill: "skill", audits: { gen: "fail", socket: "pass", snyk: "unknown" } } } } };
    const html = `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(data)}</script>${mockHtml}`;
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(new Response(html));
    const result = await fetchSkillPage("owner", "repo", "skill");
    expect(result?.audits).toEqual({ gen: "fail", socket: "pass", snyk: "unknown" });
  });

  it("reports the bounded skills.sh source fetch and a page-reported ref without treating it as an audit revision", async () => {
    const data = { props: { pageProps: { skill: { owner: "owner", repo: "repo", skill: "skill", sourceRef: "main", audits: { gen: "pass", socket: "pass", snyk: "pass" } } } } };
    const html = `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(data)}</script>${mockHtml}`;
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(new Response(html));
    const result = await fetchSkillPage("owner", "repo", "skill");
    expect(result?.sourceUrl).toBe("https://skills.sh/owner/repo/skill");
    expect(result?.sourceRef).toBe("main");
    expect(result?.sourceResponseBytes).toBe(Buffer.byteLength(html));
    expect(result?.sourceResponseBytes).toBeLessThanOrEqual(2 * 1024 * 1024);
    expect(result).not.toHaveProperty("auditRevision");
  });

  it("does not accept structured audit results for another skill", async () => {
    const data = { props: { pageProps: { skill: { owner: "other", repo: "repo", skill: "skill", audits: { gen: "pass", socket: "pass", snyk: "pass" } } } } };
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(new Response(`<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(data)}</script>`));
    const result = await fetchSkillPage("owner", "repo", "skill");
    expect(result?.audits).toEqual({ gen: "unknown", socket: "unknown", snyk: "unknown" });
  });

  it("rejects oversized bodies while streaming and cancels the reader", async () => {
    const cancel = vi.fn();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(2 * 1024 * 1024));
        controller.enqueue(new Uint8Array(1));
      },
      cancel,
    });
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(new Response(stream));
    expect(await fetchSkillPage("owner", "repo", "skill")).toBeNull();
    expect(cancel).toHaveBeenCalled();
  });

  it("rejects an oversized Content-Length before consuming the body", async () => {
    const cancel = vi.fn();
    const stream = new ReadableStream<Uint8Array>({ cancel });
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(new Response(stream, { headers: { "content-length": "999999999" } }));
    expect(await fetchSkillPage("owner", "repo", "skill")).toBeNull();
    expect(cancel).toHaveBeenCalled();
  });

  it("keeps the timeout active until the response body finishes", async () => {
    vi.useFakeTimers();
    const cancel = vi.fn();
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(new Response(new ReadableStream<Uint8Array>({ cancel })));
    const promise = fetchSkillPage("owner", "repo", "skill");
    await vi.advanceTimersByTimeAsync(10_001);
    expect(await promise).toBeNull();
    expect(cancel).toHaveBeenCalled();
  });

  it("propagates publisher transport failures so fallback requires the install opt-in", async () => {
    vi.mocked(globalThis.fetch).mockRejectedValueOnce(new Error("offline"));
    await expect(fetchPublisherSkills("owner", "repo")).rejects.toThrow("offline");
  });

  it("bounds publisher pages with the same streaming cap", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(new Response("x".repeat(2 * 1024 * 1024 + 1)));
    await expect(fetchPublisherSkills("owner", "repo")).rejects.toThrow(/size limit/i);
  });
});
