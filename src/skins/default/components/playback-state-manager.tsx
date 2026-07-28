'use client';

import {startTransition, useCallback, useEffect, useMemo, useRef, useState, type ReactNode} from 'react';
import {usePlayer} from '@videojs/react';
import type {PlaybackState, SeasonOption} from '../types';
import {savePlaybackState, loadPlaybackState} from '../utils/playback-state';
import {savePlayerSettings, loadPlayerSettings} from '../utils/settings-persistence';
import {ResumePrompt} from './resume-prompt';

const SAVE_INTERVAL = 5000;

function isValidVolume(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

function isValidPlaybackRate(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

export interface PlaybackStateManagerProps {
    src: string;
    seasons?: SeasonOption[];
    currentSeason?: string;
    currentEpisode?: string;
    currentVoiceover?: string;
    savedState?: PlaybackState | null;
    onSaveState?: (state: PlaybackState) => void;
    onSeasonChange?: (value: string) => void;
    onEpisodeChange?: (value: string) => void;
    onVoiceoverChange?: (value: string) => void;
}

export function PlaybackStateManager({
    src,
    seasons,
    currentSeason,
    currentEpisode,
    currentVoiceover,
    savedState: savedStateProp,
    onSaveState,
    onSeasonChange,
    onEpisodeChange,
    onVoiceoverChange,
}: PlaybackStateManagerProps): ReactNode {
    const store = usePlayer() as unknown as {
        seek: (time: number) => void;
        setVolume: (volume: number) => void;
        setPlaybackRate: (rate: number) => void;
        toggleMuted: () => void;
    };
    const currentTime = usePlayer((s) => (s as { currentTime: number }).currentTime);
    const paused = usePlayer((s) => (s as { paused: boolean }).paused);
    const duration = usePlayer((s) => (s as { duration: number }).duration);
    const volume = usePlayer((s) => (s as { volume: number }).volume);
    const muted = usePlayer((s) => (s as { muted: boolean }).muted);
    const playbackRate = usePlayer((s) => (s as { playbackRate: number }).playbackRate);

    const currentTimeRef = useRef(currentTime);

    const onSaveStateRef = useRef(onSaveState);

    const restoredRef = useRef(false);

    const [resumeState, setResumeState] = useState<PlaybackState | null>(() => {
        if (savedStateProp !== undefined) return savedStateProp;
        return null;
    });
    const [showResume, setShowResume] = useState(false);
    const pendingSeekRef = useRef<number | null>(null);

    // Read by the page-hide handler, which must not re-subscribe on every change.
    const showResumeRef = useRef(showResume);

    useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);
    useEffect(() => { onSaveStateRef.current = onSaveState; }, [onSaveState]);
    useEffect(() => { showResumeRef.current = showResume; }, [showResume]);

    const resumeSubtitle = useMemo(() => {
        if (!resumeState) return undefined;
        const seasonVal = resumeState.season;
        const episodeVal = resumeState.episode;
        const voiceoverVal = resumeState.voiceover;
        if (!seasonVal || !episodeVal) return undefined;

        const seasonLabel = seasonVal.replace(/^s(\d+)$/, 'S$1');
        const episodeLabel = episodeVal.replace(/^s\d+e(\d+)$/, 'E$1');

        let voiceoverLabel: string | undefined;
        if (voiceoverVal && seasons?.length) {
            for (const s of seasons) {
                if (s.value === seasonVal) {
                    for (const e of (s.episodes ?? [])) {
                        if (e.value === episodeVal) {
                            const vo = e.voiceovers?.find((v) => v.value === voiceoverVal);
                            if (vo) voiceoverLabel = vo.label;
                            break;
                        }
                    }
                }
                if (voiceoverLabel) break;
            }
        }

        return voiceoverLabel
            ? `${seasonLabel} · ${episodeLabel} · ${voiceoverLabel}`
            : `${seasonLabel} · ${episodeLabel}`;
    }, [resumeState, seasons]);

    const buildState = useCallback(
        (time: number): PlaybackState => {
            const state: PlaybackState = {time: Math.round(time)};
            if (seasons?.length) {
                state.season = currentSeason;
                state.episode = currentEpisode;
                state.voiceover = currentVoiceover;
            }
            return state;
        },
        [seasons, currentSeason, currentEpisode, currentVoiceover]
    );

    const buildStateRef = useRef(buildState);
    useEffect(() => { buildStateRef.current = buildState; }, [buildState]);

    // Load saved state on mount or when src/savedStateProp changes
    useEffect(() => {
        if (!src) return;
        const state = savedStateProp !== undefined ? savedStateProp : loadPlaybackState(src);
        startTransition(() => {
            if (state && state.time >= 1) {
                setResumeState(state);
                setShowResume(true);
            } else {
                setResumeState(null);
                setShowResume(false);
            }
        });
    }, [src, savedStateProp]);

    // Restore volume/muted/playbackRate after media is ready
    useEffect(() => {
        if (restoredRef.current || duration <= 0) return;
        restoredRef.current = true;

        const settings = loadPlayerSettings();
        if (!settings) return;

        if (isValidVolume(settings.volume) && settings.volume !== volume) store.setVolume(settings.volume);
        if (typeof settings.muted === 'boolean' && settings.muted !== muted) store.toggleMuted();
        if (isValidPlaybackRate(settings.playbackRate) && settings.playbackRate !== playbackRate) {
            store.setPlaybackRate(settings.playbackRate);
        }
    }, [duration, store, volume, muted, playbackRate]);

    // Save volume/muted/playbackRate on change
    useEffect(() => {
        if (restoredRef.current && duration > 0) {
            savePlayerSettings({volume, muted, playbackRate});
        }
    }, [volume, muted, playbackRate, duration]);

    // Apply pending seek after source loads
    useEffect(() => {
        if (pendingSeekRef.current !== null && duration > 0) {
            const time = pendingSeekRef.current;
            pendingSeekRef.current = null;
            requestAnimationFrame(() => {
                store.seek(time);
            });
        }
    }, [duration, store]);

    // Periodic save during playback
    useEffect(() => {
        if (showResume || !src) return;

        if (!paused) {
            const interval = setInterval(() => {
                const state = buildStateRef.current(currentTimeRef.current);
                savePlaybackState(src, state);
                onSaveStateRef.current?.(state);
            }, SAVE_INTERVAL);
            return () => clearInterval(interval);
        }
    }, [paused, showResume, src]);

    // Save on pause
    useEffect(() => {
        if (showResume || !src) return;
        if (!paused) return;
        if (currentTime < 1) return;

        const state = buildState(currentTime);
        savePlaybackState(src, state);
        onSaveState?.(state);
    }, [paused, showResume, src, buildState, currentTime, onSaveState]);

    // Save when the page is hidden or torn down.
    useEffect(() => {
        if (!src) return;

        const persist = () => {
            // While the resume prompt is up the user has not chosen yet, so the
            // stored position must survive untouched.
            if (showResumeRef.current) return;
            const time = currentTimeRef.current;
            if (time < 1) return;
            const state = buildStateRef.current(time);
            savePlaybackState(src, state);
            onSaveStateRef.current?.(state);
        };

        // `visibilitychange` is the only signal mobile browsers reliably deliver
        // when the tab is backgrounded or the app is closed; `pagehide` covers
        // desktop navigation. `beforeunload` is deliberately not used: it is
        // unreliable on mobile and registering it can disable the bfcache.
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') persist();
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('pagehide', persist);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('pagehide', persist);
            persist();
        };
    }, [src]);

    // Save on season/episode/voiceover change
    useEffect(() => {
        if (showResume || !src) return;
        if (!seasons?.length) return;
        if (currentTime < 1) return;

        const state = buildState(currentTime);
        savePlaybackState(src, state);
        onSaveState?.(state);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentSeason, currentEpisode, currentVoiceover]);

    const handleResume = useCallback(() => {
        setShowResume(false);
        if (!resumeState) return;

        const hasSeriesData = seasons?.length && resumeState.season && resumeState.episode;
        const needsNavigation = hasSeriesData && (
            resumeState.season !== currentSeason ||
            resumeState.episode !== currentEpisode ||
            resumeState.voiceover !== currentVoiceover
        );

        if (needsNavigation) {
            if (resumeState.season && resumeState.season !== currentSeason) {
                onSeasonChange?.(resumeState.season);
            }
            if (resumeState.episode && resumeState.episode !== currentEpisode) {
                onEpisodeChange?.(resumeState.episode);
            }
            if (resumeState.voiceover && resumeState.voiceover !== currentVoiceover) {
                onVoiceoverChange?.(resumeState.voiceover);
            }
            if (resumeState.time > 0) {
                pendingSeekRef.current = resumeState.time;
            }
        } else if (resumeState.time > 0) {
            requestAnimationFrame(() => {
                store.seek(resumeState.time);
            });
        }
    }, [resumeState, store, seasons, currentSeason, currentEpisode, currentVoiceover, onSeasonChange, onEpisodeChange, onVoiceoverChange]);

    const handleDismiss = useCallback(() => {
        setShowResume(false);
    }, []);

    if (!showResume || !resumeState) return null;

    return <ResumePrompt state={resumeState} subtitle={resumeSubtitle} onResume={handleResume} onDismiss={handleDismiss} />;
}
