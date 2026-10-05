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
