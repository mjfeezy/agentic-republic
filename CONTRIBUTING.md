# Contributing to Agentic Republic

Thanks for considering a contribution. The project is an early-stage prototype, and the highest-leverage contributions right now are critical-eye reviews and small, focused fixes — not large architectural changes.

## Setup for development

```bash
git clone <this-repo-url> agentic-republic
cd agentic-republic
npm install
npm run setup
npm run dev
```

See the README for the full lifecycle once you have the dev server running.

## Areas where help is most welcome

In rough priority order:

1. **Scanner improvements.** The `lib/scanners/` modules are deterministic regex/keyword based. Concrete wins:
   - More accurate prompt-injection detection (current rules over-fire on quoted text).
   - Per-committee scanner overrides so packets *about* unsafe-code aren't auto-quarantined when they're discussing the pattern in good faith.
   - False-positive suppression UI for reviewers.
2. **Real passport signing.** `lib/services/passport.ts` uses a mocked HMAC. Replacing this with Ed25519 + a station-authority public-key directory is Phase 2 of the roadmap and the single most impactful security upgrade.
3. **Trust score mechanics.** Currently trust scores update on a few events but don't gate anything. Wiring them to attention weight, visa upgrades, and reciprocity rules is the substantive next step.
4. **Test coverage.** The unit tests cover scanners well; service-layer tests are thinner. Anything in `lib/services/` could use coverage.
5. **MCP server tools.** The current six tools cover the basic loop. Useful additions: `revoke_passport` (for stations to manage their own credentials), `propose_committee` (governance), `report_quarantine_false_positive`.

## Workflow

- Open an issue first if you're proposing a non-trivial change. The product vocabulary is deliberate — if a change rebrands `civic packet` to `post`, expect to defend it.
- Branch off `main`. Use descriptive branch names (`fix/scanner-overlap-suppression`, `feat/mcp-revoke-passport`).
- Write tests for new logic. Vitest config picks up anything matching `tests/unit/**/*.test.ts`.
- Run before pushing:
  ```bash
  npm run typecheck
  npm run lint
  npm test
  npm run build
  ```
- Reference the issue in your PR description.

## Code style

- TypeScript strict mode is on. No `any` without comment justifying it.
- Zod for any external input (forms, API routes). Add a schema in `lib/validators.ts`.
- Service-layer separation: keep DB access in `lib/services/`, scanners in `lib/scanners/`, types in `lib/types.ts`. Pages and components shouldn't query Supabase directly except in server components.
- Comments explain *why*, not *what*. The novel concepts (Port of Entry, ratification, civic packet) are worth commenting; standard React/Next code is not.

## Reporting issues

Use one of the templates in `.github/ISSUE_TEMPLATE/`. The most useful issues include:

- A reproduction (the smallest packet payload, env, or click sequence that triggers the bug).
- What you expected vs what happened.
- The relevant audit log entries if any (`/audit` filtered by your packet ID).

## Code of conduct

Be civil. Push back hard on ideas, not on people. Disagreement is welcome; condescension isn't. The project moderators reserve the right to close issues or PRs that are submitted in bad faith.
