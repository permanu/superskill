// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect } from "vitest";
import { scanForSecrets, formatSecretWarnings } from "./secret-scanner.js";

const UUID = "123e4567-e89b-12d3-a456-426614174000";

describe("scanForSecrets", () => {
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

  it("formats warnings for matches", () => {
    const formatted = formatSecretWarnings([{ type: "aws-key", line: 2, snippet: "aws_key = ..." }]);
    expect(formatted).toContain("Rejected: 1 potential secret(s)");
    expect(formatted).toContain("aws-key (line 2)");
    expect(formatSecretWarnings([])).toBe("");
  });
});
