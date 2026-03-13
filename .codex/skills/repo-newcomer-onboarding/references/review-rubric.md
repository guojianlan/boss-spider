# Review Rubric

Use this file in Step 2 after the first draft is generated.
If the repository clearly matches one of the profiles in `references/stack-review-profiles.md`, apply those profile checks in addition to the generic rubric.
If the repository also matches a final-output contract in `references/stack-output-contracts.md`, use that contract to constrain the final Markdown.

## Expert Review Prompt Intent

Treat the generated draft as an editable working document, not as final output.
The goal of the review pass is to rewrite the draft into a more professional developer guide.

## Mandatory checks

1. Toolchain completeness

- Does the detected tech stack imply additional tools that were missed?
- Examples:
  - Go -> `gofmt`, `golangci-lint`, `go test`
  - Node/TypeScript -> `eslint`, `tsc`, test runner, build runner
  - Python -> formatter, linter, test runner, dependency manager
- If the repo lacks an expected tool, say that explicitly instead of inventing it.

2. Architecture professionalism

- Does the architecture section use precise terminology?
- If the repo is hybrid (for example framework shell + client router), say so clearly.
- If the repo appears layered, modular, DDD-like, MVC-like, or service-oriented, describe that carefully and only when supported by evidence.

3. Directory-to-architecture consistency

- Do the directory descriptions actually match the claimed architecture?
- If the text says “DDD” but the directories look like `pages/api/stores/components`, correct the wording.

4. Commands and generated artifacts

- Are setup/dev/test/build commands complete and aligned with the repository?
- Are generated files or codegen steps clearly marked as “do not edit manually” when applicable?

5. Missing but important sections

- Quick start should let a newcomer try the project immediately.
- Onboarding should provide a safe first-day reading order.
- Configuration / API / Testing / Deployment sections should never bluff; mark them as unconfirmed if evidence is weak.

6. Facts vs inferences

- Facts must come from repository evidence.
- Inferences must be explicitly labeled.
- Remove any sentence that sounds definitive but is only a guess.

## Review output rule

If issues are found:

- rewrite the document directly
- keep the desired document structure intact
- output the corrected final version, not a review memo

If no issues are found:

- keep the structure
- tighten wording where useful
- still output the polished final version
