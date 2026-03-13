# Output Spec

Generate a Markdown file under `docs/` that is easy for newcomers to scan and navigate.
Default style target: `docs/developer-guide.md`, not a minimal note.
Default delivery mode: output the reviewed final version to the user, not the raw draft.
Hidden support artifacts for Step 1 / Step 2 should go to `~/tmp/...` or `/tmp/...` by default, unless the user explicitly asks to keep them in the repository.

## Required sections

1. Project overview
2. Quick start
3. Project structure
4. Architecture
5. Development workflow
6. Coding standards
7. Configuration
8. Database or persistence notes
9. API design notes
10. Observability
11. Testing
12. Build and release
13. Deployment
14. FAQ
15. Contributing
16. Roadmap
17. Onboarding
18. Facts vs inferences
19. Expert review rubric or second-pass review instructions

## Link rules

- Use standard Markdown links for file and folder paths
- Keep paths visible in prose and link the same path when possible
- Compute links relative to the output document
- Prefer clickable links to make navigation frictionless

## Writing rules

- Write in Chinese by default unless user asks otherwise
- Use short bullets and concrete file paths
- Mark uncertain statements as inferences
- Avoid project-specific assumptions when evidence is missing
- Keep it actionable for someone joining on day one
- Keep the section even when evidence is missing; explicitly write `未从仓库自动确认，需维护者补充`
- Prefer repository facts first, generic suggestions second
- The first draft should be reviewable by a second-pass “expert reviewer”
- The final user-facing result should normally be the post-review polished document
