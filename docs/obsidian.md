# Viewing your memory in Obsidian

`graph viz` writes plain Obsidian markdown notes:

```bash
superskill viz -p my-project             # shorthand for `graph viz`; writes the notes
superskill viz --open -p my-project      # ... and opens the project in Obsidian
```

Run visualization from a registered checkout of the selected project. An explicit project name cannot redirect source notes from an unrelated or unmapped workspace.

## What it writes

- **Architecture notes** — four Mermaid notes at `projects/<slug>/architecture/`: `high-level-architecture.md`, `low-level-architecture.md`, `data-model-erd.md`, `dataflow.md`.
- **Code notes** — one note per source file at `projects/<slug>/code/<repo-relative path>.md`: frontmatter, a symbol list, `[[wikilinks]]` for imports and imported-by, and the full source in a fenced code block for syntax highlighting.

Code notes are indexed as metadata + edges only, so source text never enters search. Unmodified generated notes refresh when source or relationship metadata changes. Architecture notes, dashboards, Bases views, and code notes carry a full-content hash: additions or edits anywhere in a file leave that file unchanged on regeneration. Legacy generated files without a verifiable hash are also kept. To regenerate a protected file, move it aside first. Legacy HTML and canvas files are never deleted based on their names alone.

Code-note filenames encode Unicode and Markdown link delimiters safely. Dashboard counts include only current generated code notes and report written and skipped notes separately. Stale code notes are removed only when their generated content is verifiably unchanged and the scan completed without skipped or unreadable files; edited and unverifiable legacy notes are retained.

Source is reread through checked no-follow handles with a 1 MB read limit. Oversized, changed-during-read, binary, invalid UTF-8, or symlink-swapped sources are skipped without copying them into the vault. Secret-bearing source is omitted while safe metadata and links are retained; notes rejected by the vault's content guard count as skipped. Cleanup rechecks the latest note content under its mutation lock before deletion.

## In Obsidian

Open the vault root (`VAULT_PATH`, default `~/Vaults/ai`), open the project dashboard, and backlinks and the local graph walk the `[[wikilinks]]`. `graph viz --open` deep-links Obsidian to the project context note, the generated dashboard, or the first architecture note (context → dashboard → architecture note); if Obsidian is not installed it prints the vault path instead of failing silently.

## Scoping to one project

One vault holds every project, and Obsidian scopes at the vault level only: the file explorer and quick switcher always show all projects. Search, graph view, local graph, and backlinks can still be scoped:

- **Dashboard** — `graph viz` writes `projects/<slug>/index.md` with hub links, scoped search and graph hints, the latest decisions/learnings/sessions, and a pointer to the code notes. `graph viz --open` lands here when the project has no `context.md`.
- **Bases views** — `projects/<slug>/views.base` defines live table views (Decisions, Learnings, Sessions, Tasks, All notes) scoped with `file.inFolder("projects/<slug>")`. No global Obsidian config is touched. Manual edits are detected by the content hash and preserved.
- **Graph filter** — `superskill viz --scope-graph -p <slug>` merges `path:projects/<slug>` into the search setting in `.obsidian/graph.json`, preserving other settings. Escaping symlinks and malformed settings are left unchanged. If the vault has never been opened in Obsidian you get a "not set" message instead of an error. Typing the same `path:projects/<slug>` filter into the graph view's search box works without the flag.

## Without Obsidian

The notes are plain markdown, and Mermaid renders in any renderer that supports it — Obsidian, GitHub, and VS Code among them. Diagrams render at natural size (`useMaxWidth: false`); large diagrams scroll horizontally instead of shrinking to fit.

## Session notes

Session notes take part too: they carry `[[wikilinks]]` to the project context and to code notes for the files touched.
