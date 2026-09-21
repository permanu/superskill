// SPDX-License-Identifier: AGPL-3.0-or-later
// In-harness browser QA (system Chrome via playwright-core). Not a plugin.

import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";

export interface QaEvidence {
  ok: boolean;
  skipped?: string;
  title: string;
  afterClick: string;
  afterBack: string;
  nodes: string[];
}

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter((p): p is string => Boolean(p));

export function findSystemChrome(): string | null {
  return CHROME_CANDIDATES.find((p) => existsSync(p)) ?? null;
}

export async function verifyVizHtml(htmlPath: string): Promise<QaEvidence> {
  if (!existsSync(htmlPath)) {
    throw new Error(`QA: HTML not found: ${htmlPath}`);
  }
  const chrome = findSystemChrome();
  if (!chrome) {
    return {
      ok: false,
      skipped: "No system Chrome/Chromium. Set CHROME_PATH.",
      title: "",
      afterClick: "",
      afterBack: "",
      nodes: [],
    };
  }

  const { chromium } = await import("playwright-core");
  const browser = await chromium.launch({
    executablePath: chrome,
    headless: true,
    args: ["--allow-file-access-from-files"],
  });
  try {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForSelector("[data-qa='node']", { timeout: 15_000 });
    const title = (await page.locator("#title").textContent())?.trim() ?? "";
    const nodes = await page.locator("[data-qa='node']").allTextContents();
    const vaultBtn = page.locator("[data-qa='node'][data-id='arch:vault']");
    if (await vaultBtn.count()) {
      await vaultBtn.click();
    } else if (nodes.length > 0) {
      await page.locator("[data-qa='node']").first().click();
    }
    await page.waitForFunction(() => (document.getElementById("panel")?.innerText.length ?? 0) > 20);
    const afterClick = ((await page.locator("#panel").textContent()) ?? "").replace(/\s+/g, " ").trim();
    await page.locator("#back").click();
    await page.waitForFunction(() => (document.getElementById("title")?.innerText ?? "") === "SuperSkill" || (document.getElementById("title")?.innerText.length ?? 0) > 0);
    const afterBack = ((await page.locator("#title").textContent()) ?? "").trim();
    const ok = title.length > 0 && nodes.length > 0 && afterClick.length > 0 && afterBack.length > 0;
    return { ok, title, afterClick: afterClick.slice(0, 400), afterBack, nodes };
  } finally {
    await browser.close();
  }
}
