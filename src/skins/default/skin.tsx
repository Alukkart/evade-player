'use client';

import {type CSSProperties, type ReactNode, useEffect, useMemo, useState} from 'react';
import {
    CaptionsOffIcon,
    CaptionsOnIcon,
    CastEnterIcon,
    CastExitIcon,
    ChevronIcon,
    FullscreenEnterIcon,
    FullscreenExitIcon,
    PauseIcon,
    PipEnterIcon,
    PipExitIcon,
    PlayIcon,
    RestartIcon,
    SpinnerIcon,
    VolumeHighIcon,
    VolumeLowIcon,
    VolumeOffIcon
} from '@videojs/react/icons';
import {
    Poster,
    Container,
    BufferingIndicator,
    CastButton,
    Controls,
    ErrorDialog,
    FullscreenButton,
    Gesture,
    Hotkey,
    PlayButton,
    SeekIndicator,
    Slider,
    StatusAnnouncer,
    StatusIndicator,
    Time,
    TimeSlider,
    Tooltip,
    VolumeIndicator,
    type RenderProp
} from '@videojs/react';
import {Video} from '@videojs/react/video';
import {HlsVideo} from '@videojs/react/media/hls-video';
import {Button} from './components/button';
import {VolumePopover} from './components/volume-popover';
import {SettingsMenu} from './components/settings-menu';
import {VolumeProcessor} from './components/volume-processor';
import type {
    Fragment,
    FragmentSettings,
    PlaybackErrorDetail,
    PlaybackState,
    QualityOption,
    SeasonOption
} from './types';
import {isHlsSource, isRenderProp, isString} from './utils';
import {Player} from './player';
import {ContentSelector} from './components/content-selector';
import {PlaybackStateManager} from './components/playback-state-manager';
import {PlaybackErrorReporter} from './components/playback-error-reporter';
import {NextEpisodePrompt} from './components/next-episode-prompt';
import {FragmentMarkers, SkipFragmentButton} from './components/fragment-controls';
import {FragmentSettingsProvider} from './components/fragment-settings-context';
import {type Locale, type LocaleStrings} from './locales';
import {LocaleProvider, useLocaleStrings} from './components/locale-context';
import {LayoutIndependentHotkeys} from './components/layout-independent-hotkeys';

import './skin.css';

const TOP_STATUS_ACTIONS = ['toggleSubtitles', 'toggleFullscreen', 'togglePictureInPicture'] as const;

const CENTER_STATUS_ACTIONS = ['togglePaused'] as const;

const SEEK_TIME = 10;
const CAPTION_LINE_OFFSET = -3;

function CaptionLineOffset(): null {
    const media = Player.useMedia();

    useEffect(() => {
        const mediaElement = media as HTMLMediaElement | null;
        if (!mediaElement?.textTracks) {
            return;
        }

        const textTracks = mediaElement.textTracks;

        const applyCueLineOffset = () => {
            for (const track of Array.from(textTracks) as TextTrack[]) {
                if (track.kind !== 'subtitles' && track.kind !== 'captions') {
                    continue;
                }

                const cues = track.cues ? Array.from(track.cues) as VTTCue[] : [];
                for (const cue of cues) {
                    if ('line' in cue && cue.line !== CAPTION_LINE_OFFSET) {
                        try {
                            cue.line = CAPTION_LINE_OFFSET;
                        } catch {
                            // Ignore cues that do not allow runtime line updates.
                        }
                    }
                }
            }
        };

        applyCueLineOffset();

        const onTrackEvent = () => applyCueLineOffset();
        textTracks.addEventListener('addtrack', onTrackEvent);
        textTracks.addEventListener('change', onTrackEvent);

        const intervalId = window.setInterval(applyCueLineOffset, 1000);

        return () => {
            textTracks.removeEventListener('addtrack', onTrackEvent);
            textTracks.removeEventListener('change', onTrackEvent);
            window.clearInterval(intervalId);
        };
    }, [media]);

    return null;
}

function LocalizedErrorDialog({errorDescription}: {errorDescription?: string}): ReactNode {
    const t = useLocaleStrings();
    return (
        <ErrorDialog.Root>
            <ErrorDialog.Popup className="media-error">
                <div className="media-error__dialog media-surface">
                    <div className="media-error__content">
                        <ErrorDialog.Title className="media-error__title">{t.errorTitle}</ErrorDialog.Title>
                        <ErrorDialog.Description className="media-error__description">
                            {errorDescription}
                        </ErrorDialog.Description>
                    </div>
                    <div className="media-error__actions">
                        <ErrorDialog.Close className="media-button media-button--primary">{t.commonOk}</ErrorDialog.Close>
                    </div>
                </div>
            </ErrorDialog.Popup>
        </ErrorDialog.Root>
    );
}

function extractSeasonFromEpisode(episode?: string): string | undefined {
    if (!episode) return undefined;
    const match = episode.match(/^(s\d+)/i);
    return match?.[1]?.toLowerCase();
}

function resolveSrcFromHierarchy(
    seasons: SeasonOption[] | undefined,
    episodeValue: string | undefined,
    voiceoverValue: string | undefined
): string | undefined {
    if (!seasons || !episodeValue) return undefined;

    for (const s of seasons) {
        for (const ep of s.episodes ?? []) {
            if (ep.value === episodeValue) {
                if (voiceoverValue) {
                    const vo = ep.voiceovers?.find((v) => v.value === voiceoverValue);
                    if (vo?.src) return vo.src;
                }
                if (ep.src) return ep.src;
            }
        }
    }
    return undefined;
}

export interface VideoPlayerProps {
    /** Video source URL (HLS or progressive). */
    src: string;
    /** Available quality variants for manual selection. */
    qualities?: QualityOption[];
    /** Inline styles on the player container. */
    style?: CSSProperties;
    /** Additional CSS class on the player container. */
    className?: string;
    /** Poster image URL or render prop. */
    poster?: string | RenderProp<Poster.State> | undefined;
    /** JSON endpoint returning thumbnail storyboard data for timeline previews. */
    thumbnailStoryboardSrc?: string;
    /** Custom error message shown in the error dialog. */
    errorDescription?: string;
    /** Season/episode/voiceover hierarchy for content navigation. */
    seasons?: SeasonOption[];
    /** Currently selected season value. Derived from `currentEpisode` when omitted. */
    currentSeason?: string;
    /** Currently selected episode value (e.g. `"s1e3"`). */
    currentEpisode?: string;
    /** Currently selected voiceover/dub value. */
    currentVoiceover?: string;
    /** Called when the user selects a different season. */
    onSeasonChange?: (value: string) => void;
    /** Called when the user selects a different episode. */
    onEpisodeChange?: (value: string) => void;
    /** Called when the user selects a different voiceover. */
    onVoiceoverChange?: (value: string) => void;
    /** External playback state to restore (position, episode, etc.). */
    savedState?: PlaybackState | null;
    /** Called when the player wants to persist playback state. */
    onSaveState?: (state: PlaybackState) => void;
    /**
     * Called when playback fails. Fires for recovered errors too — check
     * `fatal` before reacting. A `status` of `401`/`403` on a fatal error is
     * the signal to fetch a fresh signed source and swap `src`.
     */
    onPlaybackError?: (error: PlaybackErrorDetail) => void;
    /** Fragment segments (opening, ending, preview, compilation) to mark on the timeline. */
    fragments?: Fragment[];
    /** Default auto-skip settings for fragment types. */
    fragmentSettings?: Partial<FragmentSettings>;
    /**
     * UI language. Built in: `"en"` (default) and `"ru"`. Any tag registered
     * with `registerLocale` also works; unknown tags fall back to English.
     */
    locale?: Locale;
    /**
     * Overrides for individual UI strings, merged over the active locale. Use
     * this to reword a few labels or to supply a language you have not
     * registered globally.
     */
    localeStrings?: Partial<LocaleStrings>;
}

interface StoryboardThumbnailApiItem {
    url: string;
    start_time: number;
    end_time?: number;
    width?: number;
    height?: number;
    coords?: { x: number; y: number };
}

interface StoryboardThumbnailItem {
    url: string;
    startTime: number;
    endTime?: number;
    width?: number;
    height?: number;
    coords?: { x: number; y: number };
}

/**
 * Full-featured video player with HLS streaming, accessible controls,
 * audio processing, content navigation, and fragment skip support.
 *
 * @example
 * ```tsx
 * import { VideoPlayer } from 'evade-player';
 * import 'evade-player/skins/default/skin.css';
 *
 * <VideoPlayer
 *   src="https://example.com/master.m3u8"
 *   poster="https://example.com/poster.jpg"
 *   qualities={[
 *     { label: '1080p', src: 'https://example.com/1080.m3u8' },
 *     { label: '720p',  src: 'https://example.com/720.m3u8' },
 *   ]}
 *   seasons={[{
 *     label: 'Season 1',
 *     value: 's1',
 *     episodes: [{
 *       label: 'Episode 1',
 *       value: 's1e1',
 *       voiceovers: [
 *         { label: 'Russian', value: 'ru' },
 *         { label: 'English', value: 'en' },
 *       ],
 *     }],
 *   }]}
 *   currentSeason="s1"
 *   currentEpisode="s1e1"
 *   currentVoiceover="ru"
 *   fragments={[
 *     { type: 'opening', startTime: 0, endTime: 90 },
 *     { type: 'ending', startTime: 1380, endTime: 1440 },
 *   ]}
 *   locale="en"
 *   onSeasonChange={(s) => console.log('Season:', s)}
 *   onEpisodeChange={(e) => console.log('Episode:', e)}
 *   onVoiceoverChange={(v) => console.log('Voiceover:', v)}
 * />
 * ```
 */
export function VideoPlayer({
    src: explicitSrc,
    qualities,
    className,
    poster,
    thumbnailStoryboardSrc,
    errorDescription,
    seasons,
    currentSeason,
    currentEpisode,
    currentVoiceover,
    onSeasonChange,
    onEpisodeChange,
    onVoiceoverChange,
    savedState,
    onSaveState,
    onPlaybackError,
    fragments,
    fragmentSettings: fragmentSettingsProp,
    locale,
    localeStrings,
    ...rest
}: VideoPlayerProps): ReactNode {
    const resolvedSeason: string | undefined = currentSeason ?? extractSeasonFromEpisode(currentEpisode);

    // Resolve effective src from hierarchy, fallback to explicit prop
    const effectiveSrc = resolveSrcFromHierarchy(seasons, currentEpisode, currentVoiceover) ?? explicitSrc;
    const isHls = isHlsSource(effectiveSrc);
    const [storyboardItems, setStoryboardItems] = useState<StoryboardThumbnailApiItem[] | null>(null);

    useEffect(() => {
        if (!thumbnailStoryboardSrc) {
            return;
        }

        const controller = new AbortController();

        void fetch(thumbnailStoryboardSrc, { signal: controller.signal })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Failed to load storyboard: ${response.status}`);
                }
                return response.json() as Promise<StoryboardThumbnailApiItem[]>;
            })
            .then((payload) => {
                if (!Array.isArray(payload)) {
                    setStoryboardItems(null);
                    return;
                }
                setStoryboardItems(payload);
            })
            .catch((error: unknown) => {
                if (error instanceof Error && error.name === 'AbortError') {
                    return;
                }
                setStoryboardItems(null);
            });

        return () => controller.abort();
    }, [thumbnailStoryboardSrc]);

    const thumbnails = useMemo<StoryboardThumbnailItem[] | undefined>(() => {
        if (!storyboardItems || storyboardItems.length === 0) {
            return undefined;
        }

        return storyboardItems
            .filter((item) => typeof item.url === 'string' && typeof item.start_time === 'number')
            .map((item) => ({
                url: item.url,
                startTime: item.start_time,
                endTime: item.end_time,
                width: item.width,
                height: item.height,
                coords: item.coords
            }));
    }, [storyboardItems]);

    return (
        <Player.Provider>
            <LocaleProvider locale={locale} strings={localeStrings}>
            <FragmentSettingsProvider initialSettings={fragmentSettingsProp}>
            <CaptionLineOffset/>
            <Container className={`media-default-skin media-default-skin--video ${className ?? ''}`} {...rest}>
                <VolumeProcessor/>
                {isHls ? (
                    <HlsVideo
                        src={effectiveSrc}
                        playsInline
                        crossOrigin="anonymous"
                        config={{
                            renderTextTracksNatively: true,
                            enableWebVTT: true,
                            enableCEA708Captions: true
                        }}
                    />
                ) : (
                    <Video src={effectiveSrc} playsInline crossOrigin="anonymous"/>
                )}

                {poster && (
                    <Poster src={isString(poster) ? poster : undefined} render={isRenderProp(poster) ? poster : undefined}/>
                )}

                <BufferingIndicator
                    render={(props) => (
                        <div {...props} className="media-buffering-indicator">
                            <div className="media-surface">
                                <SpinnerIcon className="media-icon"/>
                            </div>
                        </div>
                    )}
                />

                <LocalizedErrorDialog errorDescription={errorDescription}/>

                <PlaybackErrorReporter onPlaybackError={onPlaybackError}/>

                <ContentSelector
                    seasons={seasons}
                    currentSeason={resolvedSeason}
                    currentEpisode={currentEpisode}
                    currentVoiceover={currentVoiceover}
                    onSeasonChange={onSeasonChange}
                    onEpisodeChange={onEpisodeChange}
                    onVoiceoverChange={onVoiceoverChange}
                />

                <PlaybackStateManager
                    src={explicitSrc || effectiveSrc}
                    seasons={seasons}
                    currentSeason={resolvedSeason}
                    currentEpisode={currentEpisode}
                    currentVoiceover={currentVoiceover}
                    savedState={savedState}
                    onSaveState={onSaveState}
                    onSeasonChange={onSeasonChange}
                    onEpisodeChange={onEpisodeChange}
                    onVoiceoverChange={onVoiceoverChange}
                />

                <NextEpisodePrompt
                    seasons={seasons}
                    currentSeason={resolvedSeason}
                    currentEpisode={currentEpisode}
                    currentVoiceover={currentVoiceover}
                    onSeasonChange={onSeasonChange}
                    onEpisodeChange={onEpisodeChange}
                    onVoiceoverChange={onVoiceoverChange}
                />

                <Controls.Root className="media-surface media-controls">
                    <Tooltip.Provider>
                        <div className="media-button-group">
                            <Tooltip.Root side="top">
                                <Tooltip.Trigger
                                    render={
                                        <PlayButton className="media-button--icon media-button--play" render={<Button/>}>
                                            <RestartIcon className="media-icon media-icon--restart"/>
                                            <PlayIcon className="media-icon media-icon--play"/>
                                            <PauseIcon className="media-icon media-icon--pause"/>
                                        </PlayButton>
                                    }
                                />
                                <Tooltip.Popup className="media-surface media-tooltip"/>
                            </Tooltip.Root>
                        </div>

                        <div className="media-time-controls">
                            <Time.Value type="current" className="media-time"/>
                            <TimeSlider.Root className="media-slider">
                                <TimeSlider.Track className="media-slider__track">
                                    <TimeSlider.Fill className="media-slider__fill"/>
                                    <TimeSlider.Buffer className="media-slider__buffer"/>
                                    {fragments && <FragmentMarkers fragments={fragments}/>}
                                </TimeSlider.Track>
                                <TimeSlider.Thumb className="media-slider__thumb"/>

                                <div className="media-surface media-preview media-slider__preview">
                                    <Slider.Thumbnail className="media-preview__thumbnail" thumbnails={thumbnails}/>
                                    <TimeSlider.Value type="pointer" className="media-time media-preview__time"/>
                                    <SpinnerIcon className="media-preview__spinner media-icon"/>
                                </div>
                            </TimeSlider.Root>
                            <Time.Value type="duration" className="media-time"/>
                        </div>

                        <div className="media-button-group">
                            <VolumePopover/>

                            <SettingsMenu qualities={qualities} masterSource={explicitSrc || effectiveSrc}/>

                            <Tooltip.Root side="top">
                                <Tooltip.Trigger
                                    render={
                                        <CastButton className="media-button--icon media-button--cast" render={<Button/>}>
                                            <CastEnterIcon className="media-icon media-icon--cast-enter"/>
                                            <CastExitIcon className="media-icon media-icon--cast-exit"/>
                                        </CastButton>
                                    }
                                />
                                <Tooltip.Popup className="media-surface media-tooltip"/>
                            </Tooltip.Root>

                            <Tooltip.Root side="top">
                                <Tooltip.Trigger
                                    render={
                                        <FullscreenButton className="media-button--icon media-button--fullscreen" render={<Button/>}>
                                            <FullscreenEnterIcon className="media-icon media-icon--fullscreen-enter"/>
                                            <FullscreenExitIcon className="media-icon media-icon--fullscreen-exit"/>
                                        </FullscreenButton>
                                    }
                                />
                                <Tooltip.Popup className="media-surface media-tooltip"/>
                            </Tooltip.Root>
                        </div>
                    </Tooltip.Provider>
                </Controls.Root>

                {fragments && fragments.length > 0 && (
                    <SkipFragmentButton fragments={fragments}/>
                )}

                <div className="media-overlay"/>

                {/* Hotkeys */}
                <LayoutIndependentHotkeys/>
                <Hotkey keys="Space" action="togglePaused"/>
                <Hotkey keys="k" action="togglePaused"/>
                <Hotkey keys="m" action="toggleMuted"/>
                <Hotkey keys="f" action="toggleFullscreen"/>
                <Hotkey keys="c" action="toggleSubtitles"/>
                <Hotkey keys="i" action="togglePictureInPicture"/>
                <Hotkey keys="ArrowRight" action="seekStep" value={SEEK_TIME / 2}/>
                <Hotkey keys="ArrowLeft" action="seekStep" value={-(SEEK_TIME / 2)}/>
                <Hotkey keys="l" action="seekStep" value={SEEK_TIME}/>
                <Hotkey keys="j" action="seekStep" value={-SEEK_TIME}/>
                <Hotkey keys="ArrowUp" action="volumeStep" value={0.05}/>
                <Hotkey keys="ArrowDown" action="volumeStep" value={-0.05}/>
                <Hotkey keys="0-9" action="seekToPercent"/>
                <Hotkey keys="Home" action="seekToPercent" value={0}/>
                <Hotkey keys="End" action="seekToPercent" value={100}/>
                <Hotkey keys=">" action="speedUp"/>
                <Hotkey keys="<" action="speedDown"/>

                {/* Gestures */}
                <Gesture type="tap" action="togglePaused" pointer="mouse" region="center"/>
                <Gesture type="tap" action="toggleControls" pointer="touch"/>
                <Gesture type="doubletap" action="seekStep" value={-SEEK_TIME} region="left"/>
                <Gesture type="doubletap" action="toggleFullscreen" region="center"/>
                <Gesture type="doubletap" action="seekStep" value={SEEK_TIME} region="right"/>

                {/* Input Feedback */}
                <StatusAnnouncer/>
                <div className="media-input-feedback">
                    <VolumeIndicator.Root
                        className="media-surface media-input-feedback-island media-input-feedback-island--volume">
                        <VolumeIndicator.Fill className="media-input-feedback-island__content">
                            <VolumeHighIcon className="media-icon media-icon--volume-high"/>
                            <VolumeLowIcon className="media-icon media-icon--volume-low"/>
                            <VolumeOffIcon className="media-icon media-icon--volume-off"/>
                            <VolumeIndicator.Value className="media-input-feedback-island__value"/>
                        </VolumeIndicator.Fill>
                    </VolumeIndicator.Root>

                    <StatusIndicator.Root
                        actions={TOP_STATUS_ACTIONS}
                        className="media-surface media-input-feedback-island media-input-feedback-island--status"
                    >
                        <div className="media-input-feedback-island__content">
                            <CaptionsOnIcon className="media-icon media-icon--captions-on"/>
                            <CaptionsOffIcon className="media-icon media-icon--captions-off"/>
                            <FullscreenEnterIcon className="media-icon media-icon--fullscreen-enter"/>
                            <FullscreenExitIcon className="media-icon media-icon--fullscreen-exit"/>
                            <PipEnterIcon className="media-icon media-icon--pip-enter"/>
                            <PipExitIcon className="media-icon media-icon--pip-exit"/>
                            <StatusIndicator.Value className="media-input-feedback-island__value"/>
                        </div>
                    </StatusIndicator.Root>

                    <SeekIndicator.Root className="media-input-feedback-bubble">
                        <ChevronIcon className="media-icon media-icon--seek"/>
                        <SeekIndicator.Value className="media-time"/>
                    </SeekIndicator.Root>

                    <StatusIndicator.Root actions={CENTER_STATUS_ACTIONS} className="media-input-feedback-bubble">
                        <PlayIcon className="media-icon media-icon--play"/>
                        <PauseIcon className="media-icon media-icon--pause"/>
                    </StatusIndicator.Root>
                </div>
            </Container>
            </FragmentSettingsProvider>
            </LocaleProvider>
        </Player.Provider>
    );
}
