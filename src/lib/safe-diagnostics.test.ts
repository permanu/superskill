// SPDX-License-Identifier: Apache-2.0
import { afterEach, describe, expect, it, vi } from "vitest";
import { diagnosticCode, logDiagnostic } from "./safe-diagnostics.js";

afterEach(() => vi.restoreAllMocks());

describe("safe diagnostics", () => {
  it("emits only an event and reviewed code, without traversing error data", () => {
    const sink = vi.spyOn(console, "error").mockImplementation(() => {});
    const access = vi.fn(() => { throw new Error("synthetic-sensitive-canary"); });
    const failure = { code: "EACCES", get message() { return access(); }, toJSON: access, toString: access };
    logDiagnostic("mcp.tool-failed", failure);
    expect(sink).toHaveBeenCalledWith('{"event":"mcp.tool-failed","code":"EACCES"}');
    expect(access).not.toHaveBeenCalled();
  });

  it("omits unknown codes, accessors and hostile objects", () => {
    const access = vi.fn(() => "EACCES");
    for (const failure of [null, "synthetic-sensitive-canary", new Error("synthetic-sensitive-canary"), { code: "customer-id" }, { get code() { return access(); } }, new Proxy({}, { getOwnPropertyDescriptor() { throw new Error("synthetic-sensitive-canary"); } })]) {
      expect(diagnosticCode(failure)).toBe("UNKNOWN");
    }
    expect(access).not.toHaveBeenCalled();
  });
});
