import { describe, expect, it } from "vitest";
import { isLatestLauncher, isManagedLauncher, isOurTool } from "./launcher.js";

describe("launcher recognition and automatic-upgrade authorization", () => {
  it.each([
    "superskill@0.13.0",
    "superskill@1.2.3-beta.1+build.4",
    "superskill@next",
    "github:permanu/superskill#feature/refactor",
    "git+https://github.com/permanu/superskill.git#v0.13.0",
  ])("recognizes a pinned package target without authorizing automatic upgrade (%s)", (target) => {
    const stringEntry = { command: "npx", args: ["-y", target] };
    const arrayEntry = { command: ["npx", "-y", target] };
    expect(isOurTool(stringEntry)).toBe(true);
    expect(isOurTool(arrayEntry)).toBe(true);
    expect(isManagedLauncher(stringEntry)).toBe(false);
    expect(isManagedLauncher(arrayEntry)).toBe(false);
  });

  it("recognizes custom arguments but does not authorize automatic upgrade", () => {
    const stringEntry = { command: "npx", args: ["-y", "superskill", "--custom", "value"] };
    const arrayEntry = { command: ["npx", "-y", "superskill", "--custom", "value"] };
    expect(isOurTool(stringEntry)).toBe(true);
    expect(isOurTool(arrayEntry)).toBe(true);
    expect(isManagedLauncher(stringEntry)).toBe(false);
    expect(isManagedLauncher(arrayEntry)).toBe(false);
  });

  it.each([
    { command: "superskill" },
    { command: "superskill-cli", args: ["--custom"] },
    { command: ["superskill", "--custom"] },
  ])("recognizes direct binaries without authorizing automatic upgrade (%o)", (entry) => {
    expect(isOurTool(entry)).toBe(true);
    expect(isManagedLauncher(entry)).toBe(false);
  });

  it.each([
    { command: "npx", args: ["-y", "superskill"] },
    { command: ["npx", "-y", "superskill"] },
  ])("authorizes only the exact unversioned legacy launcher (%o)", (entry) => {
    expect(isOurTool(entry)).toBe(true);
    expect(isManagedLauncher(entry)).toBe(true);
    expect(isLatestLauncher(entry)).toBe(false);
  });

  it.each([
    { command: "npx", args: ["-y", "--prefer-online", "superskill@latest"] },
    { command: ["npx", "-y", "--prefer-online", "superskill@latest"] },
  ])("recognizes the exact current launcher (%o)", (entry) => {
    expect(isOurTool(entry)).toBe(true);
    expect(isManagedLauncher(entry)).toBe(true);
    expect(isLatestLauncher(entry)).toBe(true);
  });

  it.each([
    { command: "/usr/local/bin/superskill" },
    { command: ["/usr/local/bin/superskill", "--custom"] },
    { command: "custom-wrapper", args: ["superskill"] },
    { command: "npx", args: ["-y", "/tmp/superskill"] },
  ])("rejects unsafe or unrelated executable paths (%o)", (entry) => {
    expect(isOurTool(entry)).toBe(false);
    expect(isManagedLauncher(entry)).toBe(false);
  });

  it("does not authorize unknown launcher options", () => {
    const entry = { command: "npx", args: ["-y", "--custom-option", "superskill"] };
    expect(isOurTool(entry)).toBe(true);
    expect(isManagedLauncher(entry)).toBe(false);
  });
});
