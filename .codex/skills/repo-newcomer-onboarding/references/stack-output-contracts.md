# Stack Output Contracts

Use this file in Step 2 when the final Markdown needs stronger structure guarantees for a specific repository shape.

## node-frontend

- Quick Start must include install, dev start, local URL, and any required codegen step.
- Architecture must separate framework shell, client app, router, state, request layer, and business page layer when those signals exist.
- Coding Standards must not claim `eslint` / `tsc` / tests exist unless the repo actually exposes them.

## client-router

- The final document must state where routes actually come from.
- It must answer which file or mapping a developer edits when adding a new page.

## go-service

- The final document must prioritize `cmd/`, runtime bootstrap, build/test/lint commands, migration, config, and deployment notes.

## python-service

- The final document must prioritize dependency installation, virtual environment expectations, app entry, migrations, and env configuration.

## java-service

- The final document must prioritize Maven/Gradle, packaging, startup, testing, and deployment descriptors.

## generated-artifacts

- The final document must explicitly warn against hand-editing generated files.
- The warning should appear in at least one of: Quick Start, Development Workflow, FAQ, or Contributing.

## framework-shell

- The final document must separate shell-level entry files from the true business runtime chain.
- Do not call the app “pure file routing” if route resolution actually depends on a client router, route registry, or generated map.
