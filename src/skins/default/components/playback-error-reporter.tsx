'use client';

import {useEffect, useRef} from 'react';
import {Player} from '../player';
import type {PlaybackErrorDetail, PlaybackErrorKind} from '../types';

/** hls.js `hlsError` payload, narrowed to the fields the host cares about. */
interface HlsErrorData {
    type?: string;
    details?: string;
    fatal?: boolean;
    url?: string;
    response?: {code?: number};
    networkDetails?: {status?: number};
    frag?: {url?: string};
    context?: {url?: string};
}

type HlsErrorListener = (event: string, data: HlsErrorData) => void;

/** The slice of the hls.js instance we bind to, kept structural to avoid the import. */
interface HlsEngineLike {
    on(event: string, listener: HlsErrorListener): void;
    off(event: string, listener: HlsErrorListener): void;
}

/**
 * `MediaError` as raised by `@videojs/core`: a decorated `Error` carrying the
 * originating hls.js payload on `data`.
 */
interface CoreMediaError {
    code?: number;
    fatal?: boolean;
    context?: string;
    data?: HlsErrorData;
}

const HLS_ERROR_EVENT = 'hlsError';

/** hls.js `ErrorTypes` values. Mapped by string so hls.js stays out of the bundle graph. */
const HLS_TYPE_TO_KIND: Record<string, PlaybackErrorKind> = {
    networkError: 'network',
    mediaError: 'media',
    muxError: 'media',
    keySystemError: 'drm',
    otherError: 'other',
};

/** `HTMLMediaElement.error` / `MediaError` codes. */
const MEDIA_CODE_TO_KIND: Record<number, PlaybackErrorKind> = {
    2: 'network',
    3: 'media',
    4: 'media',
    5: 'drm',
};

function isHlsEngine(engine: unknown): engine is HlsEngineLike {
    if (!engine || typeof engine !== 'object') return false;
    const candidate = engine as Partial<HlsEngineLike>;
    return typeof candidate.on === 'function' && typeof candidate.off === 'function';
}

function firstNumber(...values: unknown[]): number | undefined {
    for (const value of values) {
        if (typeof value === 'number' && Number.isFinite(value)) return value;
    }
    return undefined;
}

function firstString(...values: unknown[]): string | undefined {
    for (const value of values) {
        if (typeof value === 'string' && value) return value;
    }
    return undefined;
}

function detailFromHlsData(data: HlsErrorData, time: number): PlaybackErrorDetail {
    const detail: PlaybackErrorDetail = {
        fatal: data.fatal === true,
        kind: (data.type && HLS_TYPE_TO_KIND[data.type]) || 'other',
        time,
    };

    const details = firstString(data.details);
    if (details) detail.details = details;

    const status = firstNumber(data.response?.code, data.networkDetails?.status);
    if (status !== undefined) detail.status = status;

    const url = firstString(data.url, data.frag?.url, data.context?.url);
    if (url) detail.url = url;

    return detail;
}

function detailFromMediaError(
    error: CoreMediaError | null | undefined,
    elementError: MediaError | null,
    time: number
): PlaybackErrorDetail {
    const code = firstNumber(error?.code, elementError?.code);
    const detail: PlaybackErrorDetail = {
        // A media element error always halts playback; `MediaError.fatal` only
        // says `false` for something the player already recovered from.
        fatal: error?.fatal ?? true,
        kind: (code !== undefined && MEDIA_CODE_TO_KIND[code]) || 'other',
        time,
    };

    const details = firstString(error?.context);
    if (details) detail.details = details;

    return detail;
}

export interface PlaybackErrorReporterProps {
    /** Called for every playback failure, recovered ones included. */
    onPlaybackError?: (error: PlaybackErrorDetail) => void;
}

/**
 * Reports playback failures to the host.
 *
 * hls.js is the richer source — it reports non-fatal errors too and carries the
 * HTTP status of the response that failed — so the engine is preferred whenever
 * it is available. The media element's own `error` event is the fallback for
 * native HLS and progressive sources, and for fatal errors raised before an
 * engine existed.
 */
export function PlaybackErrorReporter({onPlaybackError}: PlaybackErrorReporterProps): null {
    const media = Player.useMedia();
    const handlerRef = useRef(onPlaybackError);

    useEffect(() => {
        handlerRef.current = onPlaybackError;
    }, [onPlaybackError]);

    useEffect(() => {
        if (!media || !onPlaybackError) return;

        const host = media as unknown as {
            currentTime?: number;
            error?: MediaError | null;
            engine?: unknown;
        };
        const target = media as unknown as EventTarget;

        const currentTime = (): number =>
            typeof host.currentTime === 'number' && Number.isFinite(host.currentTime)
                ? host.currentTime
                : 0;

        // hls.js hands the same payload object to both channels, so identity is
        // enough to keep one failure from being reported twice.
        let reportedData: HlsErrorData | null = null;

        const report = (detail: PlaybackErrorDetail): void => {
            handlerRef.current?.(detail);
        };

        const onEngineError: HlsErrorListener = (_event, data) => {
            reportedData = data;
            report(detailFromHlsData(data, currentTime()));
        };

        let engine: HlsEngineLike | null = null;

        const bindEngine = (): void => {
            const next = host.engine;
            if (next === engine) return;
            engine?.off(HLS_ERROR_EVENT, onEngineError);
            engine = isHlsEngine(next) ? next : null;
            engine?.on(HLS_ERROR_EVENT, onEngineError);
        };

        const onMediaError = (event: Event): void => {
            const error = (event as ErrorEvent).error as CoreMediaError | undefined;
            const data = error?.data;
            if (data && (data === reportedData || engine !== null)) return;

            report(
                data
                    ? detailFromHlsData(data, currentTime())
                    : detailFromMediaError(error, host.error ?? null, currentTime())
            );
        };

        // The engine is created lazily when the source loads, and replaced when
        // the engine config changes, so re-check it on every load.
        bindEngine();
        target.addEventListener('loadstart', bindEngine);
        target.addEventListener('error', onMediaError);

        return () => {
            engine?.off(HLS_ERROR_EVENT, onEngineError);
            engine = null;
            target.removeEventListener('loadstart', bindEngine);
            target.removeEventListener('error', onMediaError);
        };
    }, [media, onPlaybackError]);

    return null;
}
