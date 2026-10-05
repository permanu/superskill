---
description: superskill 18-axis review (project or diff)
---
<!-- superskill:command -->
Run a superskill review. Scope: $ARGUMENTS (empty = the entire project).

1. Call the superskill MCP tool with skill_id "review/architect".
2. Follow its protocol: project_context (full), resume, search (ADRs + learnings), then read every caller of each changed symbol.
3. Walk all 18 axes against the scope; no axis may be skipped — write "n/a: reason" when inapplicable.

Output one line per finding: path:line: axis: severity: problem. fix.
