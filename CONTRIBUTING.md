# Contributing to evade-player

Thanks for helping out. This is a small project — the process is deliberately light.

## Getting set up

```bash
npm ci
npm run dev      # demo app on http://localhost:5173
```

Copy `.env.example` to `.env` to point the demo at your own video.

## Branching

`main` is the trunk and is always releasable — every push to it redeploys the
GitHub Pages demo. There are no long-lived release branches: releases are plain
tags on `main`.

```
feat/next-episode-prompt ─┐
fix/resume-overwrite ─────┼─► pull request ─► CI green ─► squash merge ─► main
                          ┘
```

- Branch off `main`: `feat/…` for features, `fix/…` for bug fixes, `docs/…`,
  `chore/…` for the rest.
- Keep branches short-lived and focused. One concern per pull request.
- Merges are squashed, so the pull request title becomes the commit message —
  write it as one: `fix: keep playback position when the tab is backgrounded`.

If a patch is ever needed for an older minor line, a maintenance branch is cut
from the tag at that point (`git checkout -b 0.2.x 0.2.1`). Tags make this
possible retroactively, so the branch is only created when it is actually needed.

## Before opening a pull request

```bash
npm run lint
npm run typecheck
npm test
```

CI runs exactly these plus `npm run build:all`. All four must pass.

Two notes:

- Use `npm run typecheck`, not `tsc --noEmit`. The root `tsconfig.json` is
  solution-style (`files: []` plus `references`), so a plain `tsc --noEmit`
  silently checks zero files.
- Add a line to the `[Unreleased]` section of [CHANGELOG.md](CHANGELOG.md) in the
  same pull request, under `Added`, `Changed`, or `Fixed`.

## Tests

Vitest with jsdom, colocated as `*.test.ts` / `*.test.tsx` next to the code they
cover.

```bash
npm test              # single run
npm run test:watch
npm run test:coverage
```

A bug fix should come with a test that fails without the fix. It is worth
checking that it really does — temporarily revert the fix and watch the test go
red. A regression test that passes either way is not protecting anything.

## Adding a language

Translations are very welcome and take **two files**. The full walkthrough,
including what the automated checks catch, is in the README:

> [Contributing a locale](README.md#contributing-a-locale)

The short version:

1. Copy `src/skins/default/locales/en.ts` to `<tag>.ts` and translate every value,
   keeping `{placeholders}` intact.
2. Add one import and one entry to `src/skins/default/locales/registry.ts`.
3. Run `npm run typecheck && npm test` — between them they catch missing keys,
   empty values, dropped placeholders, and untranslated options.

Nothing else needs touching: the `Locale` type accepts any registered tag.

## Code conventions

- UI text always comes from the locale string table. Never hardcode display
  strings in components or in `utils.ts`. When the player *generates* a label,
  attach a `labelKey` (and `labelParams`) next to the untranslated `label` and
  render it through `resolveLocalizedLabel(option, t)`. Labels supplied by the
  consumer, and names read off the media element, are never translated.
- Match the surrounding style — 4-space indent, single quotes, explicit return
  types on exported functions.
- The player implementation lives in `src/skins/default/`. `skin.tsx` is the UI
  tree; individual controls live in `components/`.

## Releasing

Maintainers only.

```bash
# 1. Move [Unreleased] to the new version heading in CHANGELOG.md, add the date.
# 2. Bump, commit, and tag in one step:
npm version minor -m "release: %s"
git push --follow-tags
# 3. Create a GitHub Release for the new tag.
```

Publishing to npm is automated: creating the GitHub Release triggers
[`npm-publish.yml`](.github/workflows/npm-publish.yml), which reruns lint,
typecheck, and tests before `npm publish`.

Two things to keep straight:

- `npm publish` reads the version from `package.json`, not from the tag. `npm
  version` bumps, commits, and tags together, which is why it is used instead of
  editing `package.json` by hand.
- Tags carry no `v` prefix (`0.2.1`, not `v0.2.1`). This is pinned by
  `tag-version-prefix=""` in `.npmrc` — leave it alone so the tag history stays
  consistent.

Versioning follows semver. The project is pre-1.0, so breaking changes may land
in a minor release, but they belong in the changelog under `Changed`.
