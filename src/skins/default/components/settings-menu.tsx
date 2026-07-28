import type {ReactNode} from 'react';
import {useEffect, useMemo, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {Menu, useMedia, usePlayer} from '@videojs/react';
import {Captions, Check, ChevronLeft, Fullscreen, Gauge, Moon, Settings, Timer, Volume2} from 'lucide-react';
import {Button} from './button';
import {SubtitleSettingsContent} from './subtitle-settings';
import {
    AUTO_QUALITY_VALUE,
    SUBTITLES_OFF_VALUE,
    DEFAULT_SUBTITLE_APPEARANCE,
    DEFAULT_VOLUME_BOOST,
    DEFAULT_NORMALIZATION,
    DEFAULT_FULLSCREEN_SCALE,
    FULLSCREEN_SCALE_OPTIONS,
    NORMALIZATION_OPTIONS,
    SLEEP_TIMER_OFF_VALUE,
    SLEEP_TIMER_OPTIONS,
    SUBTITLE_BG_OPTIONS,
    SUBTITLE_COLOR_OPTIONS,
    SUBTITLE_EDGE_STYLE_OPTIONS,
    SUBTITLE_FONT_FAMILY_OPTIONS,
    SUBTITLE_FONT_SIZE_OPTIONS,
    SUBTITLE_POSITION_OPTIONS,
    VOLUME_BOOST_OPTIONS,
    FRAGMENT_COLORS,
    type FragmentSettings,
    type FragmentType,
    type QualityOption,
    type SettingsView,
    type SubtitleAppearance,
    type SubtitleSettingsView,
    type FullscreenScale,
} from '../types';
import {applyVolumeBoost, applyNormalization} from './audio-chain';
import {loadPlayerSettings, savePlayerSettings} from '../utils/settings-persistence';
import {useFragmentSettings} from './fragment-settings-context';
import {
    getFragmentLabel,
    getVolumeBoostLabel,
    getNormalizationLabel,
    getFullscreenScaleLabel,
    getSleepTimerLabel,
    resolveLocalizedLabel,
    type LocalizableLabel,
    type LocaleStrings,
} from '../locales';
import {useLocaleStrings} from './locale-context';
import {
    buildQualityMenuOptions,
    getActiveSubtitleValue,
    getQualityOptions,
    getSubtitleOptions,
    getSubtitleTrackValue,
    isHlsSource,
    parseHlsMasterPlaylist,
    resolveActiveQualityValue
} from '../utils';

function isMenuActionKey(key: string): boolean {
    return key === 'Enter' || key === ' ';
}

/** Localized label of the currently selected option, or `fallback` if none matches. */
function activeOptionLabel<T extends LocalizableLabel & {value: string}>(
    options: readonly T[],
    value: string,
    t: LocaleStrings,
    fallback: string
): string {
    const active = options.find((option) => option.value === value);
    return active ? resolveLocalizedLabel(active, t) : fallback;
}

function formatSleepTimerRemaining(ms: number): string {
    const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function SettingsMenu({qualities, masterSource}: { qualities?: QualityOption[]; masterSource: string }): ReactNode {
    const store = usePlayer() as unknown as {
        loadSource: (src: string) => string;
        seek: (time: number) => number;
        play: () => Promise<void>;
        setPlaybackRate: (rate: number) => void;
    };
    const media = useMedia() as HTMLMediaElement | null;
    const source = usePlayer((s) => (s as { source: string | null }).source);
    const currentTime = usePlayer((s) => (s as { currentTime: number }).currentTime);
    const paused = usePlayer((s) => (s as { paused: boolean }).paused);
    const playbackRate = usePlayer((s) => (s as { playbackRate: number }).playbackRate);
    const playbackRates = usePlayer((s) => (s as { playbackRates?: readonly number[] }).playbackRates ?? []);
    const [manifestQualities, setManifestQualities] = useState<QualityOption[]>([]);
    const [tracksVersion, setTracksVersion] = useState(0);

    useEffect(() => {
        let cancelled = false;

        if (qualities && qualities.length > 0) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setManifestQualities([]);
            return () => {
                cancelled = true;
            };
        }

        if (!isHlsSource(masterSource)) {
            setManifestQualities([]);
            return () => {
                cancelled = true;
            };
        }

        fetch(masterSource)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Failed to fetch playlist: ${response.status}`);
                }
                return response.text();
            })
            .then((text) => {
                if (cancelled) return;
                setManifestQualities(parseHlsMasterPlaylist(masterSource, text));
            })
            .catch(() => {
                if (cancelled) return;
                setManifestQualities([]);
            });

        return () => {
            cancelled = true;
        };
    }, [qualities, masterSource]);

    useEffect(() => {
        if (!media?.textTracks) return;
        const trackList = media.textTracks;
        const onChange = () => setTracksVersion((value) => value + 1);

        trackList.addEventListener('change', onChange);
        trackList.addEventListener('addtrack', onChange);
        trackList.addEventListener('removetrack', onChange);

        return () => {
            trackList.removeEventListener('change', onChange);
            trackList.removeEventListener('addtrack', onChange);
            trackList.removeEventListener('removetrack', onChange);
        };
    }, [media]);

    const baseOptions = useMemo(
        () => getQualityOptions(qualities && qualities.length > 0 ? qualities : manifestQualities, source),
        [qualities, manifestQualities, source]
    );
    const qualityOptions = useMemo(() => buildQualityMenuOptions(baseOptions, masterSource), [baseOptions, masterSource]);
    const subtitleOptions = useMemo(() => getSubtitleOptions(media), [media, tracksVersion]); // eslint-disable-line react-hooks/exhaustive-deps
    const speedOptions = useMemo(
        () => playbackRates.map((rate) => ({value: String(rate), label: `${rate}x`, disabled: false})),
        [playbackRates]
    );
    const speedValue = String(playbackRate);
    const [view, setView] = useState<SettingsView>('root');
    const [subSettingsView, setSubSettingsView] = useState<SubtitleSettingsView | null>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);

    const initialSettings = loadPlayerSettings();

    const [subtitleAppearance, setSubtitleAppearance] = useState<SubtitleAppearance>(
        initialSettings?.subtitleAppearance ?? DEFAULT_SUBTITLE_APPEARANCE
    );
    const [volumeBoost, setVolumeBoost] = useState<string>(
        initialSettings?.volumeBoost ?? DEFAULT_VOLUME_BOOST
    );
    const [normalization, setNormalization] = useState<string>(
        initialSettings?.normalization ?? DEFAULT_NORMALIZATION
    );
    const [fullscreenScale, setFullscreenScale] = useState<FullscreenScale>(
        initialSettings?.fullscreenScale ?? DEFAULT_FULLSCREEN_SCALE
    );
    const [sleepTimerValue, setSleepTimerValue] = useState<string>(SLEEP_TIMER_OFF_VALUE);
    const [sleepTimerEndsAt, setSleepTimerEndsAt] = useState<number | null>(null);
    const [sleepTimerRemainingMs, setSleepTimerRemainingMs] = useState(0);

    // Restore volume boost and normalization on mount
    useEffect(() => {
        if (initialSettings?.volumeBoost && initialSettings.volumeBoost !== DEFAULT_VOLUME_BOOST) {
            const option = VOLUME_BOOST_OPTIONS.find((o) => o.value === initialSettings!.volumeBoost);
            if (option) applyVolumeBoost(parseFloat(option.css));
        }
        if (initialSettings?.normalization && initialSettings.normalization !== DEFAULT_NORMALIZATION) {
            applyNormalization(initialSettings.normalization);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Persist settings on change
    useEffect(() => {
        savePlayerSettings({subtitleAppearance, volumeBoost, normalization, fullscreenScale});
    }, [subtitleAppearance, volumeBoost, normalization, fullscreenScale]);

    useEffect(() => {
        const container = document.querySelector('.media-default-skin') as HTMLElement | null;
        if (!container) return;

        const option = FULLSCREEN_SCALE_OPTIONS.find((o) => o.value === fullscreenScale);
        container.style.setProperty('--media-fullscreen-object-fit', option?.css ?? 'contain');
    }, [fullscreenScale]);

    useEffect(() => {
        if (!sleepTimerEndsAt) return;

        const updateRemaining = () => {
            setSleepTimerRemainingMs(Math.max(0, sleepTimerEndsAt - Date.now()));
        };

        updateRemaining();

        const timeoutId = window.setTimeout(() => {
            media?.pause();
            setSleepTimerValue(SLEEP_TIMER_OFF_VALUE);
            setSleepTimerEndsAt(null);
            setSleepTimerRemainingMs(0);
        }, Math.max(0, sleepTimerEndsAt - Date.now()));

        const intervalId = window.setInterval(updateRemaining, 1000);

        return () => {
            window.clearTimeout(timeoutId);
            window.clearInterval(intervalId);
        };
    }, [media, sleepTimerEndsAt]);

    useEffect(() => {
        const container = document.querySelector('.media-default-skin') as HTMLElement | null;
        if (!container) return;

        const fontSizeCss = SUBTITLE_FONT_SIZE_OPTIONS.find((o) => o.value === subtitleAppearance.fontSize)?.css ?? '1.1rem';
        const textColorCss = SUBTITLE_COLOR_OPTIONS.find((o) => o.value === subtitleAppearance.textColor)?.css ?? '#FFF';
        const textBgCss = SUBTITLE_BG_OPTIONS.find((o) => o.value === subtitleAppearance.textBg)?.css ?? 'rgba(0,0,0,0.8)';
        const edgeStyleCss = SUBTITLE_EDGE_STYLE_OPTIONS.find((o) => o.value === subtitleAppearance.edgeStyle)?.css ?? 'none';
        const fontFamilyCss = SUBTITLE_FONT_FAMILY_OPTIONS.find((o) => o.value === subtitleAppearance.fontFamily)?.css ?? 'sans-serif';
        const positionCss = SUBTITLE_POSITION_OPTIONS.find((o) => o.value === subtitleAppearance.position)?.css ?? '1.5rem';

        container.style.setProperty('--vjs-subtitle-font-size', fontSizeCss);
        container.style.setProperty('--vjs-subtitle-color', textColorCss);
        container.style.setProperty('--vjs-subtitle-bg', textBgCss);
        container.style.setProperty('--vjs-subtitle-edge-style', edgeStyleCss);
        container.style.setProperty('--vjs-subtitle-font-family', fontFamilyCss);
        container.style.setProperty('--vjs-subtitle-offset', positionCss);
    }, [subtitleAppearance]);

    const t = useLocaleStrings();
    const {settings: fragmentSettings, updateSettings} = useFragmentSettings();

    const qualityValue = resolveActiveQualityValue(qualityOptions, source, masterSource);
    const subtitleValue = getActiveSubtitleValue(media);

    async function onQualityChange(nextValue: string): Promise<void> {
        if (!nextValue || nextValue === qualityValue) return;

        const resumeTime = currentTime;
        const shouldResume = !paused;
        const targetSource = nextValue === AUTO_QUALITY_VALUE ? masterSource : qualityOptions.find((option) => option.value === nextValue)?.src;

        if (!targetSource) return;

        store.loadSource(targetSource);

        if (Number.isFinite(resumeTime) && resumeTime > 0) {
            store.seek(resumeTime);
        }

        if (shouldResume) {
            try {
                await store.play();
            } catch {
                // ignore autoplay/playback errors after source switch
            }
        }
    }

    function onSubtitleChange(nextValue: string): void {
        if (!media?.textTracks) return;
        const isOff = nextValue === SUBTITLES_OFF_VALUE;

        Array.from(media.textTracks).forEach((track, index) => {
            if (track.kind !== 'subtitles' && track.kind !== 'captions') return;
            const optionValue = getSubtitleTrackValue(track, index);
            track.mode = !isOff && optionValue === nextValue ? 'showing' : 'disabled';
        });

        // Ensure menu/UI updates even if browser does not emit TextTrackList change immediately.
        setTracksVersion((value) => value + 1);
    }

    function onSpeedChange(nextValue: string): void {
        const nextRate = Number(nextValue);
        if (!Number.isFinite(nextRate) || nextRate <= 0) return;
        store.setPlaybackRate(nextRate);
    }

    function onSleepTimerChange(nextValue: string): void {
        const option = SLEEP_TIMER_OPTIONS.find((item) => item.value === nextValue);
        if (!option) return;

        setSleepTimerValue(option.value);

        if (option.minutes === null) {
            setSleepTimerEndsAt(null);
            setSleepTimerRemainingMs(0);
            return;
        }

        const nextEndsAt = Date.now() + option.minutes * 60 * 1000;
        setSleepTimerEndsAt(nextEndsAt);
        setSleepTimerRemainingMs(nextEndsAt - Date.now());
    }

    function onOpenChange(open: boolean): void {
        if (open) {
            setView('root');
            setSubSettingsView(null);
        }
    }

    function onOpenChangeComplete(open: boolean): void {
        if (!open) {
            // The menu library calls triggerElement.focus() synchronously in onOpenChangeComplete,
            // so we defer the blur to run after it.
            setTimeout(() => triggerRef.current?.blur(), 0);
        }
    }

    function navigateTo(nextView: SettingsView): void {
        setView(nextView);
        setSubSettingsView(null);
    }

    const handleSubtitleAppearanceChange = (update: Partial<SubtitleAppearance>) => {
        setSubtitleAppearance((prev) => ({...prev, ...update}));
        setSubSettingsView(null);
    };

    return (
        <Menu.Root side="top" align="end" onOpenChange={onOpenChange} onOpenChangeComplete={onOpenChangeComplete}>
            <Menu.Trigger
                ref={triggerRef}
                className="media-button--icon media-button--settings"
                render={<Button/>}
                aria-label={t.settingsTrigger}
            >
                <Settings className="media-icon"/>
            </Menu.Trigger>
            <Menu.Content className="media-surface media-popover media-menu media-menu--settings">
                {view === 'root' && (
                    <div className="media-menu__group">
                        {qualityOptions.length > 1 && (
                            <div className="media-menu__item media-menu__item--submenu media-settings__entry" role="menuitem" tabIndex={0}
                                 onClick={() => navigateTo('quality')}
                                 onKeyDown={(event) => {
                                     if (!isMenuActionKey(event.key)) return;
                                     event.preventDefault();
                                     navigateTo('quality');
                                 }}>
                                <span className="media-settings__label">
                                    <Gauge className="media-icon"/>
                                    <span>{t.settingsQuality}</span>
                                </span>
                                <span>{activeOptionLabel(qualityOptions, qualityValue, t, t.commonAuto)}</span>
                            </div>
                        )}
                        {subtitleOptions.length > 1 && (
                            <div className="media-menu__item media-menu__item--submenu media-settings__entry" role="menuitem" tabIndex={0}
                                 onClick={() => navigateTo('subtitles')}
                                 onKeyDown={(event) => {
                                     if (!isMenuActionKey(event.key)) return;
                                     event.preventDefault();
                                     navigateTo('subtitles');
                                 }}>
                                <span className="media-settings__label">
                                    <Captions className="media-icon"/>
                                    <span>{t.settingsSubtitles}</span>
                                </span>
                                <span>{activeOptionLabel(subtitleOptions, subtitleValue, t, t.subtitlesOff)}</span>
                            </div>
                        )}
                        {speedOptions.length > 1 && (
                            <div className="media-menu__item media-menu__item--submenu media-settings__entry" role="menuitem" tabIndex={0}
                                 onClick={() => navigateTo('speed')}
                                 onKeyDown={(event) => {
                                     if (!isMenuActionKey(event.key)) return;
                                     event.preventDefault();
                                     navigateTo('speed');
                                 }}>
                                <span className="media-settings__label">
                                    <Timer className="media-icon"/>
                                    <span>{t.settingsSpeed}</span>
                                </span>
                                <span>{speedValue}x</span>
                            </div>
                        )}
                        <div className="media-menu__item media-menu__item--submenu media-settings__entry" role="menuitem" tabIndex={0}
                             onClick={() => navigateTo('fragments')}
                             onKeyDown={(event) => {
                                 if (!isMenuActionKey(event.key)) return;
                                 event.preventDefault();
                                 navigateTo('fragments');
                             }}>
                            <span className="media-settings__label">
                                <Settings className="media-icon"/>
                                <span>{t.settingsFragments}</span>
                            </span>
                            <span>{Object.values(fragmentSettings).some(Boolean) ? t.commonOn : t.commonOff}</span>
                        </div>
                        <div className="media-menu__item media-menu__item--submenu media-settings__entry" role="menuitem" tabIndex={0}
                             onClick={() => navigateTo('fullscreen-scale')}
                             onKeyDown={(event) => {
                                 if (!isMenuActionKey(event.key)) return;
                                 event.preventDefault();
                                 navigateTo('fullscreen-scale');
                             }}>
                            <span className="media-settings__label">
                                <Fullscreen className="media-icon"/>
                                <span>{t.settingsFullscreenScale}</span>
                            </span>
                            <span>{getFullscreenScaleLabel(fullscreenScale, t)}</span>
                        </div>
                        <div className="media-menu__item media-menu__item--submenu media-settings__entry" role="menuitem" tabIndex={0}
                             onClick={() => navigateTo('sleep-timer')}
                             onKeyDown={(event) => {
                                 if (!isMenuActionKey(event.key)) return;
                                 event.preventDefault();
                                 navigateTo('sleep-timer');
                             }}>
                            <span className="media-settings__label">
                                <Moon className="media-icon"/>
                                <span>{t.settingsSleepTimer}</span>
                            </span>
                            <span>
                                {sleepTimerEndsAt ? formatSleepTimerRemaining(sleepTimerRemainingMs) : getSleepTimerLabel(SLEEP_TIMER_OFF_VALUE, t)}
                            </span>
                        </div>
                        <div className="media-menu__item media-menu__item--submenu media-settings__entry" role="menuitem" tabIndex={0}
                             onClick={() => navigateTo('audio')}
                             onKeyDown={(event) => {
                                 if (!isMenuActionKey(event.key)) return;
                                 event.preventDefault();
                                 navigateTo('audio');
                             }}>
                            <span className="media-settings__label">
                                <Volume2 className="media-icon"/>
                                <span>{t.settingsAudio}</span>
                            </span>
                            <span>{volumeBoost}%</span>
                        </div>
                    </div>
                )}
                {view === 'quality' && (
                    <div className="media-menu__submenu">
                        <div className="media-menu__item media-menu__item--back" role="menuitem" tabIndex={0}
                 aria-label={t.commonBack}
                             onClick={() => navigateTo('root')}
                             onKeyDown={(event) => {
                                 if (!isMenuActionKey(event.key)) return;
                                 event.preventDefault();
                                 navigateTo('root');
                             }}>
                            <span className="media-settings__label">
                                <ChevronLeft className="media-icon"/>
                                <span>{t.settingsQuality}</span>
                            </span>
                        </div>
                        <Menu.RadioGroup className="media-menu__group" value={qualityValue} onValueChange={onQualityChange}
                                         label={t.settingsVideoQuality}>
                            {qualityOptions.map((option) => (
                                <Menu.RadioItem key={option.value} className="media-menu__item" value={option.value}>
                                    <span>{resolveLocalizedLabel(option, t)}</span>
                                    <Menu.ItemIndicator checked={option.value === qualityValue} forceMount className="media-menu__indicator">
                                        <Check className="media-icon"/>
                                    </Menu.ItemIndicator>
                                </Menu.RadioItem>
                            ))}
                        </Menu.RadioGroup>
                    </div>
                )}
                {view === 'subtitles' && (
                    <div className="media-menu__submenu">
                        <div className="media-menu__item media-menu__item--back" role="menuitem" tabIndex={0}
                 aria-label={t.commonBack}
                             onClick={() => navigateTo('root')}
                             onKeyDown={(event) => {
                                 if (!isMenuActionKey(event.key)) return;
                                 event.preventDefault();
                                 navigateTo('root');
                             }}>
                            <span className="media-settings__label">
                                <ChevronLeft className="media-icon"/>
                                <span>{t.settingsSubtitles}</span>
                            </span>
                        </div>
                        <Menu.RadioGroup className="media-menu__group" value={subtitleValue}
                                         onValueChange={onSubtitleChange} label={t.settingsSubtitles}>
                            {subtitleOptions.map((option) => (
                                <Menu.RadioItem key={option.value} className="media-menu__item" value={option.value}>
                                    <span>{resolveLocalizedLabel(option, t)}</span>
                                    <Menu.ItemIndicator checked={option.value === subtitleValue} forceMount className="media-menu__indicator">
                                        <Check className="media-icon"/>
                                    </Menu.ItemIndicator>
                                </Menu.RadioItem>
                            ))}
                        </Menu.RadioGroup>
                        <div className="media-menu__separator"/>
                        <div className="media-menu__item media-menu__item--submenu media-settings__entry" role="menuitem" tabIndex={0}
                             onClick={() => navigateTo('subtitles-settings')}
                             onKeyDown={(event) => {
                                 if (!isMenuActionKey(event.key)) return;
                                 event.preventDefault();
                                 navigateTo('subtitles-settings');
                             }}>
                            <span className="media-settings__label">
                                <ChevronLeft className="media-icon"/>
                                <span>{t.settingsTextStyle}</span>
                            </span>
                        </div>
                    </div>
                )}
                {view === 'subtitles-settings' && (
                    <SubtitleSettingsContent
                        subSettingsView={subSettingsView}
                        subtitleAppearance={subtitleAppearance}
                        onSubtitleAppearanceChange={handleSubtitleAppearanceChange}
                        onSubSettingsViewChange={setSubSettingsView}
                        onBack={() => { setSubSettingsView(null); navigateTo('subtitles'); }}
                    />
                )}
                {view === 'audio' && (
                    <div className="media-menu__submenu">
                        <div className="media-menu__item media-menu__item--back" role="menuitem" tabIndex={0}
                 aria-label={t.commonBack}
                             onClick={() => navigateTo('root')}
                             onKeyDown={(event) => {
                                 if (!isMenuActionKey(event.key)) return;
                                 event.preventDefault();
                                 navigateTo('root');
                             }}>
                            <span className="media-settings__label">
                                <ChevronLeft className="media-icon"/>
                                <span>{t.settingsAudio}</span>
                            </span>
                        </div>
                        <div className="media-menu__group">
                            <div className="media-menu__item media-menu__item--subheader" role="presentation">
                                <span>{t.settingsVolumeBoost}</span>
                            </div>
                            {VOLUME_BOOST_OPTIONS.map((option) => (
                                <div key={option.value}
                                     className="media-menu__item"
                                     role="radio"
                                     aria-checked={option.value === volumeBoost}
                                     tabIndex={0}
                                     onClick={() => {
                                         setVolumeBoost(option.value);
                                         applyVolumeBoost(parseFloat(option.css));
                                     }}
                                     onKeyDown={(event) => {
                                         if (!isMenuActionKey(event.key)) return;
                                         event.preventDefault();
                                         setVolumeBoost(option.value);
                                         applyVolumeBoost(parseFloat(option.css));
                                     }}>
                                    <span>{getVolumeBoostLabel(option.value, t)}</span>
                                    {option.value === volumeBoost && (
                                        <Check className="media-icon media-menu__indicator"/>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="media-menu__separator"/>
                        <div className="media-menu__group">
                            <div className="media-menu__item media-menu__item--subheader" role="presentation">
                                <span>{t.settingsNormalization}</span>
                            </div>
                            {NORMALIZATION_OPTIONS.map((option) => (
                                <div key={option.value}
                                     className="media-menu__item"
                                     role="radio"
                                     aria-checked={option.value === normalization}
                                     tabIndex={0}
                                     onClick={() => {
                                         setNormalization(option.value);
                                         applyNormalization(option.value);
                                     }}
                                     onKeyDown={(event) => {
                                         if (!isMenuActionKey(event.key)) return;
                                         event.preventDefault();
                                         setNormalization(option.value);
                                         applyNormalization(option.value);
                                     }}>
                                    <span>{getNormalizationLabel(option.value, t)}</span>
                                    {option.value === normalization && (
                                        <Check className="media-icon media-menu__indicator"/>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {view === 'speed' && (
                    <div className="media-menu__submenu">
                        <div className="media-menu__item media-menu__item--back" role="menuitem" tabIndex={0}
                 aria-label={t.commonBack}
                             onClick={() => navigateTo('root')}
                             onKeyDown={(event) => {
                                 if (!isMenuActionKey(event.key)) return;
                                 event.preventDefault();
                                 navigateTo('root');
                             }}>
                            <span className="media-settings__label">
                                <ChevronLeft className="media-icon"/>
                                <span>{t.settingsSpeed}</span>
                            </span>
                        </div>
                        <Menu.RadioGroup className="media-menu__group" value={speedValue} onValueChange={onSpeedChange}
                                         label={t.settingsPlaybackRate}>
                            {speedOptions.map((option) => (
                                <Menu.RadioItem key={option.value} className="media-menu__item" value={option.value}
                                                disabled={option.disabled}>
                                    <span>{option.label}</span>
                                    <Menu.ItemIndicator checked={option.value === speedValue} forceMount className="media-menu__indicator">
                                        <Check className="media-icon"/>
                                    </Menu.ItemIndicator>
                                </Menu.RadioItem>
                            ))}
                        </Menu.RadioGroup>
                    </div>
                )}
                {view === 'fullscreen-scale' && (
                    <div className="media-menu__submenu">
                        <div className="media-menu__item media-menu__item--back" role="menuitem" tabIndex={0}
                 aria-label={t.commonBack}
                             onClick={() => navigateTo('root')}
                             onKeyDown={(event) => {
                                 if (!isMenuActionKey(event.key)) return;
                                 event.preventDefault();
                                 navigateTo('root');
                             }}>
                            <span className="media-settings__label">
                                <ChevronLeft className="media-icon"/>
                                <span>{t.settingsFullscreenScale}</span>
                            </span>
                        </div>
                        <Menu.RadioGroup className="media-menu__group" value={fullscreenScale}
                                         onValueChange={(nextValue) => setFullscreenScale(nextValue as FullscreenScale)}
                                         label={t.settingsFullscreenScale}>
                            {FULLSCREEN_SCALE_OPTIONS.map((option) => (
                                <Menu.RadioItem key={option.value} className="media-menu__item" value={option.value}>
                                    <span>{getFullscreenScaleLabel(option.value, t)}</span>
                                    <Menu.ItemIndicator checked={option.value === fullscreenScale} forceMount className="media-menu__indicator">
                                        <Check className="media-icon"/>
                                    </Menu.ItemIndicator>
                                </Menu.RadioItem>
                            ))}
                        </Menu.RadioGroup>
                    </div>
                )}
                {view === 'sleep-timer' && (
                    <div className="media-menu__submenu">
                        <div className="media-menu__item media-menu__item--back" role="menuitem" tabIndex={0}
                 aria-label={t.commonBack}
                             onClick={() => navigateTo('root')}
                             onKeyDown={(event) => {
                                 if (!isMenuActionKey(event.key)) return;
                                 event.preventDefault();
                                 navigateTo('root');
                             }}>
                            <span className="media-settings__label">
                                <ChevronLeft className="media-icon"/>
                                <span>{t.settingsSleepTimer}</span>
                            </span>
                        </div>
                        <Menu.RadioGroup className="media-menu__group" value={sleepTimerValue}
                                         onValueChange={onSleepTimerChange}
                                         label={t.settingsSleepTimer}>
                            {SLEEP_TIMER_OPTIONS.map((option) => (
                                <Menu.RadioItem key={option.value} className="media-menu__item" value={option.value}>
                                    <span>{getSleepTimerLabel(option.value, t)}</span>
                                    <Menu.ItemIndicator checked={option.value === sleepTimerValue} forceMount className="media-menu__indicator">
                                        <Check className="media-icon"/>
                                    </Menu.ItemIndicator>
                                </Menu.RadioItem>
                            ))}
                        </Menu.RadioGroup>
                    </div>
                )}
                {view === 'fragments' && (
                    <div className="media-menu__submenu">
                        <div className="media-menu__item media-menu__item--back" role="menuitem" tabIndex={0}
                 aria-label={t.commonBack}
                             onClick={() => navigateTo('root')}
                             onKeyDown={(event) => {
                                 if (!isMenuActionKey(event.key)) return;
                                 event.preventDefault();
                                 navigateTo('root');
                             }}>
                            <span className="media-settings__label">
                                <ChevronLeft className="media-icon"/>
                                <span>{t.settingsFragments}</span>
                            </span>
                        </div>
                        <div className="media-menu__group">
                            {(['opening', 'ending', 'preview', 'compilation'] as FragmentType[]).map((type) => {
                                const key = `autoSkip${type.charAt(0).toUpperCase() + type.slice(1)}` as keyof FragmentSettings;
                                const checked = fragmentSettings[key] as boolean;
                                return (
                                    <div key={type}
                                         className="media-menu__item media-settings__toggle"
                                         role="switch"
                                         aria-checked={checked}
                                         tabIndex={0}
                                         onClick={() => {
                                             updateSettings({...fragmentSettings, [key]: !fragmentSettings[key]});
                                         }}
                                         onKeyDown={(event) => {
                                             if (!isMenuActionKey(event.key)) return;
                                             event.preventDefault();
                                             updateSettings({...fragmentSettings, [key]: !fragmentSettings[key]});
                                         }}>
                                        <span className="media-settings__label">
                                            <span className="media-fragment-dot" style={{backgroundColor: FRAGMENT_COLORS[type]}}/>
                                            <span>{getFragmentLabel(type, t)}</span>
                                        </span>
                                        <span className="media-settings__toggle-track" data-checked={checked || undefined}>
                                            <span className="media-settings__toggle-thumb"/>
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </Menu.Content>
            {view === 'subtitles-settings' && typeof document !== 'undefined' && createPortal(
                <div className="media-subtitle-preview">{t.settingsSampleSubtitle}</div>,
                document.querySelector('.media-default-skin') ?? document.body
            )}
        </Menu.Root>
    );
}
