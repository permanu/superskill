// SPDX-License-Identifier: Apache-2.0

export const BASE_GENERATED_MARKER =
  "# superskill:generated — regenerate with `superskill graph viz`; delete this line to keep manual edits";

export function renderProjectBase(slug: string): string {
  return `${BASE_GENERATED_MARKER}
filters:
  and:
    - file.inFolder("projects/${slug}")
views:
  - type: table
    name: Decisions
    filters:
      and:
        - file.inFolder("projects/${slug}/decisions")
    order:
      - file.name
      - status
      - created
    sort:
      - property: created
        direction: DESC
  - type: table
    name: Learnings
    filters:
      and:
        - file.inFolder("projects/${slug}/learnings")
    order:
      - file.name
      - confidence
      - created
    sort:
      - property: created
        direction: DESC
  - type: table
    name: Sessions
    filters:
      and:
        - file.inFolder("projects/${slug}/sessions")
    order:
      - file.name
      - outcome
      - completed_at
    sort:
      - property: completed_at
        direction: DESC
  - type: table
    name: Tasks
    filters:
      and:
        - file.inFolder("projects/${slug}/tasks")
    order:
      - file.name
      - status
      - priority
    sort:
      - property: file.mtime
        direction: DESC
  - type: table
    name: All notes
    order:
      - file.name
      - type
      - file.mtime
    sort:
      - property: file.mtime
        direction: DESC
    limit: 100
`;
}
