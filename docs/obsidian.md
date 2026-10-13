# Viewing your memory in Obsidian

`graph viz` writes plain Obsidian markdown notes:

```bash
superskill viz -p my-project             # shorthand for `graph viz`; writes the notes
superskill viz --open -p my-project      # ... and opens the project in Obsidian
```

## What it writes

- **Architecture notes** — four Mermaid notes at `projects/<slug>/architecture/`: `high-level-architecture.md`, `low-level-architecture.md`, `data-model-erd.md`, `dataflow.md`.
- **Code notes** — one note per source file at `projects/<slug>/code/<repo-relative path>.md`: frontmatter, a symbol list, `[[wikilinks]]` for imports and imported-by, and the full source in a fenced code block for syntax highlighting.

Code notes are regenerated on every run and indexed as metadata + edges only, so source text never enters search. Hand-edited architecture notes are preserved; code notes are overwritten with fresh output.

## In Obsidian

Open the vault root (`VAULT_PATH`, default `~/Vaults/ai`), open the project dashboard, and backlinks and the local graph walk the `[[wikilinks]]`. `graph viz --open` deep-links Obsidian to the project context note, the generated dashboard, or the first architecture note (context → dashboard → architecture note); if Obsidian is not installed it prints the vault path instead of failing silently.

## Scoping to one project

One vault holds every project, and Obsidian scopes at the vault level only: the file explorer and quick switcher always show all projects. Search, graph view, local graph, and backlinks can still be scoped:

- **Dashboard** — `graph viz` writes `projects/<slug>/index.md` with hub links, scoped search and graph hints, the latest decisions/learnings/sessions, and a pointer to the code notes. `graph viz --open` lands here when the project has no `context.md`.
- **Bases views** — `projects/<slug>/views.base` defines live table views (Decisions, Learnings, Sessions, Tasks, All notes) scoped with `file.inFolder("projects/<slug>")`. No global Obsidian config is touched; delete the marker line inside the file to keep manual edits.
- **Graph filter** — `superskill viz --scope-graph -p <slug>` writes `path:projects/<slug>` into `.obsidian/graph.json` so the graph view opens scoped; if the vault has never been opened in Obsidian you get a "not set" message instead of an error. Typing the same `path:projects/<slug>` filter into the graph view's search box works without the flag.

## Without Obsidian

The notes are plain markdown, and Mermaid renders in any renderer that supports it — Obsidian, GitHub, and VS Code among them. Diagrams render at natural size (`useMaxWidth: false`); large diagrams scroll horizontally instead of shrinking to fit.

## Session notes

Session notes take part too: they carry `[[wikilinks]]` to the project context and to code notes for the files touched.
