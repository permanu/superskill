import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const program = vi.hoisted(() => ({ parseAsync: vi.fn(), outputHelp: vi.fn() }));

vi.mock("./lib/entry-mode.js", () => ({ resolveEntryMode: () => "cli" }));
vi.mock("./cli.js", () => ({ createProgram: () => program }));

let argv: string[];
let exitCode: typeof process.exitCode;

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  argv = process.argv;
  exitCode = process.exitCode;
  process.argv = ["node", "superskill", "onboard"];
  process.exitCode = undefined;
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
});

afterEach(() => {
  process.argv = argv;
  process.exitCode = exitCode;
  vi.restoreAllMocks();
});

describe("main CLI entrypoint", () => {
  it("catches asynchronous action failures without exiting early or printing a stack", async () => {
    program.parseAsync.mockRejectedValueOnce(new Error("configuration unavailable"));
    await import("./main.js");
    await vi.waitFor(() => expect(process.exitCode).toBe(1));
    expect(console.error).toHaveBeenCalledWith("superskill failed to start: configuration unavailable");
    expect(process.exit).not.toHaveBeenCalled();
  });

  it("shows help without parsing when no CLI arguments are present", async () => {
    process.argv = ["node", "superskill"];
    await import("./main.js");
    await vi.waitFor(() => expect(program.outputHelp).toHaveBeenCalledOnce());
    expect(program.parseAsync).not.toHaveBeenCalled();
    expect(process.exitCode).toBeUndefined();
  });
});
