# Review Execution Flow

Use this file when you want a concrete Step 2 operating sequence instead of only a rubric.

Default user-facing behavior:

- the user should receive the final reviewed developer guide
- Step 1 draft, facts JSON, review prompt, and review playbook are internal support artifacts unless the user explicitly asks for them
- by default these support artifacts should live in `~/tmp/...` or `/tmp/...`, not under `docs/`

## Recommended sequence

1. Generate:
   - `~/tmp/.../developer-guide.draft.md`
   - `~/tmp/.../developer-guide.facts.json`
   - `~/tmp/.../developer-guide.review-prompt.md`
   - optional `~/tmp/.../developer-guide.review-playbook.md`
2. Open the draft, facts JSON, and review prompt together.
3. Ask the reviewer to output one corrected final Markdown document.
4. Write the final reviewed version to `docs/developer-guide.md` or the user-requested final path.
5. Return the final reviewed version to the user as the default deliverable.

## Minimal execution intent

- read the draft
- read the facts JSON
- read the review prompt
- output the corrected final Markdown only

## What Step 2 must not do

- do not output review notes only
- do not invent tools not found in the repo
- do not delete weak-evidence sections; mark them as unconfirmed
- do not turn guesses into facts
- do not expose the intermediate draft as the final answer by default
- do not leave temporary support artifacts in `docs/` unless the user explicitly asks for them there
