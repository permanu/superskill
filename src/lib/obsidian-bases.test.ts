// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { parseFrontmatter } from "./frontmatter.js";
import { BASE_GENERATED_MARKER, renderProjectBase } from "./obsidian-bases.js";

interface BaseView {
  type: string;
  name: string;
  filters?: { and: string[] };
  order: string[];
  sort?: Array<{ property: string; direction: string }>;
  limit?: number;
}

function parseBase(slug: string): { filters?: { and: string[] }; views: BaseView[] } {
  const { data } = parseFrontmatter(`---\n${renderProjectBase(slug)}\n---\n`);
  return data as { filters?: { and: string[] }; views: BaseView[] };
}

describe("renderProjectBase", () => {
  it("renders Bases YAML that parses with the repo YAML parser", () => {
    const { filters, views } = parseBase("p");
    expect(filters).toEqual({ and: ['file.inFolder("projects/p")'] });
    expect(views.map((view) => view.name)).toEqual(["Decisions", "Learnings", "Sessions", "Tasks", "All notes"]);
    expect(views.every((view) => view.type === "table")).toBe(true);

    const [decisions, learnings, sessions, tasks, all] = views;
    expect(decisions.filters).toEqual({ and: ['file.inFolder("projects/p/decisions")'] });
    expect(decisions.order).toEqual(["file.name", "status", "created"]);
    expect(decisions.sort).toEqual([{ property: "created", direction: "DESC" }]);

    expect(learnings.filters).toEqual({ and: ['file.inFolder("projects/p/learnings")'] });
    expect(learnings.order).toEqual(["file.name", "confidence", "created"]);
    expect(learnings.sort).toEqual([{ property: "created", direction: "DESC" }]);

    expect(sessions.filters).toEqual({ and: ['file.inFolder("projects/p/sessions")'] });
    expect(sessions.order).toEqual(["file.name", "outcome", "completed_at"]);
    expect(sessions.sort).toEqual([{ property: "completed_at", direction: "DESC" }]);

    expect(tasks.filters).toEqual({ and: ['file.inFolder("projects/p/tasks")'] });
    expect(tasks.order).toEqual(["file.name", "status", "priority"]);
    expect(tasks.sort).toEqual([{ property: "file.mtime", direction: "DESC" }]);

    expect(all.filters).toBeUndefined();
    expect(all.order).toEqual(["file.name", "type", "file.mtime"]);
    expect(all.sort).toEqual([{ property: "file.mtime", direction: "DESC" }]);
    expect(all.limit).toBe(100);
  });

  it("interpolates the project slug into every filter", () => {
    const rendered = renderProjectBase("my-project");
    expect(rendered).toContain('file.inFolder("projects/my-project")');
    expect(rendered).toContain('file.inFolder("projects/my-project/decisions")');
    expect(rendered).toContain('file.inFolder("projects/my-project/learnings")');
    expect(rendered).toContain('file.inFolder("projects/my-project/sessions")');
    expect(rendered).toContain('file.inFolder("projects/my-project/tasks")');
    expect(rendered).not.toContain("<slug>");
    expect(parseBase("my-project").filters).toEqual({ and: ['file.inFolder("projects/my-project")'] });
  });

  it("keeps the generated marker on line one and avoids indentation hazards", () => {
    const rendered = renderProjectBase("p");
    expect(rendered.startsWith(`${BASE_GENERATED_MARKER}\n`)).toBe(true);
    expect(rendered.endsWith("\n")).toBe(true);
    expect(rendered).not.toContain("\t");
    for (const line of rendered.split("\n")) {
      expect(line).toBe(line.replace(/\s+$/, ""));
      expect(line.match(/^\s*/)?.[0] ?? "").not.toContain("\t");
    }
  });
});
