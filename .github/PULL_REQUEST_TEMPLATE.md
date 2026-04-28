<!--
Thanks for the PR. A few notes that make review faster:
  - Reference the issue this closes (Closes #N).
  - If this changes scanner behavior, include a unit test covering the new case.
  - If this changes a public surface (API route, MCP tool, env var), call it out below.
-->

## What changes

<!-- One paragraph. What's different after this PR? -->

## Why

<!-- The motivating issue or use case. -->

## Notes for reviewers

<!-- Anything non-obvious about the change. Edge cases, perf considerations, follow-up work. -->

## Public-surface changes

- [ ] No public-surface changes
- [ ] Adds / changes an API route — listed below
- [ ] Adds / changes an MCP tool — listed below
- [ ] Adds / changes a required env var — listed below

<!-- If any of the above are checked, fill in here. -->

## Checks

- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] `npm run build` passes
- [ ] Tests added or updated where behavior changed
