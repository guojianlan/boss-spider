# Reading Checklist

Use this checklist before generating or revising onboarding docs for an unfamiliar repository.

## 1) Project purpose and constraints

- `README.md` (or nearest README variants)
- Product/domain docs under `docs/`, `references/`, `specs/`, or `design/`
- Runtime requirements (Node/Python/Go/Rust/Java versions, OS requirements)

## 2) Build and command surface

- Package manager files (`package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, etc.)
- Build config and toolchain files (`tsconfig.json`, webpack/vite config, Makefile, Dockerfile)
- Generated-file scripts and any "do not edit manually" targets

## 3) Runtime entry chain

- Main entry files (frontend shell, server bootstrap, CLI entry)
- Routing composition (framework router files, route registries)
- App initialization sequence (config, auth, i18n, permissions, data preload)

## 4) Data/state/integration layers

- API client layer and request wrappers
- Domain model/type folders
- State management or service containers
- Database/schema/migration folders if present

## 5) Business module sampling

- Scan representative modules from `src/`, `app/`, `modules/`, `features/`, or equivalent
- Prefer route/menu/source-of-truth indexes when present
- Pick a few core flows end-to-end instead of reading every file blindly

## 6) Repository automation and quality gates

- CI workflow files (`.github/workflows`, GitLab CI, etc.)
- Lint/test/typecheck commands
- Release/versioning scripts

## 7) Questions the onboarding doc should answer

- How to run the project locally?
- Which files are true entry points vs generated artifacts?
- Where do major business domains live?
- What is safe for a newcomer to edit first?
- Which assumptions are inferred and still need maintainer confirmation?
