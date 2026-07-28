<div align="center">
  <img align="center" src="./src/assets/evade-player-logo.png" alt="EvadePlayer" width="120">
</div>

<br clear="right">

<h1 align="center">🎬 EvadePlayer</h1>

<p align="center">
  <strong>A React video player powered by Video.js — also available as a framework-agnostic Web Component</strong>
</p>

<p align="center">
  HLS streaming · accessible controls · audio processing · content navigation · fragment skip
</p>

<p align="center">
  <a href="https://react.dev"><img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React"></a>
  <a href="https://videojs.com"><img src="https://img.shields.io/badge/Video.js-10-ff6a00" alt="Video.js"></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white" alt="TypeScript"></a>
  <a href="https://vite.dev"><img src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white" alt="Vite"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green.svg" alt="MIT"></a>
  <br>
  <a href="https://www.npmjs.com/package/evade-player"><img src="https://img.shields.io/npm/v/evade-player" alt="npm"></a>
  <a href="https://bundlephobia.com/package/evade-player"><img src="https://img.shields.io/bundlephobia/minzip/evade-player" alt="Bundle size"></a>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> ·
  <a href="#usage">Usage</a> ·
  <a href="#web-component">Web Component</a> ·
  <a href="#public-api">API</a> ·
  <a href="#architecture">Architecture</a> ·
  <a href="#development">Development</a> ·
  <a href="#contributing-a-locale">Add a Locale</a> ·
  <a href="#related">Related</a>
</p>

<br>

<p align="center">
  <img width="1080" alt="EvadePlayer preview" src="https://github.com/user-attachments/assets/14814090-ad2b-404b-be78-e145fbd3ec32" />
</p>

<br>


<a name="about"></a>
## About

EvadePlayer is a full-featured video player by [Alukkart](https://github.com/Alukkart), built on [Video.js v10](https://videojs.com), available as a **React component** and as a **framework-agnostic Web Component** (`<evade-player>`).

| Capability | Description |
|---|---|
| 🎞️ **HLS Streaming** | Adaptive bitrate playback via hls.js |
| ♿ **Accessible Controls** | Keyboard navigation, screen reader, focus management |
| 🔊 **Audio Processing** | Volume boost + dynamic range compression (Web Audio API) |
| 🧩 **Content Navigation** | Season / episode / voiceover selector |
| ⏭️ **Fragment Skip** | Colored timeline markers + auto-skip for openings, endings, previews |
| 🖼️ **Thumbnail Previews** | Storyboard-based timeline hover previews |
| 🌐 **Localization** | English and Russian UI — [add a language](#contributing-a-locale) in two files |
| 💾 **State Persistence** | Remembers position, settings, preferences in `localStorage` |
| 📦 **Web Component** | Works in any framework — React, Vue, Svelte, Angular, or plain HTML |

This repository is the **frontend player**. The backend that handles uploading, transcoding, and serving video is a separate project by [leo-need-more-coffee](https://github.com/leo-need-more-coffee):

> [github.com/leo-need-more-coffee/evadeplayer-platform](https://github.com/leo-need-more-coffee/evadeplayer-platform)  
> Go + ffmpeg + nginx — upload, transcode to HLS, serve with signed URLs


<a name="quick-start"></a>
## Quick Start

### React (npm)

```bash
npm install evade-player
```

```tsx
import { VideoPlayer } from 'evade-player';
import 'evade-player/skins/default/skin.css';

function App() {
  return (
    <VideoPlayer
      src="https://example.com/video.m3u8"
      poster="https://example.com/poster.jpg"
    />
  );
}
```

### Any framework / no framework (script tag)

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/evade-player@0.2.1/dist/evade-player.css">
<script src="https://cdn.jsdelivr.net/npm/evade-player@0.2.1/dist/evade-player.js"></script>

<evade-player
  id="player"
  src="https://example.com/video.m3u8"
  poster="https://example.com/poster.jpg"
></evade-player>
```

### Dev server with demo app

```bash
npm ci
npm run dev
```

The demo app will be available at `http://localhost:5173`.


<a name="usage"></a>
## Usage

### Basic

```tsx
import { VideoPlayer } from 'evade-player';

<VideoPlayer
  src="https://stream.mux.com/abc123/highlight.mp4"
  poster="https://image.mux.com/abc123/thumbnail.webp"
/>
```

### With quality selection

```tsx
<VideoPlayer
  src="https://example.com/master.m3u8"
  qualities={[
    { label: '1080p', src: 'https://example.com/1080.m3u8' },
    { label: '720p',  src: 'https://example.com/720.m3u8' },
    { label: '480p',  src: 'https://example.com/480.m3u8' },
  ]}
/>
```

### With thumbnail storyboard

```tsx
<VideoPlayer
  src="https://example.com/master.m3u8"
  thumbnailStoryboardSrc="https://example.com/video/storyboard"
/>
```

The storyboard endpoint should return a JSON array:

```json
[
  { "url": "https://example.com/sprite.jpg", "start_time": 0, "end_time": 10 },
  { "url": "https://example.com/sprite.jpg", "start_time": 10, "end_time": 20 }
]
```

### With season, episode, and voiceover selection

```tsx
<VideoPlayer
  src="https://example.com/master.m3u8"
  seasons={[
    {
      label: 'Season 1',
      value: 's1',
      episodes: [
        {
          label: 'Episode 1',
          value: 's1e1',
          src: 'https://example.com/s1e1/master.m3u8',
          voiceovers: [
            { label: 'Russian', value: 'ru', src: 'https://example.com/ru/s1e1/master.m3u8' },
            { label: 'English', value: 'en', src: 'https://example.com/en/s1e1/master.m3u8' },
          ],
        },
      ],
    },
  ]}
  currentSeason="s1"
  currentEpisode="s1e1"
  currentVoiceover="ru"
  onSeasonChange={(value) => console.log('Season:', value)}
  onEpisodeChange={(value) => console.log('Episode:', value)}
  onVoiceoverChange={(value) => console.log('Voiceover:', value)}
/>
```

#### Source resolution

When `src` is provided in the hierarchy (on an episode or voiceover), the player automatically uses it as the video source — no need to manage the `src` prop manually. The priority is:

1. **Voiceover's `src`** (on the matched `VoiceoverOption` within the current episode)
2. **Episode's `src`** (on the current `EpisodeOption`)
3. **Explicit `src` prop** (fallback)

#### Episode filtering by voiceover

When a `VoiceoverOption` contains an `episodes` array, switching to that voiceover filters the episode selector to show only those episodes:

```tsx
voiceovers: [
  {
    label: 'Russian',
    value: 'ru',
    src: 'https://example.com/ru/s1e1.m3u8',
    episodes: [
      { label: 'Episode 1', value: 's1e1', src: 'https://example.com/ru/s1e1.m3u8' },
      { label: 'Episode 3', value: 's1e3', src: 'https://example.com/ru/s1e3.m3u8' },
    ],
  },
]
```

This lets you model dubbing studios that only cover a subset of episodes. If a voiceover has no `episodes` list, the episode selector shows all season episodes that include that voiceover.

All selection props are optional. The selector UI appears in the top-right corner of the player.

### With fragment markers and skip

```tsx
<VideoPlayer
  src="https://example.com/episode.m3u8"
  fragments={[
    { type: 'opening', startTime: 0, endTime: 90 },
    { type: 'ending', startTime: 1380, endTime: 1440 },
    { type: 'preview', startTime: 1440, endTime: 1470 },
  ]}
  fragmentSettings={{
    autoSkipOpening: true,
    autoSkipEnding: false,
    autoSkipPreview: false,
    autoSkipCompilation: false,
  }}
/>
```

Fragment segments appear as colored markers on the timeline. A skip button appears when playback enters a fragment. Auto-skip can be configured per fragment type in the settings menu or via the `fragmentSettings` prop.

### With locale

```tsx
<VideoPlayer
  src="https://example.com/video.m3u8"
  locale="ru"   // or "en"
/>
```

All UI strings adapt to the selected locale. `locale` defaults to `"en"`.
Regional tags fall back to the base language (`"ru-RU"` → `"ru"`), and an
unknown tag falls back to English rather than rendering blanks.

**Overriding a few strings** — merged over the active locale:

```tsx
<VideoPlayer
  src="https://example.com/video.m3u8"
  locale="ru"
  localeStrings={{ settingsSleepTimer: 'Таймер выключения' }}
/>
```

**Adding a language at runtime** — no fork or PR needed:

```tsx
import { registerLocale, localeEn, type LocaleStrings } from 'evade-player';

const localeDe: LocaleStrings = { ...localeEn, commonOff: 'Aus', commonOn: 'Ein' /* … */ };
registerLocale('de', localeDe);

<VideoPlayer src="…" locale="de" />
```

Helpers: `listLocales()`, `hasLocale(tag)`, `resolveLocaleStrings(tag)`,
`DEFAULT_LOCALE`.

See [Contributing a locale](#contributing-a-locale) to ship a language with the player.

### With playback state persistence

```tsx
import { useState } from 'react';
import { VideoPlayer, type PlaybackState } from 'evade-player';

function App() {
  const [state, setState] = useState<PlaybackState | null>(null);

  return (
    <VideoPlayer
      src="https://example.com/video.m3u8"
      savedState={state}
      onSaveState={(s) => setState(s)}
    />
  );
}
```

The player shows a "Continue from X?" prompt when returning to a partially-watched video. State is also persisted to `localStorage` automatically.

### Audio boost and normalization

```tsx
import { applyVolumeBoost, applyNormalization } from 'evade-player';

applyVolumeBoost(2);       // 2x gain
applyNormalization('light'); // 'off' | 'light' | 'medium' | 'strong'
```


<a name="web-component"></a>
## Web Component

The player is also available as a framework-agnostic custom element `<evade-player>`. It works in any JavaScript environment — React, Vue, Svelte, Angular, or plain HTML.

### Quick start (from CDN)

Two options — **self-contained** (React bundled) or **thin** (load React separately).

#### Option A: Self-contained (~263 kB gzip)

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/evade-player@0.2.1/dist/evade-player.css">
<script src="https://cdn.jsdelivr.net/npm/evade-player@0.2.1/dist/evade-player.js"></script>

<evade-player
  id="player"
  src="https://example.com/video.m3u8"
  poster="https://example.com/poster.jpg"
  locale="ru"
></evade-player>
```

Everything in one script. Nothing else to load.

#### Option B: Thin with React shared (~206 kB gzip)

Use when React is already on the page, or to share the React cache with other scripts:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/evade-player@0.2.1/dist/evade-player.css">
<script src="https://cdn.jsdelivr.net/npm/react@19/umd/react.production.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/react-dom@19/umd/react-dom.production.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/evade-player@0.2.1/dist/evade-player.thin.js"></script>

<evade-player
  id="player"
  src="https://example.com/video.m3u8"
></evade-player>
```

### Quick start (from npm)

The web component is also reachable through the package, for bundler-based
projects that are not using React:

```bash
npm install evade-player
```

```js
import 'evade-player/standalone';           // registers <evade-player>
import 'evade-player/standalone.css';

// Or, when React is already in your bundle:
// import 'evade-player/standalone/thin';
```

### Passing complex data

Arrays and objects can be set either as a JavaScript property or as a JSON
attribute. Properties take precedence:

```html
<evade-player
  src="https://example.com/master.m3u8"
  fragments='[{"type":"opening","startTime":0,"endTime":90}]'
></evade-player>
```

Via JavaScript properties on the element:

```html
<evade-player id="player" src="https://example.com/master.m3u8"></evade-player>
<script>
  const player = document.getElementById('player');

  player.seasons = [
    {
      label: 'Season 1',
      value: 's1',
      episodes: [
        {
          label: 'Episode 1',
          value: 's1e1',
          src: 'https://example.com/s1e1.m3u8',
          voiceovers: [
            { label: 'Russian', value: 'ru', src: 'https://example.com/ru/s1e1.m3u8' },
            { label: 'English', value: 'en', src: 'https://example.com/en/s1e1.m3u8' },
          ],
        },
      ],
    },
  ];

  player.fragments = [
    { type: 'opening', startTime: 0, endTime: 90 },
    { type: 'ending', startTime: 1380, endTime: 1440 },
  ];

  player.currentSeason = 's1';
  player.currentEpisode = 's1e1';
  player.currentVoiceover = 'ru';
</script>
```

### Listening to events

React callbacks are mapped to Custom Events:

```js
player.addEventListener('seasonchange', (e) => console.log('Season:', e.detail.value));
player.addEventListener('episodechange', (e) => console.log('Episode:', e.detail.value));
player.addEventListener('voiceoverchange', (e) => console.log('Voiceover:', e.detail.value));
player.addEventListener('savestate', (e) => console.log('Saved state:', e.detail.state));
```

### All element properties

| Property | Type | Via attribute |
|---|---|---|
| `src` | `string` | ✅ `src` |
| `poster` | `string \| undefined` | ✅ `poster` |
| `thumbnailStoryboardSrc` | `string \| undefined` | ✅ `thumbnail-storyboard-src` |
| `errorDescription` | `string \| undefined` | ✅ `error-description` |
| `currentSeason` | `string \| undefined` | ✅ `current-season` |
| `currentEpisode` | `string \| undefined` | ✅ `current-episode` |
| `currentVoiceover` | `string \| undefined` | ✅ `current-voiceover` |
| `locale` | `Locale \| undefined` | ✅ `locale` (any registered tag) |
| `qualities` | `QualityOption[]` | ✅ `qualities` (JSON) |
| `seasons` | `SeasonOption[]` | ✅ `seasons` (JSON) |
| `fragments` | `Fragment[]` | ✅ `fragments` (JSON) |
| `fragmentSettings` | `Partial<FragmentSettings>` | ✅ `fragment-settings` (JSON) |
| `savedState` | `PlaybackState \| null \| undefined` | ❌ (JS only) |
| `playerClass` | `string \| undefined` | ❌ (JS only) |

A JS property always wins over the matching attribute. Malformed JSON in an
attribute is ignored rather than thrown.

### Supported events

React callbacks map to these Custom Events:

| Event | `detail` shape |
|---|---|
| `seasonchange` | `{ value: string }` |
| `episodechange` | `{ value: string }` |
| `voiceoverchange` | `{ value: string }` |
| `savestate` | `{ state: PlaybackState }` |

Media element events are re-dispatched from the host element, so you can listen
on `<evade-player>` the way you would on `<video>`:

`loadedmetadata` · `durationchange` · `play` · `playing` · `pause` · `waiting` · `seeking` · `seeked` · `timeupdate` · `volumechange` · `ratechange` · `ended` · `error`

Each carries a snapshot in `detail`:

```js
player.addEventListener('timeupdate', (e) => {
  const { currentTime, duration } = e.detail;
  console.log(`${currentTime} / ${duration}`);
});

player.addEventListener('error', (e) => {
  console.error(e.detail.error); // { code, message }
});
```

| `detail` field | Type | Notes |
|---|---|---|
| `currentTime` | `number` | |
| `duration` | `number \| null` | `null` until known |
| `paused` | `boolean` | |
| `ended` | `boolean` | |
| `volume` | `number` | |
| `muted` | `boolean` | |
| `playbackRate` | `number` | |
| `error` | `{ code: number; message: string }` | present only when the media element has an error |

### Build your own bundle

```bash
npm run build:standalone          # Self-contained  ~263 kB gzip
npm run build:standalone:thin     # React external  ~206 kB gzip
npm run build:standalone:all      # Both
```

Outputs to `dist/`:
- `evade-player.react.js` / `.css` — React library package files
- `evade-player.js` / `.mjs` — IIFE + ESM, all deps bundled
- `evade-player.thin.js` / `.mjs` — IIFE + ESM, requires `React` / `ReactDOM` on `window`
- `evade-player.css` — shared styles


<a name="public-api"></a>
## Public API

### Components

| Export | Description |
|---|---|
| `VideoPlayer` | Main player component (React) |
| `Player` | Video.js store (Provider + Container) |
| `EvadePlayerElement` | Custom element class (`<evade-player>`) |
| `LocaleProvider` | Locale context provider (used internally) |

### VideoPlayer Props

| Prop | Type | Description |
|---|---|---|
| `src` | `string` | Video source URL |
| `poster` | `string \| undefined` | Poster image URL |
| `qualities` | `QualityOption[]` | Quality variants for manual selection |
| `thumbnailStoryboardSrc` | `string` | Storyboard JSON endpoint for timeline previews |
| `seasons` | `SeasonOption[]` | Season/episode/voiceover hierarchy |
| `currentSeason` | `string` | Current season value (derived from episode if omitted) |
| `currentEpisode` | `string` | Current episode value (e.g. `"s1e3"`) |
| `currentVoiceover` | `string` | Current voiceover/dub value |
| `onSeasonChange` | `(value: string) => void` | Season change callback |
| `onEpisodeChange` | `(value: string) => void` | Episode change callback |
| `onVoiceoverChange` | `(value: string) => void` | Voiceover change callback |
| `savedState` | `PlaybackState \| null` | External playback state to restore |
| `onSaveState` | `(state: PlaybackState) => void` | Callback when state is saved |
| `fragments` | `Fragment[]` | Fragment segments (opening, ending, etc.) |
| `fragmentSettings` | `Partial<FragmentSettings>` | Default auto-skip config per fragment type |
| `locale` | `Locale` | UI language — `"en"` (default), `"ru"`, or any registered tag |
| `localeStrings` | `Partial<LocaleStrings>` | Per-string overrides merged over the active locale |
| `errorDescription` | `string` | Custom error message |
| `style` | `CSSProperties` | Inline styles on the player container |
| `className` | `string` | Additional CSS class on the player container |

### Types

| Export | Description |
|---|---|
| `VideoPlayerProps` | Player component props |
| `QualityOption` | Quality variant option |
| `SeasonOption` | Season selection option (with episodes) |
| `EpisodeOption` | Episode selection option (with optional `src` and voiceovers) |
| `VoiceoverOption` | Voiceover / dub option (with optional `src` and `episodes`) |
| `SubtitleOption` | Subtitle track option |
| `AudioOption` | Audio track option |
| `SubtitleAppearance` | Subtitle style settings |
| `SubtitleSettingOption` | Subtitle style option |
| `SubtitleSettingsView` | Subtitle settings view key |
| `SettingsView` | Settings menu view key |
| `PlaybackState` | Saved playback position and context |
| `PlayerSettings` | Persistent player preferences |
| `Fragment` | Fragment segment (opening, ending, etc.) |
| `FragmentType` | Fragment type union string |
| `FragmentSettings` | Auto-skip configuration per fragment type |
| `Locale` | Supported locale (`"ru" \| "en"`) |
| `AudioChainDebugInfo` | Audio chain debug state |

### Audio Functions

| Export | Description |
|---|---|
| `applyVolumeBoost` | Set gain factor (0.5, 1, 2, 3…) |
| `applyNormalization` | Set compressor level (off/light/medium/strong) |
| `resumeOnUserInteraction` | Resume AudioContext on user gesture |
| `setMediaElement` | Attach a media element to the chain |
| `getAudioChainDebugInfo` | Get current audio chain state |

### State Persistence Functions

| Export | Description |
|---|---|
| `savePlaybackState` | Save playback position and context to localStorage |
| `loadPlaybackState` | Load saved playback state from localStorage |
| `clearPlaybackState` | Clear saved playback state from localStorage |
| `savePlayerSettings` | Save player preferences (volume, subtitles, etc.) |
| `loadPlayerSettings` | Load saved player preferences from localStorage |
| `clearPlayerSettings` | Clear saved player preferences from localStorage |

### Preset Constants

| Export | Description |
|---|---|
| `VOLUME_BOOST_OPTIONS` | Boost preset list (50–300%) |
| `NORMALIZATION_OPTIONS` | Level preset list |
| `DEFAULT_VOLUME_BOOST` | Default boost value |
| `DEFAULT_NORMALIZATION` | Default normalization level |
| `DEFAULT_SUBTITLE_APPEARANCE` | Default subtitle style |
| `SUBTITLE_FONT_SIZE_OPTIONS` | Font size presets |
| `SUBTITLE_COLOR_OPTIONS` | Text color presets |
| `SUBTITLE_BG_OPTIONS` | Background color presets |
| `SUBTITLE_EDGE_STYLE_OPTIONS` | Edge style presets |
| `SUBTITLE_FONT_FAMILY_OPTIONS` | Font family presets |
| `SUBTITLE_POSITION_OPTIONS` | Position presets |
| `DEFAULT_FRAGMENT_SETTINGS` | Default auto-skip fragment config |
| `FRAGMENT_COLORS` | Color map per fragment type |

### Localisation Exports

| Export | Description |
|---|---|
| `registerLocale(tag, strings)` | Register or replace a locale at runtime |
| `resolveLocaleStrings(tag?)` | String table for a tag, falling back to `DEFAULT_LOCALE` |
| `listLocales()` | Every registered locale tag |
| `hasLocale(tag)` | Whether a tag can be resolved |
| `DEFAULT_LOCALE` | `"en"` |
| `localeEn` / `localeRu` | Built-in string tables — spread these as a base for a new language |
| `getFragmentLabel(type, t \| tag)` | Localized fragment type label |
| `formatLocaleString(template, params)` | Substitute `{placeholders}` |
| `resolveLocalizedLabel(option, t)` | Display text for a quality/subtitle option |
| `LocaleProvider` | Context provider (`locale`, `strings`) |
| `FRAGMENT_LABELS_RU` / `FRAGMENT_LABELS_EN` | **Deprecated** — cannot cover other locales; use `getFragmentLabel` |

Types: `Locale`, `BuiltinLocale`, `LocaleStrings`, `LocaleStringKey`, `LocalizableLabel`.


<a name="architecture"></a>
## Architecture

```mermaid
flowchart TD
    A[Consumer App] --> B[VideoPlayer]
    B --> C[Player.Provider]
    C --> L[LocaleProvider]
    L --> FS[FragmentSettingsProvider]
    FS --> D[Player.Container]
    D --> C1[ContentSelector]
    C1 --> C1A[Season]
    C1 --> C1B[Episode]
    C1 --> C1C[Voiceover]
    D --> E[HlsVideo / Video]
    D --> F[Poster]
    D --> FR[FragmentMarkers]
    D --> SB[SkipFragmentButton]
    D --> G[Controls]
    G --> H[PlayButton]
    G --> I[TimeSlider]
    I --> FR
    G --> J[SettingsMenu]
    J --> J1[Quality]
    J --> J2[Subtitles]
    J --> J3[Speed]
    J --> J4[Fragments]
    J --> J5[Audio]
    G --> K[VolumePopover]
    G --> L2[CastButton]
    G --> M[FullscreenButton]
    D --> N[AudioChain]
    N --> O[MediaElementSourceNode]
    O --> P[DynamicsCompressorNode]
    P --> Q[GainNode]
    Q --> R[AudioContext.destination]
    D --> S[Hotkeys / Gestures]
    D --> T[StatusIndicator / SeekIndicator]
    D --> RP[ResumePrompt / PlaybackStateManager]
```


<a name="browser-support"></a>
## Browser Support

| Browser | Supported |
|---|---|
| Chrome | ✅ 90+ |
| Firefox | ✅ 90+ |
| Safari | ✅ 15+ |
| Edge (Chromium) | ✅ 90+ |
| iOS Safari | ✅ 15+ |
| Android Chrome | ✅ 90+ |


<a name="development"></a>
## Development

### Setup

```bash
npm ci
npm run dev
```

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Build React library (JS + CSS + types) |
| `npm run build:standalone` | Build WC (self-contained, ~263 kB gzip) |
| `npm run build:standalone:thin` | Build WC (React external, ~206 kB gzip) |
| `npm run build:all` | Build everything |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Typecheck all projects (`tsc -b`) |
| `npm test` | Run the Vitest suite once |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:coverage` | Vitest with coverage |

### ENV Configuration (demo app)

```dotenv
VITE_VIDEO_SRC=https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8
VITE_POSTER_SRC=
VITE_THUMBNAIL_STORYBOARD_SRC=
```

### Docker

```bash
docker compose up --build
```

Host port can be set with `VITE_PORT`:

```bash
VITE_PORT=4173 docker compose up --build
```


<a name="contributing-a-locale"></a>
## Contributing a locale

Translations are very welcome, and adding one is a **two-file change**.
For branching, tests, and the release process see [CONTRIBUTING.md](CONTRIBUTING.md).

### 1. Copy the reference table

`src/skins/default/locales/en.ts` is the reference. Copy it to your language tag
and translate every value:

```bash
cp src/skins/default/locales/en.ts src/skins/default/locales/de.ts
```

```ts
// src/skins/default/locales/de.ts
import type {LocaleStrings} from './strings';

export const localeDe: LocaleStrings = {
  commonAuto: 'Automatisch',
  commonBack: 'Zurück',
  // …every remaining key
};
```

Keep `{placeholders}` intact — `{minutes}`, `{seconds}`, `{time}`, `{index}` are
substituted at runtime. You may move them, but not rename or drop them:

```ts
resumeContinueFrom: 'Ab {time} fortsetzen?',   // ✅
resumeContinueFrom: 'Fortsetzen?',            // ❌ loses {time}
```

### 2. Register it

Add one import and one entry in `src/skins/default/locales/registry.ts`:

```ts
import {localeDe} from './de';

const BUILTIN_LOCALES = {
  en: localeEn,
  ru: localeRu,
  de: localeDe,        // ← your line
} satisfies Record<string, LocaleStrings>;
```

That is the whole change. No component, type, or export needs touching — the
`Locale` type accepts any registered tag.

### 3. Let the checks review your translation

```bash
npm run typecheck && npm test
```

Between them these catch every common mistake:

| Mistake | Caught by |
|---|---|
| Missing a key | `typecheck` — `satisfies` rejects the table |
| Typo in a key name | `typecheck` — unknown property |
| Empty or whitespace-only value | `npm test` |
| Dropped or renamed `{placeholder}` | `npm test` |
| A UI option left untranslated | `npm test` |

A failure names the exact keys, for example:

```
locale "de" › keeps the same {placeholders} as the reference
  - [{ key: 'resumeContinueFrom', expected: ['time'], actual: [] }]
```

### Notes for translators

- **Only UI chrome is translated.** Season names, episode titles, voiceover
  names, and subtitle track names come from your content or the media file and
  are never touched.
- **`commonOff` vs `subtitlesOff` vs `normalizationOff`** are separate keys on
  purpose — many languages need different wording per context, even where
  English repeats "Off".
- **Prefer short labels.** These render in a compact menu; long strings wrap.
- Numeric labels (`volumeBoost150` → `150%`) usually stay as they are.

Add your locale to the `🌐 Localization` row in the capability table too, so it
shows up in the feature list.


<a name="related"></a>
## Related

| Project | Description |
|---|---|
| [evade-player](https://github.com/evadepw/evade-player) | Frontend video player by Alukkart |
| [evadeplayer-platform](https://github.com/leo-need-more-coffee/evadeplayer-platform) | Go backend by leo-need-more-coffee — upload, transcode to HLS, signed URLs |


<a name="license"></a>
## License

[MIT](LICENSE)
