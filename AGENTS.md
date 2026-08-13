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

## Classroom-Ready Fork Conventions

This is `Classroom-Ready/qti-components`, a fork of `Citolab/qti-components` consumed by the
`classroomready` monorepo as a submodule. `CONTRIBUTING.md` describes the upstream repo's own
trunk-based workflow (`main`, auto-merge, npm releases) and does not apply here as-is:

- Branch off `classroomready` (this fork's integration branch), not `main` — `main` here is a
  stale upstream mirror, refreshed only when someone presses GitHub's "Sync fork" button, so it
  does not reflect what the fork actually ships. `sync-upstream.yml` reads `upstream/main`
  directly and never writes this fork's `main`.
- Open PRs targeting `classroomready`. Never push directly to `classroomready`.
- `gh pr merge --auto` on a `classroomready` PR holds until the required `ci` check passes:
  the branch carries classic protection requiring it. Reviews are not required, so `--auto`
  merges on green with no human read — use it only where that is intended, as
  `sync-upstream.yml` does. The `main`-only ruleset `CONTRIBUTING.md` describes is a separate
  thing, scoped to `Citolab/qti-components`'s own `main`.
- Releases to the frontend happen via a manually-cut `vX.Y.Z-cr` GitHub Release from
  `classroomready`, not the changesets/npm-publish flow in `CONTRIBUTING.md`.

`CONTRIBUTING.md`'s canonical commands, pre-commit hooks, and coding defaults still apply —
only branch/merge/release mechanics differ.

## Canonical Commands

- Install dependencies: `pnpm install`
- Start root Storybook and CEM watch: `pnpm storybook`
- Build all packages: `pnpm build`
- Run test pipeline: `pnpm test`
- Run full checks: `pnpm test-all`
- Type check: `pnpm tsc`
- Lint: `pnpm lint`

## Committed Generated Files

`public/mockServiceWorker.js` is written by msw's postinstall on every `pnpm install`, in msw's
own style, and is committed byte-for-byte as msw produces it — `.prettierignore` lists it so
nothing reformats it. Commit whatever `pnpm install` writes and never tidy it by hand: a diff
there means the msw version moved, and a reformatted copy makes every subsequent install dirty
the working tree.

## Resolving Upstream-Sync PR Conflicts

`sync-upstream.yml` does the merge itself. It merges `upstream/main` into the bot branch
`automation/sync-upstream` (cut fresh from `classroomready` each run), rebuilds, commits, and
opens the PR from that branch. The rebuild is the resolution: `pnpm install`, `pnpm build` and
`pnpm cem` overwrite the committed build output — the custom-elements manifests and
`public/mockServiceWorker.js` — from the merged sources, so the generated collisions that used to
block every sync never reach the PR. Whatever the rebuild writes is committed.

It merges `upstream/main` directly and does **not** touch this fork's `main`. The org ruleset on
`main` requires a pull request and grants bypass only to organization admins, so a bot push to
`main` is always rejected (`GH013`). `main` is therefore no longer updated automatically —
refresh it with GitHub's "Sync fork" button when you want it current. Nothing in the
`classroomready` path depends on it: upstream's commits become ancestors of `classroomready`
because the bot branch merges `upstream/main` itself.

The workflow also dispatches `ci.yml` against the bot branch: GitHub raises no `pull_request` run
for a PR opened with `GITHUB_TOKEN`, so without the dispatch the required `ci` check would never
report and auto-merge would wait forever.

When the job fails with "Conflicts the rebuild could not resolve", the conflict is in
hand-written content and needs a human. Resolve it on a branch off `classroomready`, mirroring
what the workflow does:

- Branch off the integration branch: `git checkout -b sync-upstream-<date> origin/classroomready`.
- Fetch upstream into a local ref, without configuring a remote:
  `git fetch --no-tags https://github.com/Citolab/qti-components.git '+main:refs/upstream-sync/main'`.
  Don't add a remote named `upstream`: `gh` picks the repo it acts on from the remotes and prefers
  that name, so every later `gh` call would target `Citolab/qti-components` instead of this fork —
  which is how run 31023605181 failed. If you do add one, pass `--repo` to every `gh` call.
- Start the merge, leaving conflicts in place:
  `git merge --no-ff --no-commit refs/upstream-sync/main`.
- Resolve the hand-written conflicts by hand. Leave the `custom-elements*.json` manifests alone.
- Reinstall against the merged manifest: `CI=true pnpm install --frozen-lockfile`. A failure
  here means the merged `package.json` and `pnpm-lock.yaml` disagree — fix that first.
- Rebuild the manifests: `pnpm build`, then `pnpm cem`.
- Confirm no markers survive: `git grep -l '^<<<<<<< ' -- 'custom-elements*.json' '**/custom-elements*.json'`.
- Stage everything the rebuild wrote — the manifests and the msw worker `pnpm install` rewrites —
  then commit: `git add 'custom-elements*.json' '**/custom-elements*.json' public/mockServiceWorker.js`.
- Verify the merged tree with `pnpm tsc` and `pnpm lint` before pushing.

GitHub cannot repoint an open PR's head branch, so open a new PR from your branch and close the
bot's as superseded.

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
