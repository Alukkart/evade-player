# Changelog

All notable changes are documented here. Add your entry to **[Unreleased]** in
the same pull request as the change; releasing renames that heading to the new
version. See [CONTRIBUTING.md](CONTRIBUTING.md#releasing).

## [Unreleased]

### Added
- `playbackerror` event (`onPlaybackError` in React) reporting playback failures with `fatal`, `kind`, `details`, `status`, `url`, and `time` — the HTTP status distinguishes an expired signed manifest (`403`) from a dropped network or a missing file
- Web Component `reload(src, options?)` — swaps the source in place, restoring the position and leaving voiceover, quality, volume and fullscreen untouched
- `PlaybackErrorDetail`, `PlaybackErrorKind`, and `ReloadOptions` types
- Extensible locale system — `registerLocale`, `resolveLocaleStrings`, `listLocales`, `hasLocale`, and `DEFAULT_LOCALE`; any registered tag is accepted, regional tags (`ru-RU`) fall back to the base language, and unknown tags fall back to English
- `localeStrings` prop (and `LocaleProvider strings`) for overriding individual UI strings
- Locale API exposed on the standalone bundle, so script-tag consumers can add a language without a bundler
- Web Component now re-dispatches media events — `loadedmetadata`, `durationchange`, `play`, `playing`, `pause`, `waiting`, `seeking`, `seeked`, `timeupdate`, `volumechange`, `ratechange`, `ended`, `error`
- Web Component `qualities` and `seasons` JSON attributes, matching the existing `fragments` attributes
- `releaseMediaElement()` for handing the audio chain back when a player unmounts
- Package exports for the standalone bundle (`evade-player/standalone`, `evade-player/standalone/thin`, `evade-player/standalone.css`)
- CI workflow running lint, typecheck, tests, and all builds

### Changed
- Default locale documented correctly as `en` (behaviour unchanged); `LocaleProvider` and the locale context now agree
- `getFragmentLabel(type, source)` accepts a resolved string table as well as a locale tag
- TypeScript `strict` and `noUncheckedIndexedAccess` enabled across all projects
- Release workflow runs lint, typecheck, and tests before publishing, and triggers on `published` rather than `created`

### Fixed
- Playback position is no longer lost when a tab is backgrounded or closed on mobile — saving now uses `visibilitychange`/`pagehide` instead of the unreliable `beforeunload`
- Playback position is no longer overwritten while the resume prompt is still awaiting the user's choice
- Subtitle settings submenus rendered raw locale keys (e.g. `subtitleFontSize`) as their heading and `aria-label`
- Subtitle settings summary rows showed English labels regardless of the active locale
- Player-generated labels ("Off", "Auto", "Track N", "Quality N") are now translated instead of being hardcoded English
- Volume boost and loudness normalization silently stopped working after a player remount
- `resolveActiveQualityValue` could return `undefined` despite its `string` return type, and threw on an empty option list
- Test declarations (`*.test.d.ts`, `test-utils/`) are no longer published to npm
- Typecheck in CI actually checks the source — `tsc --noEmit` on the solution-style config was checking zero files

## [0.2.1] — 2026-06-08

### Added
- Next episode prompt — "Up next" overlay with an auto-advance countdown, "Play" button, and dismiss control
- Fullscreen scale setting — None (contain), Stretch (fill), and Crop (cover) modes for fullscreen playback
- Sleep timer setting — off or 5–120 minute presets in the settings menu
- Per-voiceover sources and episode lists — `src` on `EpisodeOption`/`VoiceoverOption` and voiceover-specific episode filtering
- Web Component `fragments` and `fragment-settings` JSON attributes for timeline fragments and auto-skip
- Layout-independent hotkeys for keyboard control regardless of the active layout
- Dark mode support
- GitHub Pages demo build (`npm run build:pages`)
- Test suite (Vitest) covering playback state and settings persistence

### Changed
- Settings menu extended with fullscreen scale and sleep timer submenus
- Content selector reworked to resolve sources and episodes per voiceover

### Fixed
- Next episode prompt close button no longer overlaps the title and action button
- Player overlay rendering fixes

## [0.2.0] — 2026-05-30

### Added
- Framework-agnostic Web Component distribution for `<evade-player>`
- Standalone browser bundles: `evade-player.js`, `evade-player.mjs`, `evade-player.thin.js`, and `evade-player.thin.mjs`
- Type declarations for standalone and Web Component usage

### Changed
- React library build artifacts renamed from `player-platform.*` to `evade-player.react.*`
- Package entry points now resolve to `dist/evade-player.react.js`
- CDN examples now use pinned `evade-player@0.2.0` URLs
- README now clearly separates `evade-player` frontend player ownership from the `evadeplayer-platform` backend project
- Project metadata updated for the `evade-player` package and GitHub repository

### Fixed
- Author/project attribution in README and package metadata
- Standalone package documentation and examples for jsDelivr usage

## [0.1.3] — 2026-05-29

### Fixed
- Standalone work

## [0.1.2] — 2026-05-29

### Added
- Playback state management — saves/restores position, season, episode, voiceover per source
- Resume prompt — "Continue from X?" overlay on returning to a partially-watched video
- Season, episode, and voiceover selectors in the top-right corner
- Content navigation callbacks (`onSeasonChange`, `onEpisodeChange`, `onVoiceoverChange`)
- `savedState` and `onSaveState` props for external state control
- `locale` prop for `VideoPlayer` with Russian and English translations
- Fragment segments (Opening, Ending, Preview, Recap) — colored markers on the timeline
- Skip fragment button — appears when playback enters a fragment, seeks past it
- Auto-skip settings per fragment type in the settings menu
- Fragment settings persisted in localStorage
- `fragmentSettings` prop for external configuration of auto-skip defaults

### Changed
- Refactored video source management — unified HLS/regular video handling
- `currentSeason` is now optional — derived from `currentEpisode` (`s1e1` → `s1`) when not provided
- Settings menu, subtitle settings, error dialog, and resume prompt now use localized strings
- Subtitle settings refactored with centralized option views and localized labels
- Removed debug logging from VolumeProcessor

### Fixed
- Environment variable name in npm publish workflow
- Fragment settings no longer trigger full player re-render (moved to context-based state)

## [0.1.1] — 2026-05-27

### Added
- Audio settings menu with volume boost (50–300%) and normalization (off/light/medium/strong)
- Subtitle appearance customization — font size, text color, background, edge style, font family, position
- Subtitle position settings with four presets (low, default, high, very high)
- Settings menu with quality, subtitles, speed, and audio submenus
- Button component for player controls
- Environment variables for demo configuration

### Changed
- Refactored audio chain management into a singleton Web Audio API manager
- Renamed project to `evade-player`

### Fixed
- Type casting for media element extraction in audio chain

## [0.1.0] — 2026-05-26

### Added
- Initial release
- React 19 + Video.js v10 player with HLS streaming
- Accessible controls (keyboard, screen reader, focus management)
- Picture-in-picture, fullscreen, and Cast support
- Thumbnail storyboard previews on timeline
- Hotkeys and gesture support
- Audio volume boost and dynamic range compression via Web Audio API
- Pluggable skin system
- Docker development environment
- GitHub Actions workflow for npm publishing
- MIT License

[0.2.1]: https://github.com/alukkart/evade-player/releases/tag/0.2.1
[0.2.0]: https://github.com/alukkart/evade-player/releases/tag/0.2.0
[0.1.3]: https://github.com/alukkart/evade-player/releases/tag/0.1.3
[0.1.2]: https://github.com/alukkart/evade-player/releases/tag/0.1.2
[0.1.1]: https://github.com/alukkart/evade-player/releases/tag/0.1.1
[0.1.0]: https://github.com/alukkart/evade-player/releases/tag/0.1.0
