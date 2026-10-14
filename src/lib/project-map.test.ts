// SPDX-License-Identifier: Apache-2.0

import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile, symlink, stat, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { deriveSlug, registerProject } from "./project-map.js";

const execFileAsync = promisify(execFile);

let vault: string;
let work: string;

beforeEach(async () => {
  vault = await mkdtemp(join(tmpdir(), "register-vault-"));
  work = await mkdtemp(join(tmpdir(), "register-work-"));
});

afterEach(async () => {
  await rm(vault, { recursive: true, force: true });
  await rm(work, { recursive: true, force: true });
});

describe("deriveSlug", () => {
  it("lowercases and sanitizes directory names", () => {
    expect(deriveSlug("/repos/My Repo")).toBe("my-repo");
    expect(deriveSlug("/repos/appcall")).toBe("appcall");
    expect(deriveSlug("/repos/--Weird.Name--")).toBe("weird.name");
  });
});

describe("registerProject", () => {
  it.each(["[]", "null", '{"/other/repo":42}', '{"/other/repo":"../escape"}'])("preserves structurally invalid mappings: %s", async raw => {
    const path = join(vault, "project-map.json");
    await writeFile(path, raw);
    await expect(registerProject(vault, work, "work")).rejects.toThrow(/invalid|valid project map/i);
    expect(await readFile(path, "utf-8")).toBe(raw);
  });

  it("rejects a symlinked lock without reading or deleting its target", async () => {
    const target = join(work, "foreign-lock");
    const raw = JSON.stringify({ pid: 999999999, createdAt: 1, token: "other" });
    await writeFile(target, raw);
    await mkdir(join(vault, "coordination/locks"), { recursive: true });
    await symlink(target, join(vault, "coordination/locks/project-map.lock"));
    await expect(registerProject(vault, work, "work")).rejects.toThrow(/symlink|unsafe/i);
    expect(await readFile(target, "utf-8")).toBe(raw);
  });

  it("serializes concurrent registrations without losing entries and writes private files", async () => {
    const repos = Array.from({ length: 12 }, (_, index) => join(work, `repo-${index}`));
    await Promise.all(repos.map(repo => mkdir(repo)));
    await Promise.all(repos.map(repo => registerProject(vault, repo)));
    const map = JSON.parse(await readFile(join(vault, "project-map.json"), "utf-8"));
    expect(Object.keys(map).sort()).toEqual(repos.sort());
    expect((await stat(join(vault, "project-map.json"))).mode & 0o777).toBe(0o600);
    expect((await readdir(vault)).filter(file => file.includes(".tmp") || file.endsWith(".lock"))).toEqual([]);
  });

  it("refuses to read or overwrite a symlinked project map", async () => {
    const target = join(work, "external.json");
    await writeFile(target, "{}");
    await symlink(target, join(vault, "project-map.json"));
    await expect(registerProject(vault, work, "work")).rejects.toThrow(/symlink|unsafe/i);
    expect(await readFile(target, "utf-8")).toBe("{}");
  });

  it("maps a directory to a derived slug and is idempotent", async () => {
    const repo = join(work, "My Repo");
    await mkdir(repo, { recursive: true });
    const first = await registerProject(vault, repo);
    expect(first.changed).toBe(true);
    expect(first.slug).toBe("my-repo");
    expect(first.key).toBe(repo);
    const raw = JSON.parse(await readFile(join(vault, "project-map.json"), "utf-8"));
    expect(raw[repo]).toBe("my-repo");

    const second = await registerProject(vault, repo);
    expect(second.changed).toBe(false);
    expect(second.slug).toBe("my-repo");
  });

  it("keys git repos by their root even when called from a subdirectory", async () => {
    const repo = await realpath(work);
    await execFileAsync("git", ["init", "-q"], { cwd: repo });
    const sub = join(repo, "packages", "app");
    await mkdir(sub, { recursive: true });
    const result = await registerProject(vault, sub);
    expect(result.key).toBe(repo);
  });

  it("overwrites only when a slug is explicit and reports the previous mapping", async () => {
    const repo = join(work, "svc");
    await mkdir(repo, { recursive: true });
    await registerProject(vault, repo);
    const renamed = await registerProject(vault, repo, "renamed-svc");
    expect(renamed.previous).toBe("svc");
    expect(renamed.slug).toBe("renamed-svc");
    expect(renamed.changed).toBe(true);
  });

  it("preserves unrelated map entries", async () => {
    await writeFile(join(vault, "project-map.json"), JSON.stringify({ "/other/repo": "other" }), "utf-8");
    const repo = join(work, "mine");
    await mkdir(repo, { recursive: true });
    await registerProject(vault, repo);
    const raw = JSON.parse(await readFile(join(vault, "project-map.json"), "utf-8"));
    expect(raw["/other/repo"]).toBe("other");
    expect(raw[repo]).toBe("mine");
  });

  it("rejects invalid slugs and missing vaults", async () => {
    const repo = join(work, "x");
    await mkdir(repo, { recursive: true });
    await expect(registerProject(vault, repo, "bad slug!")).rejects.toThrow(/Invalid project slug/);
    await expect(registerProject(join(work, "no-vault"), repo)).rejects.toThrow(/Vault not found/);
  });

  it("refuses to overwrite a malformed map", async () => {
    await writeFile(join(vault, "project-map.json"), "{not json", "utf-8");
    const repo = join(work, "x");
    await mkdir(repo, { recursive: true });
    await expect(registerProject(vault, repo)).rejects.toThrow(/not valid JSON/);
  });
});
