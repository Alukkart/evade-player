import {afterEach, describe, expect, it, vi} from 'vitest';
import type {PlaybackErrorDetail} from './skins/default/types';

// The custom element's only job here is wiring, so the skin is replaced with a
// probe that hands back the props it was rendered with.
const {renders} = vi.hoisted(() => ({renders: [] as Record<string, unknown>[]}));

vi.mock('./skins/default/skin', () => ({
    VideoPlayer: (props: Record<string, unknown>) => {
        renders.push(props);
        return null;
    },
}));

import './web-component';

afterEach(() => {
    document.body.innerHTML = '';
    renders.length = 0;
});

async function mountPlayer(): Promise<HTMLElement> {
    const el = document.createElement('evade-player');
    el.setAttribute('src', 'https://cdn.example.com/master.m3u8?sig=stale');
    document.body.appendChild(el);
    await vi.waitFor(() => expect(renders.length).toBeGreaterThan(0));
    return el;
}

function lastOnPlaybackError(): (error: PlaybackErrorDetail) => void {
    const handler = renders[renders.length - 1]?.onPlaybackError;
    expect(handler).toBeTypeOf('function');
    return handler as (error: PlaybackErrorDetail) => void;
}

const EXPIRED_SIGNATURE: PlaybackErrorDetail = {
    fatal: true,
    kind: 'network',
    details: 'fragLoadError',
    status: 403,
    url: 'https://cdn.example.com/seg-412.ts',
    time: 1841.2,
};

describe('<evade-player> playbackerror', () => {
    it('dispatches the failure detail verbatim, once', async () => {
        const el = await mountPlayer();

        const received: CustomEvent[] = [];
        el.addEventListener('playbackerror', (event) => received.push(event as CustomEvent));

        lastOnPlaybackError()(EXPIRED_SIGNATURE);

        expect(received).toHaveLength(1);
        expect(received[0]?.detail).toEqual(EXPIRED_SIGNATURE);
    });

    it('is named apart from the media element error event', async () => {
        const el = await mountPlayer();

        let mediaErrors = 0;
        el.addEventListener('error', () => { mediaErrors += 1; });

        lastOnPlaybackError()(EXPIRED_SIGNATURE);

        expect(mediaErrors).toBe(0);
    });

    it('keeps working when nothing listens', async () => {
        await mountPlayer();
        expect(() => lastOnPlaybackError()(EXPIRED_SIGNATURE)).not.toThrow();
    });

    it('suppresses the resume prompt for a reload, until a new savedState arrives', async () => {
        const el = await mountPlayer() as HTMLElement & {
            reload(src: string, options?: {time?: number}): void;
            savedState: unknown;
        };

        el.savedState = {time: 120};
        await vi.waitFor(() => expect(renders[renders.length - 1]?.savedState).toEqual({time: 120}));

        el.reload('https://cdn.example.com/master.m3u8?sig=fresh', {time: 1841.2});
        await vi.waitFor(() => expect(renders[renders.length - 1]?.savedState).toBeNull());

        el.savedState = {time: 1841};
        await vi.waitFor(() => expect(renders[renders.length - 1]?.savedState).toEqual({time: 1841}));
    });
});
