// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from "vitest";
import type { Command } from "commander";
import { createProgram } from "./cli.js";

const SUBCOMMANDS = ["env", "audit", "status", "gc", "activate", "apply", "uninstall", "bootstrap"] as const;

const GC_FLAGS = [
  "--all",
  "--worktree",
  "--tool",
  "--project",
  "--older-than",
  "--min-age",
  "--newer-than",
  "--min-size",
  "--max-size",
  "--tier",
  "--include",
  "--exclude",
  "--keep-latest",
  "--apply",
  "--purge",
  "--yes",
  "--undo",
  "--json",
  "--verbose",
];

function findCommand(parent: Command, name: string): Command | undefined {
  return parent.commands.find((command) => command.name() === name);
}

function renderHelp(command: Command): string {
  let output = "";
  command.configureOutput({
    writeOut: (text: string) => {
      output += text;
    },
  });
  command.outputHelp();
  return output;
}

function optionFlags(command: Command): string[] {
  return command.options
    .flatMap((option) => [option.short, option.long])
    .filter((flag): flag is string => Boolean(flag));
}

describe("worktree CLI help coverage", () => {
  const program = createProgram();

  function worktree(): Command {
    const command = findCommand(program, "worktree");
    expect(command, "worktree command group").toBeDefined();
    return command as Command;
  }

  it("exposes the worktree group with a discoverable description", () => {
    const group = worktree();
    expect(group.description().trim().length).toBeGreaterThan(0);
    expect(group.description()).toContain("--all");
    expect(group.description().toLowerCase()).toContain("report");
    expect(group.description().toLowerCase()).toMatch(/never delete/);
  });

  it("registers every documented subcommand", () => {
    const group = worktree();
    for (const name of SUBCOMMANDS) {
      expect(findCommand(group, name), `worktree ${name}`).toBeDefined();
    }
  });

  it.each([...SUBCOMMANDS])("worktree %s documents description, options and examples", (name) => {
    const command = findCommand(worktree(), name);
    expect(command, `worktree ${name}`).toBeDefined();
    const sub = command as Command;
    expect(sub.description().trim().length, `${name} description`).toBeGreaterThan(0);
    expect(sub.options.length, `${name} options`).toBeGreaterThan(0);
    for (const option of sub.options) {
      expect(option.flags, `${name} option flags`).toBeTruthy();
      expect(option.description.trim().length, `${name} ${option.flags} description`).toBeGreaterThan(0);
    }
    expect(renderHelp(sub), `${name} help`).toContain("Examples:");
  });

  it("exposes every gc filter flag", () => {
    const gc = findCommand(worktree(), "gc");
    expect(gc, "worktree gc").toBeDefined();
    const flags = optionFlags(gc as Command);
    for (const flag of GC_FLAGS) {
      expect(flags, `gc ${flag}`).toContain(flag);
    }
  });

  it("marks worktree bootstrap as internal", () => {
    const bootstrap = findCommand(worktree(), "bootstrap");
    expect(bootstrap, "worktree bootstrap").toBeDefined();
    expect((bootstrap as Command).description().toLowerCase()).toContain("internal");
  });

  it("prints group help with subcommands and examples", () => {
    const group = worktree();
    const help = renderHelp(group);
    for (const name of SUBCOMMANDS) {
      expect(help, `group help mentions ${name}`).toContain(name);
    }
    expect(help).toContain("Examples:");
    expect(group.helpInformation().length).toBeGreaterThan(0);
  });
});

describe("CLI 0.13.0 surface", () => {
  const program = createProgram();

  function command(path: string[]): Command {
    let current: Command | undefined = program;
    for (const name of path) {
      current = findCommand(current as Command, name);
      expect(current, `command ${path.join(" ")}`).toBeDefined();
    }
    return current as Command;
  }

  it("registers upgrade with --dry-run and --json", () => {
    const upgrade = command(["upgrade"]);
    expect(optionFlags(upgrade)).toEqual(expect.arrayContaining(["--dry-run", "--json"]));
    expect(renderHelp(upgrade)).toContain("Examples:");
  });

  it("registers the session coordination flags", () => {
    const register = command(["session", "register"]);
    expect(optionFlags(register)).toEqual(expect.arrayContaining(["--workspace", "--allow-shared"]));
    expect(optionFlags(command(["session", "heartbeat"]))).toContain("--files");
    const complete = command(["session", "complete"]);
    expect(optionFlags(complete)).toEqual(
      expect.arrayContaining(["--blocked", "--partially-completed", "--verification-run", "--summary", "--outcome", "--files", "--tasks"]),
    );
  });

  it("registers skill install, hygiene and evidence flags", () => {
    expect(optionFlags(command(["skill", "install"]))).toContain("--allow-unaudited");
    expect(optionFlags(command(["hygiene"]))).toContain("--due");
    expect(optionFlags(command(["evidence", "add"]))).toContain("--ts");
  });

  it("describes graph cross-project as project-jailed", () => {
    const cross = command(["graph", "cross-project"]);
    expect(cross.description()).toBe("Project-jailed search; cross-project is denied");
  });
});
