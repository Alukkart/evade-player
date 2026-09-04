import {createRoot, type Root} from 'react-dom/client';
import {VideoPlayer} from './skins/default/skin';
import type {VideoPlayerProps} from './skins/default/skin';
import type {
    Fragment,
    FragmentSettings,
    PlaybackErrorDetail,
    PlaybackState,
    QualityOption,
    SeasonOption,
} from './skins/default/types';
import type {Locale} from './skins/default/locales';

const OBSERVED_ATTRIBUTES = [
    'src',
    'poster',
    'thumbnail-storyboard-src',
    'error-description',
    'current-season',
    'current-episode',
    'current-voiceover',
    'locale',
    'fragments',
    'fragment-settings',
    'qualities',
    'seasons',
] as const;

/**
 * Media element events re-dispatched from the host element, so consumers can
 * listen on `<evade-player>` the same way they would on `<video>`.
 */
const FORWARDED_MEDIA_EVENTS = [
    'loadedmetadata',
    'durationchange',
    'play',
    'playing',
    'pause',
    'waiting',
    'seeking',
    'seeked',
    'timeupdate',
    'volumechange',
    'ratechange',
    'ended',
    'error',
] as const;

/**
 * How long a `reload()` waits for the replacement source to report metadata
 * before giving up on restoring the position.
 */
const RELOAD_SEEK_TIMEOUT = 30_000;

/** Options accepted by {@link EvadePlayerElement.reload}. */
export interface ReloadOptions {
    /**
     * Position in seconds to resume from. Defaults to the position the player
     * is at when `reload()` is called.
     */
    time?: number;
}

export class EvadePlayerElement extends HTMLElement {
    static get observedAttributes(): string[] {
        return OBSERVED_ATTRIBUTES as unknown as string[];
    }

    #root: Root | null = null;
    #mount: HTMLDivElement;

    #qualities: QualityOption[] | undefined;
    #seasons: SeasonOption[] | undefined;
    #fragments: Fragment[] | undefined;
    #fragmentSettings: Partial<FragmentSettings> | undefined;
    #savedState: PlaybackState | null | undefined;
    #className: string | undefined;

    #pendingSeek: {time: number; resumePlayback: boolean} | null = null;
    #pendingSeekTimer: number | undefined;
    #suppressResume = false;

    constructor() {
        super();
        this.#mount = document.createElement('div');
        this.#mount.style.width = '100%';
        this.#mount.style.height = '100%';
    }

    connectedCallback(): void {
        this.appendChild(this.#mount);
        // Media events do not bubble, so capture them on the way down.
        for (const type of FORWARDED_MEDIA_EVENTS) {
            this.#mount.addEventListener(type, this.#forwardMediaEvent, true);
        }
        this.#render();
    }

    disconnectedCallback(): void {
        for (const type of FORWARDED_MEDIA_EVENTS) {
            this.#mount.removeEventListener(type, this.#forwardMediaEvent, true);
        }
        this.#disarmReloadSeek();
        this.#root?.unmount();
        this.#root = null;
    }

    #forwardMediaEvent = (event: Event): void => {
        const media = event.target;
        if (!(media instanceof HTMLMediaElement)) return;

        this.dispatchEvent(new CustomEvent(event.type, {
            detail: {
                currentTime: media.currentTime,
                duration: Number.isFinite(media.duration) ? media.duration : null,
                paused: media.paused,
                ended: media.ended,
                volume: media.volume,
                muted: media.muted,
                playbackRate: media.playbackRate,
                ...(media.error && {
                    error: {code: media.error.code, message: media.error.message},
                }),
            },
        }));
    };

    attributeChangedCallback(_name: string, _old: string | null, _value: string | null): void {
        if (_old !== _value) {
            this.#render();
        }
    }

    // --- Primitive props (via HTML attributes) ---

    get src(): string {
        return this.getAttribute('src') || '';
    }
    set src(value: string) {
        this.setAttribute('src', value);
    }

    get poster(): string | undefined {
        return this.getAttribute('poster') || undefined;
    }
    set poster(value: string | undefined) {
        this.#setAttr('poster', value);
    }

    get thumbnailStoryboardSrc(): string | undefined {
        return this.getAttribute('thumbnail-storyboard-src') || undefined;
    }
    set thumbnailStoryboardSrc(value: string | undefined) {
        this.#setAttr('thumbnail-storyboard-src', value);
    }

    get errorDescription(): string | undefined {
        return this.getAttribute('error-description') || undefined;
    }
    set errorDescription(value: string | undefined) {
        this.#setAttr('error-description', value);
    }

    get currentSeason(): string | undefined {
        return this.getAttribute('current-season') || undefined;
    }
    set currentSeason(value: string | undefined) {
        this.#setAttr('current-season', value);
    }

    get currentEpisode(): string | undefined {
        return this.getAttribute('current-episode') || undefined;
    }
    set currentEpisode(value: string | undefined) {
        this.#setAttr('current-episode', value);
    }

    get currentVoiceover(): string | undefined {
        return this.getAttribute('current-voiceover') || undefined;
    }
    set currentVoiceover(value: string | undefined) {
        this.#setAttr('current-voiceover', value);
    }

    get locale(): Locale | undefined {
        // Any registered tag is valid; unknown tags fall back inside the player.
        return this.getAttribute('locale') || undefined;
    }
    set locale(value: Locale | undefined) {
        this.#setAttr('locale', value);
    }

    // --- Complex props (via JS properties or JSON attributes) ---

    get qualities(): QualityOption[] | undefined {
        return this.#qualities;
    }
    set qualities(value: QualityOption[] | undefined) {
        this.#qualities = value;
        this.#render();
    }

    get seasons(): SeasonOption[] | undefined {
        return this.#seasons;
    }
    set seasons(value: SeasonOption[] | undefined) {
        this.#seasons = value;
        this.#render();
    }

    get fragments(): Fragment[] | undefined {
        return this.#fragments;
    }
    set fragments(value: Fragment[] | undefined) {
        this.#fragments = value;
        this.#render();
    }

    get fragmentSettings(): Partial<FragmentSettings> | undefined {
        return this.#fragmentSettings;
    }
    set fragmentSettings(value: Partial<FragmentSettings> | undefined) {
        this.#fragmentSettings = value;
        this.#render();
    }

    // --- JSON attribute helpers ---

    #parseFragments(): Fragment[] | undefined {
        if (this.#fragments) return this.#fragments;
        return this.#parseJsonAttribute<Fragment[]>('fragments');
    }

    #parseFragmentSettings(): Partial<FragmentSettings> | undefined {
        if (this.#fragmentSettings) return this.#fragmentSettings;
        return this.#parseJsonAttribute<Partial<FragmentSettings>>('fragment-settings');
    }

    #parseQualities(): QualityOption[] | undefined {
        if (this.#qualities) return this.#qualities;
        return this.#parseJsonAttribute<QualityOption[]>('qualities');
    }

    #parseSeasons(): SeasonOption[] | undefined {
        if (this.#seasons) return this.#seasons;
        return this.#parseJsonAttribute<SeasonOption[]>('seasons');
    }

    #parseJsonAttribute<T>(name: string): T | undefined {
        const raw = this.getAttribute(name);
        if (!raw) return undefined;
        try { return JSON.parse(raw) as T; } catch { return undefined; }
    }

    get savedState(): PlaybackState | null | undefined {
        return this.#savedState;
    }
    set savedState(value: PlaybackState | null | undefined) {
        this.#savedState = value;
        // An explicitly supplied state is a fresh instruction to restore it,
        // which outranks the suppression a preceding `reload()` put in place.
        this.#suppressResume = false;
        this.#render();
    }

    get playerClass(): string | undefined {
        return this.#className;
    }
    set playerClass(value: string | undefined) {
        this.#className = value;
        this.#render();
    }

    // --- Imperative API ---

    /**
     * Swap the source without recreating the element, keeping the position and
     * the whole UI state — chosen voiceover, quality, volume, fullscreen.
     *
     * Intended for signed manifests: when `playbackerror` reports a fatal
     * failure with status `401`/`403`, fetch a freshly signed URL and hand it
     * over here instead of remounting the player.
     *
     * The position is restored once the replacement source reports metadata,
     * and playback resumes if it was running when `reload()` was called.
     *
     * @param src - The replacement source URL. Must differ from the current
     *   one: an identical URL leaves the underlying engine untouched.
     * @param options - `time` overrides the position to resume from.
     */
    reload(src: string, options?: ReloadOptions): void {
        const media = this.#mount.querySelector('video');
        const requested = options?.time;
        const time = typeof requested === 'number' && Number.isFinite(requested) && requested >= 0
            ? requested
            : (media?.currentTime ?? 0);

        this.#armReloadSeek(time, media ? !media.paused : false);

        // The replacement source must not bring the "resume where you left
        // off" prompt back up: the position is being restored here instead.
        this.#suppressResume = true;

        if (src && src !== this.getAttribute('src')) {
            this.setAttribute('src', src);
        } else {
            this.#render();
        }
    }

    // --- Internal ---

    #armReloadSeek(time: number, resumePlayback: boolean): void {
        this.#disarmReloadSeek();
        if (time <= 0 && !resumePlayback) return;

        this.#pendingSeek = {time, resumePlayback};
        // `loadedmetadata` fires for the replacement source only: the outgoing
        // one already fired its own, so there is no race with the old media.
        this.#mount.addEventListener('loadedmetadata', this.#applyReloadSeek, true);
        this.#pendingSeekTimer = window.setTimeout(() => this.#disarmReloadSeek(), RELOAD_SEEK_TIMEOUT);
    }

    #disarmReloadSeek(): void {
        if (this.#pendingSeekTimer !== undefined) {
            clearTimeout(this.#pendingSeekTimer);
            this.#pendingSeekTimer = undefined;
        }
        this.#pendingSeek = null;
        this.#mount.removeEventListener('loadedmetadata', this.#applyReloadSeek, true);
    }

    #applyReloadSeek = (event: Event): void => {
        const pending = this.#pendingSeek;
        const media = event.target;
        if (!pending || !(media instanceof HTMLMediaElement)) return;

        this.#disarmReloadSeek();

        if (pending.time > 0) {
            try {
                media.currentTime = pending.time;
            } catch { /* the new source may refuse a seek this early */ }
        }
        if (pending.resumePlayback && media.paused) {
            void media.play().catch(() => { /* autoplay may be blocked */ });
        }
    };

    #setAttr(name: string, value: string | undefined | null): void {
        if (value) {
            this.setAttribute(name, value);
        } else {
            this.removeAttribute(name);
        }
    }

    #render(): void {
        if (!this.isConnected) return;

        const a = (name: string): string | undefined =>
            this.getAttribute(name) || undefined;

        const emit = (type: string, detail: unknown): void => {
            this.dispatchEvent(new CustomEvent(type, {detail}));
        };

        // A reload restores the position itself, so the resume prompt stays down
        // until the host hands over a new `savedState`.
        const savedState = this.#suppressResume ? null : this.#savedState;

        const fragments = this.#parseFragments();
        const fragmentSettings = this.#parseFragmentSettings();
        const qualities = this.#parseQualities();
        const seasons = this.#parseSeasons();

        const props: VideoPlayerProps = {
            src: a('src') || '',
            ...(a('poster') && {poster: a('poster')}),
            ...(a('thumbnail-storyboard-src') && {
                thumbnailStoryboardSrc: a('thumbnail-storyboard-src'),
            }),
            ...(a('error-description') && {
                errorDescription: a('error-description'),
            }),
            ...(a('current-season') && {
                currentSeason: a('current-season'),
            }),
            ...(a('current-episode') && {
                currentEpisode: a('current-episode'),
            }),
            ...(a('current-voiceover') && {
                currentVoiceover: a('current-voiceover'),
            }),
            ...(this.locale && {locale: this.locale}),
            ...(this.#className && {className: this.#className}),
            ...(qualities && {qualities}),
            ...(seasons && {seasons}),
            ...(fragments && {fragments}),
            ...(fragmentSettings && {fragmentSettings}),
            ...(savedState !== undefined && {savedState}),
            onSeasonChange: (value: string) =>
                emit('seasonchange', {value}),
            onEpisodeChange: (value: string) =>
                emit('episodechange', {value}),
            onVoiceoverChange: (value: string) =>
                emit('voiceoverchange', {value}),
            onSaveState: (state: PlaybackState) =>
                emit('savestate', {state}),
            onPlaybackError: (error: PlaybackErrorDetail) =>
                emit('playbackerror', error),
        };

        if (!this.#root) {
            this.#root = createRoot(this.#mount);
        }
        this.#root.render(<VideoPlayer {...props} />);
    }

}

customElements.define('evade-player', EvadePlayerElement);
