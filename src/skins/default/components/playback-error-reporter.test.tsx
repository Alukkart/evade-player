import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {act, useEffect} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {useMediaAttach} from '@videojs/react';
import {Player} from '../player';
import {PlaybackErrorReporter} from './playback-error-reporter';
import type {PlaybackErrorDetail} from '../types';

declare global {
    var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

type EngineListener = (event: string, data: unknown) => void;

/** Stands in for the hls.js instance the media host exposes as `engine`. */
class FakeEngine {
    listeners = new Map<string, Set<EngineListener>>();

    on(event: string, listener: EngineListener): void {
        const set = this.listeners.get(event) ?? new Set();
        set.add(listener);
        this.listeners.set(event, set);
    }

    off(event: string, listener: EngineListener): void {
        this.listeners.get(event)?.delete(listener);
    }

    emit(event: string, data: unknown): void {
        for (const listener of [...(this.listeners.get(event) ?? [])]) listener(event, data);
    }

    get listenerCount(): number {
        return this.listeners.get('hlsError')?.size ?? 0;
    }
}

/** Stands in for the `@videojs/core` media host: an EventTarget with media props. */
class FakeMedia extends EventTarget {
    currentTime = 0;
    error: MediaError | null = null;
    engine: FakeEngine | null = null;

    play(): Promise<void> {
        return Promise.resolve();
    }
}

/** hls.js hands the same payload to the engine listener and to the bridged event. */
const FRAG_403 = {
    type: 'networkError',
    details: 'fragLoadError',
    fatal: true,
    url: 'https://cdn.example.com/seg-412.ts',
    response: {code: 403},
};

let container: HTMLDivElement;
let root: Root;

function AttachMedia({media}: {media: FakeMedia}): null {
    const setMedia = useMediaAttach();
    useEffect(() => {
        setMedia?.(media as never);
    }, [setMedia, media]);
    return null;
}

function mount(media: FakeMedia, onPlaybackError?: (error: PlaybackErrorDetail) => void): void {
    act(() => {
        root.render(
            <Player.Provider>
                <AttachMedia media={media} />
                <PlaybackErrorReporter onPlaybackError={onPlaybackError} />
            </Player.Provider>
        );
    });
}

beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
});

afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
});

describe('PlaybackErrorReporter with an hls.js engine', () => {
    it('reports an expired signature with status, details and position', () => {
        const media = new FakeMedia();
        media.engine = new FakeEngine();
        media.currentTime = 1841.2;
        const onPlaybackError = vi.fn();

        mount(media, onPlaybackError);
        act(() => media.engine?.emit('hlsError', FRAG_403));

        expect(onPlaybackError).toHaveBeenCalledTimes(1);
        expect(onPlaybackError).toHaveBeenCalledWith({
            fatal: true,
            kind: 'network',
            details: 'fragLoadError',
            status: 403,
            url: 'https://cdn.example.com/seg-412.ts',
            time: 1841.2,
        });
    });

    it('marks recovered errors as non-fatal', () => {
        const media = new FakeMedia();
        media.engine = new FakeEngine();
        const onPlaybackError = vi.fn();

        mount(media, onPlaybackError);
        act(() => media.engine?.emit('hlsError', {
            type: 'mediaError',
            details: 'bufferStalledError',
            fatal: false,
        }));

        expect(onPlaybackError).toHaveBeenCalledWith({fatal: false, kind: 'media', details: 'bufferStalledError', time: 0});
    });

    it('reports the same failure once when the media host bridges it too', () => {
        const media = new FakeMedia();
        media.engine = new FakeEngine();
        const onPlaybackError = vi.fn();

        mount(media, onPlaybackError);
        act(() => {
            media.engine?.emit('hlsError', FRAG_403);
            // What `@videojs/core` re-dispatches on the host for a fatal error.
            const error = Object.assign(new Error('fragLoadError'), {code: 2, fatal: true, data: FRAG_403});
            media.dispatchEvent(new ErrorEvent('error', {error}));
        });

        expect(onPlaybackError).toHaveBeenCalledTimes(1);
    });

    it('maps key system failures to the drm kind', () => {
        const media = new FakeMedia();
        media.engine = new FakeEngine();
        const onPlaybackError = vi.fn();

        mount(media, onPlaybackError);
        act(() => media.engine?.emit('hlsError', {type: 'keySystemError', details: 'keyLoadError', fatal: true}));

        expect(onPlaybackError.mock.calls[0]?.[0]).toMatchObject({kind: 'drm'});
    });

    it('falls back to the other kind for an unknown hls type', () => {
        const media = new FakeMedia();
        media.engine = new FakeEngine();
        const onPlaybackError = vi.fn();

        mount(media, onPlaybackError);
        act(() => media.engine?.emit('hlsError', {type: 'somethingNew', fatal: true}));

        expect(onPlaybackError.mock.calls[0]?.[0]).toMatchObject({kind: 'other'});
    });

    it('rebinds when the engine is replaced on a new load', () => {
        const media = new FakeMedia();
        const first = new FakeEngine();
        media.engine = first;
        const onPlaybackError = vi.fn();

        mount(media, onPlaybackError);
        expect(first.listenerCount).toBe(1);

        const second = new FakeEngine();
        media.engine = second;
        act(() => media.dispatchEvent(new Event('loadstart')));

        expect(first.listenerCount).toBe(0);
        expect(second.listenerCount).toBe(1);

        act(() => second.emit('hlsError', FRAG_403));
        expect(onPlaybackError).toHaveBeenCalledTimes(1);
    });

    it('unbinds from the engine on unmount', () => {
        const media = new FakeMedia();
        const engine = new FakeEngine();
        media.engine = engine;

        mount(media, vi.fn());
        expect(engine.listenerCount).toBe(1);

        act(() => root.render(null));
        expect(engine.listenerCount).toBe(0);
    });
});

describe('PlaybackErrorReporter without an engine', () => {
    it('reports the media element error', () => {
        const media = new FakeMedia();
        media.currentTime = 12;
        media.error = {code: 2, message: 'network'} as MediaError;
        const onPlaybackError = vi.fn();

        mount(media, onPlaybackError);
        act(() => media.dispatchEvent(new ErrorEvent('error')));

        expect(onPlaybackError).toHaveBeenCalledWith({fatal: true, kind: 'network', time: 12});
    });

    it('reports a decode failure as a media error', () => {
        const media = new FakeMedia();
        const onPlaybackError = vi.fn();

        mount(media, onPlaybackError);
        act(() => {
            const error = Object.assign(new Error('boom'), {code: 3, fatal: true, context: 'bufferAppendError'});
            media.dispatchEvent(new ErrorEvent('error', {error}));
        });

        expect(onPlaybackError).toHaveBeenCalledWith({
            fatal: true,
            kind: 'media',
            details: 'bufferAppendError',
            time: 0,
        });
    });

    it('still reports an hls payload that arrives only on the host', () => {
        const media = new FakeMedia();
        const onPlaybackError = vi.fn();

        mount(media, onPlaybackError);
        act(() => {
            const error = Object.assign(new Error('manifestLoadError'), {code: 2, fatal: true, data: {
                type: 'networkError',
                details: 'manifestLoadError',
                fatal: true,
                response: {code: 403},
            }});
            media.dispatchEvent(new ErrorEvent('error', {error}));
        });

        expect(onPlaybackError).toHaveBeenCalledWith({
            fatal: true,
            kind: 'network',
            details: 'manifestLoadError',
            status: 403,
            time: 0,
        });
    });

    it('stays out of the way when the host does not listen', () => {
        const media = new FakeMedia();
        const engine = new FakeEngine();
        media.engine = engine;

        mount(media, undefined);

        expect(engine.listenerCount).toBe(0);
        expect(() => act(() => media.dispatchEvent(new ErrorEvent('error')))).not.toThrow();
    });
});
