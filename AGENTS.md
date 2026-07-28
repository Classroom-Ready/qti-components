# AGENTS.md

## Scope And Precedence

- This file defines repository-wide defaults for contributors and coding agents.
- A package-level `AGENTS.md` may add stricter rules for that package.
- Package-level rules must not weaken core safety, quality, and verification requirements in this root file.

## Repository Map

- Monorepo package roots: `packages/*`
- Storybook config: `.storybook/`
- Shared tooling: `tools/`
- QTI interaction package: `packages/qti-interactions/`
- Theme package: `packages/qti-theme/`

## Canonical Commands

- Install dependencies: `pnpm install`
- Start root Storybook and CEM watch: `pnpm storybook`
- Build all packages: `pnpm build`
- Run test pipeline: `pnpm test`
- Run full checks: `pnpm test-all`
- Type check: `pnpm tsc`
- Lint: `pnpm lint`

## Resolving Upstream-Sync PR Conflicts

Sync PRs (`main` -> `classroomready`) usually conflict only in generated custom-elements
manifests: `custom-elements.json` (root) and `packages/qti-components/custom-elements.json`.
Regenerate these from the merged source instead of hand-editing the conflict markers.

Resolve on a fresh branch off `classroomready`, not on `main` (which is rebased by
`sync-upstream.yml` and would clobber the fix). GitHub cannot repoint an existing PR's head
branch, so open a new PR from this branch and close the auto-generated sync PR as superseded.

- Branch off the integration branch: `git checkout -b sync-upstream-<date> origin/classroomready`.
- Start the merge, leaving conflicts in place: `git merge --no-ff --no-commit origin/main`.
- Reinstall against the merged manifest: `CI=true pnpm install --frozen-lockfile`. A failure
  here means the merged `package.json` and `pnpm-lock.yaml` disagree — fix that first.
- Regenerate `packages/qti-components/custom-elements.json`: `pnpm build`.
- Regenerate the root `custom-elements.json` (and the interactions manifest): `pnpm cem`.
- Confirm no markers survive: `grep -c '<<<<<<<' custom-elements.json packages/qti-components/custom-elements.json`.
- `public/mockServiceWorker.js` is an msw install artifact, not merge content — restore it:
  `git checkout -- public/mockServiceWorker.js`.
- Stage the regenerated manifests, then commit: `git add custom-elements.json packages/qti-components/custom-elements.json`.
- Verify the merged tree with `pnpm tsc` and `pnpm lint` before pushing.

## Coding And Testing Defaults

- Prefer small, focused changes with clear file-level intent.
- Keep package boundaries explicit; avoid leaking package-specific assumptions into unrelated packages.
- Reuse existing tooling and helper patterns before introducing new utilities.
- For TypeScript classes, prefer ECMAScript private fields using `#name` instead of the `private` modifier.
- When using `#` private fields, do not prefix private names with underscores.
- Validate behavior with the narrowest useful command first, then broader checks.
- If a package contains its own `AGENTS.md`, treat it as authoritative for package-local conventions.

## Safety And Review

- Do not use destructive git operations unless explicitly requested.
- Do not revert unrelated working tree changes.
- If unexpected modifications appear during work, stop and ask how to proceed.
- Document known risks and gaps when changes are not fully verifiable.

## Handoff Protocol

- Summarize what changed and why.
- Include exact file references and any added commands.
- Report validation performed and any skipped checks.
- List concrete next steps when follow-up is expected.
