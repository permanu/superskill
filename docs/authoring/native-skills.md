# Native Skill Authoring

Native Skills are directory-based agent instructions: a `SKILL.md` file with
metadata and a Markdown body, optionally accompanied by reference files,
assets, or scripts. They are not atomic rules in `catalog/rules/` and do not
inherit that catalog's IDs, frontmatter, status lifecycle, or snippet contract.

## Metadata profile

Choose and state the native metadata profile you target. Use `anthropic` for
Skills shipped through the Claude plugin; CI validates this repository's shipped
Skills with that profile. Use `portable` for generic imports that should not
apply Anthropic-specific reserved-name restrictions. Both profiles check the
shared native metadata contract, and neither requires SuperSkill-only fields
such as `version`, `tags`, `triggers`, or internal rule IDs. Other fields are
profile-dependent. The current
checked metadata contract is [`src/lib/native-skill.ts`](../../src/lib/native-skill.ts);
bundle and reference checks are implemented in
[`src/commands/skill/validate.ts`](../../src/commands/skill/validate.ts). Do not
infer the validator contract from the atomic-rule authoring docs.

`name` and `description` are discovery metadata. Make the description specific:
say what the skill does and when it should be selected. In the body, give the
agent actionable steps, decision points, and representative examples. Keep the
main file focused; the official guidance recommends staying under 500 lines and
moving detailed material into local references. This is a quality guideline,
not a reason to impose an unrelated fixed token limit.

## Bundle and local references

Keep a skill's resources beside its `SKILL.md`, and reference them with
forward-slash paths relative to the skill directory. Link to each file directly
from `SKILL.md`; avoid deep reference chains. Ensure every referenced local file
and script exists and remains inside the skill bundle. Review bundled code as
code: validation establishes safe paths and presence, not that a script is safe
to execute. Do not run submitted skill scripts as part of ordinary CI.

## Deterministic validation

After building, validate the exact file with the selected profile:

```bash
node dist/cli.js skill validate path/to/SKILL.md --profile anthropic
```

This gate checks native metadata and local bundle references. CI applies it only
to shipped `skills/**/SKILL.md` files; it does not validate templates, internal
catalog summaries, or rule files as native skills. A passing check is structural
evidence only: it does not prove that the skill activates at the right time,
follows its instructions, or works across agent providers.

## Behavioral evaluation

For a behavior change, compare the skill against a no-skill baseline on at least
three representative scenarios, including an in-scope case and a plausible
near-miss when applicable. Record the expected behavior, baseline outcome,
skill-assisted outcome, and any regression. Identify each tested provider/tool
and exact model/version; test a model matrix when more than one target is
available, and scope conclusions to the evidence actually collected. Do not
claim provider-wide quality from a single tool. No live provider calls run in
ordinary PR CI; use the PR template to report reproducible evidence manually.

## References

- [Anthropic Agent Skills overview and metadata contract](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview#skill-structure)
- [Anthropic Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
- [Agent Skills specification](https://agentskills.io/specification)
- [Atomic rule contract](../authoring/CONTRACT.md) — separate format and lifecycle
