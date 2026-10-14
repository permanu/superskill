// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect } from "vitest";
import { scanForSecrets, formatSecretWarnings } from "./secret-scanner.js";

const UUID = "123e4567-e89b-12d3-a456-426614174000";

describe("scanForSecrets", () => {
  it("redacts every recognized secret from every snippet on a multi-secret line", () => {
    const openai = `sk-${"x".repeat(35)}`;
    const aws = `AKIA${"A".repeat(16)}`;
    const matches = scanForSecrets(`${openai} ${aws}`);
    expect(matches.length).toBeGreaterThanOrEqual(2);
    for (const match of matches) {
      expect(match.snippet).not.toContain(openai);
      expect(match.snippet).not.toContain(aws);
    }
  });

  it("passes notes that merely contain a UUID", () => {
    expect(scanForSecrets(`Related id: ${UUID}`)).toEqual([]);
    expect(scanForSecrets(`See ticket ${UUID} for background context.`)).toEqual([]);
  });

  it("rejects a heroku key in key=value form", () => {
    const matches = scanForSecrets(`heroku_api_key = ${UUID}`);
    expect(matches.some((m) => m.type === "heroku-api-key")).toBe(true);
  });

  it("rejects a heroku key with uppercase key name", () => {
    const matches = scanForSecrets(`HEROKU_API_KEY: ${UUID}`);
    expect(matches.some((m) => m.type === "heroku-api-key")).toBe(true);
  });

  it("does not flag a UUID far from any heroku mention", () => {
    const line = `heroku migration notes ${"x".repeat(60)} ${UUID}`;
    expect(scanForSecrets(line).some((m) => m.type === "heroku-api-key")).toBe(false);
  });

  it("still detects other well-known secret shapes", () => {
    const matches = scanForSecrets(
      [
        "aws_key = AKIAIOSFODNN7EXAMPLE",
        "github_token = ghp_abcdefghijklmnopqrstuvwxyz0123456789",
        `stripe_key = ${["sk", "live", "abcdefghijklmnopqrstuvwxyz"].join("_")}`,
      ].join("\n"),
    );
    const types = matches.map((m) => m.type);
    expect(types).toContain("aws-key");
    expect(types).toContain("github-token");
    expect(types).toContain("stripe-key");
  });

  it.each([
    ["openai-key", `OPENAI_API_KEY=sk-${"a".repeat(24)}`],
    ["anthropic-key", `ANTHROPIC_API_KEY=sk-ant-${"a".repeat(24)}`],
    ["google-api-key", `GOOGLE_API_KEY=AIza${"B".repeat(35)}`],
    ["aws-secret-key", "AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"],
    ["slack-webhook", `webhook=https://hooks.slack.com/${["services", "T00000000", "B00000000", "X".repeat(24)].join("/")}`],
    ["generic-secret", "api_token = abcdefghijklmnop"],
  ])("rejects %s shapes", (expectedType, line) => {
    const matches = scanForSecrets(line);
    expect(matches.map((m) => m.type)).toContain(expectedType);
  });

  it("never echoes secret values in matches or formatted warnings", () => {
    const value = `sk-${"a".repeat(24)}`;
    const matches = scanForSecrets(`OPENAI_API_KEY=${value}`);
    expect(matches.map((m) => m.snippet).join("\n")).not.toContain(value);
    expect(formatSecretWarnings(matches)).not.toContain(value);
  });

  it("does not flag near-miss credential shapes", () => {
    const lines = [
      "hooks.slack.com/events/T00000000 is not a webhook endpoint",
      `AIza${"B".repeat(10)} is too short for a Google key`,
      "sk-short is a file prefix, not a key",
      "passwordless login is enabled",
      "The token cache stores entries between runs.",
      "status: complete",
      "tokenizer = custom",
      "secret: this is prose, not a value",
    ].join("\n");
    expect(scanForSecrets(lines)).toEqual([]);
  });

  it("formats warnings for matches", () => {
    const formatted = formatSecretWarnings([{ type: "aws-key", line: 2, snippet: "aws_key = ..." }]);
    expect(formatted).toContain("Rejected: 1 potential secret(s)");
    expect(formatted).toContain("aws-key (line 2)");
    expect(formatSecretWarnings([])).toBe("");
  });
});
