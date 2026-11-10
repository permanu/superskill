import { afterEach, expect, it, vi } from "vitest";

const { parseAsync, register } = vi.hoisted(() => ({
  parseAsync: vi.fn().mockResolvedValue(undefined),
  register: vi.fn(),
}));

vi.mock("commander", () => ({ Command: class { parseAsync = parseAsync; } }));
vi.mock("./index.js", () => ({ registerSetupCommands: register }));

afterEach(() => {
  process.exitCode = 0;
  vi.restoreAllMocks();
  vi.resetModules();
  parseAsync.mockReset().mockResolvedValue(undefined);
  register.mockClear();
});

it("configures future and existing clients in noninteractive installs", async () => {
  await import("./postinstall.js");
  expect(register).toHaveBeenCalledOnce();
  expect(parseAsync).toHaveBeenCalledWith(["setup", "--all"], { from: "user" });
});

it("reports setup errors without failing package installation", async () => {
  parseAsync.mockRejectedValueOnce(new Error("permission denied"));
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  await import("./postinstall.js");
  expect(log).toHaveBeenCalledWith(expect.stringContaining("permission denied"));
  expect(process.exitCode).toBe(0);
});

it("reports partial failures without failing package installation", async () => {
  parseAsync.mockImplementationOnce(async () => { process.exitCode = 1; });
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  await import("./postinstall.js");
  expect(log).toHaveBeenCalledWith(expect.stringContaining("Some clients could not be configured"));
  expect(process.exitCode).toBe(0);
});
