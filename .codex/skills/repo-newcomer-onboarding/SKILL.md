---
name: repo-newcomer-onboarding
description: Generate repository-agnostic newcomer onboarding guides and architecture walkthroughs for any codebase. Use when users ask for 项目起手式, 新人入门说明, repo 目录梳理, 架构说明, scripts 解释, or a clickable Markdown guide under docs/ for an unfamiliar repository.
---

# Repo Newcomer Onboarding

## Goal

Generate a newcomer-friendly developer guide that works for any repository, with a focus on:

- what the project does
- how the top-level directories are organized
- what commands are used for setup, dev, test, and build
- which files are key entry points
- which business or domain modules are most important
- what is fact vs what is inferred from repository structure
- how to produce a first draft first and then run an expert-style review pass

## Default Behavior

The skill should behave as a one-shot workflow for the user:

- internally run Step 1 (fact extraction + first draft)
- internally run Step 2 (hidden expert review / self-correction)
- return or write the final polished developer guide as the default deliverable
- by default, keep Step 1 draft / facts JSON / review prompt / playbook in a temporary directory such as `~/tmp/...` or `/tmp/...`, not in `docs/`

Do not expose the raw Step 1 draft to the user unless the user explicitly asks for intermediate artifacts or debugging output.
Artifacts such as the Step 1 draft, facts JSON, review prompt, and review playbook are optional support files, not the default user-facing result.

## Workflow

1. Read `references/reading-checklist.md`.
2. Read `references/output-spec.md`.
3. Read `references/review-rubric.md`.
4. If you need a ready-to-run Step 2 prompt shape, read `references/review-prompt-template.md`.
5. If the repo clearly belongs to a language/framework family, read `references/stack-review-profiles.md` and apply the matching profile checks.
6. If you need stronger final-output constraints for Step 2, read `references/stack-output-contracts.md`.
7. If you want an operational Step 2 sequence, read `references/review-execution-flow.md`.
8. Inspect repository basics (`README*`, package manager files, build config, and entry files).
9. Step 1 (Generation): generate the first draft into a temporary location, not `docs/`, unless the user explicitly asks for intermediate files:

```bash
python3 .codex/skills/repo-newcomer-onboarding/scripts/generate-onboarding-doc.py \
  --output ~/tmp/repo-onboarding-run/developer-guide.draft.md \
  --internal-artifacts-dir ~/tmp/repo-onboarding-run
```

10. After Step 1, open the temporary draft plus temporary review artifacts, run the hidden expert review, and only then write the final reviewed version to `docs/developer-guide.md`.

11. If the user explicitly wants the final file in a custom path, pass `--output` for the final reviewed file, not the hidden draft:

```bash
python3 .codex/skills/repo-newcomer-onboarding/scripts/generate-onboarding-doc.py --output docs/developer-guide.md
```

12. If the user explicitly asks for a machine-readable fact layer in the repo, also emit JSON:

```bash
python3 .codex/skills/repo-newcomer-onboarding/scripts/generate-onboarding-doc.py --output docs/developer-guide.md --facts-output docs/repo-facts.json
```

13. If the user explicitly asks for a ready-to-use Step 2 expert-review prompt in the repo:

```bash
python3 .codex/skills/repo-newcomer-onboarding/scripts/generate-onboarding-doc.py --output docs/developer-guide.md --facts-output docs/repo-facts.json --review-prompt-output docs/developer-guide-review-prompt.md
```

14. If the user explicitly asks for a step-by-step Step 2 execution playbook in the repo:

```bash
python3 .codex/skills/repo-newcomer-onboarding/scripts/generate-onboarding-doc.py --output docs/developer-guide.md --facts-output docs/repo-facts.json --review-prompt-output docs/developer-guide-review-prompt.md --review-playbook-output docs/developer-guide-review-playbook.md
```

15. For cross-repo usage (run from another working directory), pass `--repo-root`:

```bash
python3 .codex/skills/repo-newcomer-onboarding/scripts/generate-onboarding-doc.py --repo-root /path/to/repo --output docs/developer-guide.md
```

16. Step 2 (Review): switch into hidden expert-review mode and check the temporary draft against `references/review-rubric.md`.
17. Prefer using the generated temporary review prompt file when available; otherwise compose the prompt from `references/review-prompt-template.md`.
18. If `review_profiles` or stack signals are clear, apply the matching rules from `references/stack-review-profiles.md`.
19. If Step 2 needs stronger final-output guarantees, apply the matching rules from `references/stack-output-contracts.md`.
20. If you generated a review playbook, follow it as the recommended execution order.
21. If the review finds mismatches, rewrite the draft directly and write the polished final version to the requested `docs/` path instead of appending comments.
22. Unless the user explicitly asks for intermediate files, only present the reviewed final document as the primary result.
23. Enrich the reviewed document with user-specific concerns.

## Mandatory Coverage

Always cover these topics:

- project summary and detected stack
- developer-guide style section layout, not just a short onboarding memo
- top-level directory map
- runnable scripts/commands and generated-file caveats
- key runtime/architecture entry chain (with explicit "inference" label when needed)
- business/domain module overview from directory and route clues
- first-day reading order for newcomers
- existing skills catalog if the repo has `skills/`
- explicit separation of facts and inferences
- an expert-review rubric section or equivalent second-pass instructions

## Resources

- `scripts/generate-onboarding-doc.py`: build a clickable developer-guide draft plus optional fact JSON from repository signals
- `references/reading-checklist.md`: minimum inspection checklist for unknown repositories
- `references/output-spec.md`: required sections and writing/link conventions
- `references/review-rubric.md`: Step 2 expert-review checklist used to self-correct the first draft
- `references/review-prompt-template.md`: reusable Step 2 prompt template
- `references/stack-review-profiles.md`: stack-specific Step 2 review rules
- `references/stack-output-contracts.md`: stack-specific final-output constraints for Step 2
- `references/review-execution-flow.md`: step-by-step Step 2 execution order
- `assets/onboarding-template.md`: optional skeleton for manual edits
