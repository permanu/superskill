// SPDX-License-Identifier: Apache-2.0

import { afterEach, describe, expect, it, vi } from "vitest";
import { cliHelpText, handleInfoFlags } from "./cli-info.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("handleInfoFlags", () => {
  it("prints the version for --version, -V, and bare 'version'", () => {
    for (const argv of [["--version"], ["-V"], ["version"]]) {
      const log = vi.spyOn(console, "log").mockImplementation(() => {});
      expect(handleInfoFlags(argv, "9.9.9")).toBe(true);
      expect(log).toHaveBeenCalledWith("9.9.9");
      log.mockRestore();
    }
  });

  it("prints help for --help, -h, and bare 'help'", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    expect(handleInfoFlags(["--help"], "9.9.9")).toBe(true);
    expect(log).toHaveBeenCalledWith(cliHelpText("9.9.9"));
    log.mockRestore();

    const log2 = vi.spyOn(console, "log").mockImplementation(() => {});
    expect(handleInfoFlags(["help"], "9.9.9")).toBe(true);
    expect(log2).toHaveBeenCalledWith(cliHelpText("9.9.9"));
  });

  it("starts the server (returns false) for an MCP launch or unrelated args", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    expect(handleInfoFlags([], "9.9.9")).toBe(false);
    expect(log).not.toHaveBeenCalled();
  });
});
