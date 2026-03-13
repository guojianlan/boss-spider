# Stack Review Profiles

Use this file when Step 2 needs stack-specific review depth.

## node-frontend

- Check `eslint`, `tsc` / typecheck, test runner, build runner, codegen, style system, routing setup.
- If Next.js and React Router coexist, describe the relationship precisely.
- If shared state / request / i18n libraries exist, make sure their roles are reflected in the guide.

## client-router

- Confirm where routes really come from: file routing, route registry, menu tree, generated map, or all of them.
- Make sure “新增页面应该改哪一层” is documented.

## go-service

- Check `cmd/`, `internal/`, `pkg/`, migration, lint, format, test, build, deployment expectations.

## python-service

- Check dependency manager, formatter, linter, test runner, app entry, migration layer, environment config.

## java-service

- Check Maven/Gradle, app bootstrap, packaging, test conventions, static analysis, deployment descriptors.

## generated-artifacts

- Confirm generated files are clearly marked and not described as hand-edited source.
- Ensure FAQ / development workflow mentions regeneration.

## framework-shell

- Confirm framework shell, runtime shell, and real business entry chain are separated clearly.
- Avoid calling a hybrid app “pure file-based routing” when business routes actually come from a client router or generated registry.
