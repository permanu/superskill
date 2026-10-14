## Skill Submission

See the [native skill authoring guide](../../docs/authoring/native-skills.md).

**Skill name and path**:
**Native profile validated** (`anthropic` for Claude plugin Skills; `portable` for generic imports):

### What and when

**What does this skill help an agent do?**

**When should it activate, and when should it not?**

### Validation and evidence

- [ ] `npm run build && node dist/cli.js skill validate <path-to-SKILL.md> --profile <profile>` passes for this skill.
- [ ] Local references and scripts resolve within the skill directory; any bundled code and resources were reviewed.
- [ ] For behavior changes, at least three representative scenarios were tested and compared with a stated baseline.
- [ ] Behavior-change evidence includes a baseline/model matrix for supported targets and exact model/tool versions. If only one target is supported, state that scope; do not generalize from one AI tool to other providers.
- [ ] Any unsupported scenario, regression, or environment assumption is recorded below.

| Scenario | Baseline | Model/tool and version | Result |
| --- | --- | --- | --- |
| 1 | | | |
| 2 | | | |
| 3 | | | |

Repeat scenario rows for each tested model/tool.

**Notes / limitations:**
