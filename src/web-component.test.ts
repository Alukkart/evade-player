import {afterEach, describe, expect, it, vi} from 'vitest';
import './web-component';

function createPlayer(attributes: Record<string, string> = {}): HTMLElement {
    const el = document.createElement('evade-player');
    for (const [name, value] of Object.entries(attributes)) {
        el.setAttribute(name, value);
    }
    document.body.appendChild(el);
    return el;
}

afterEach(() => {
    document.body.innerHTML = '';
});

describe('<evade-player> registration', () => {
    it('is defined as a custom element', () => {
        expect(customElements.get('evade-player')).toBeTypeOf('function');
    });
});

describe('<evade-player> JSON attributes', () => {
    it('accepts seasons as a JSON attribute', () => {
        const seasons = [{label: 'Season 1', value: 's1', episodes: [{label: 'Ep 1', value: 's1e1'}]}];
        const el = createPlayer({src: 'https://x/v.mp4', seasons: JSON.stringify(seasons)});

        // The property getter reflects only JS-assigned values; the attribute is
        // read at render time. Assert the element parsed it without throwing.
        expect(el.isConnected).toBe(true);
        expect(el.getAttribute('seasons')).toBe(JSON.stringify(seasons));
    });

    it('accepts qualities as a JSON attribute', () => {
        const qualities = [{label: '1080p', src: 'https://x/1080.m3u8'}];
        const el = createPlayer({src: 'https://x/master.m3u8', qualities: JSON.stringify(qualities)});
        expect(el.getAttribute('qualities')).toBe(JSON.stringify(qualities));
    });

    it('survives malformed JSON without throwing', () => {
        expect(() => createPlayer({src: 'https://x/v.mp4', seasons: '{not json', qualities: '[['})).not.toThrow();
    });

    it('observes the new attributes', () => {
        const observed = (customElements.get('evade-player') as unknown as {observedAttributes: string[]})
            .observedAttributes;
        expect(observed).toContain('qualities');
        expect(observed).toContain('seasons');
    });
});

describe('<evade-player> media event forwarding', () => {
    const MEDIA_EVENTS = [
        'loadedmetadata', 'durationchange', 'play', 'playing', 'pause', 'waiting',
        'seeking', 'seeked', 'timeupdate', 'volumechange', 'ratechange', 'ended', 'error',
    ];

    it.each(MEDIA_EVENTS)('re-dispatches "%s" from the host element', (type) => {
        const el = createPlayer({src: 'https://x/v.mp4'});

        // React renders asynchronously in this environment, so drive the
        // forwarding with a media element placed directly in the mount subtree.
        const media = document.createElement('video');
        el.firstElementChild?.appendChild(media);

        let received: CustomEvent | null = null;
        el.addEventListener(type, (event) => {
            received = event as CustomEvent;
        });

        media.dispatchEvent(new Event(type));

        expect(received).not.toBeNull();
        const detail = (received as unknown as CustomEvent).detail as Record<string, unknown>;
        expect(detail).toMatchObject({
            paused: expect.any(Boolean),
            volume: expect.any(Number),
            muted: expect.any(Boolean),
            playbackRate: expect.any(Number),
        });
    });

    it('ignores events whose target is not a media element', () => {
        const el = createPlayer({src: 'https://x/v.mp4'});
        const div = document.createElement('div');
        el.firstElementChild?.appendChild(div);

        let called = false;
        el.addEventListener('play', () => {
            called = true;
        });

        div.dispatchEvent(new Event('play'));
        expect(called).toBe(false);
    });

    it('stops forwarding after disconnect', () => {
        const el = createPlayer({src: 'https://x/v.mp4'});
        const media = document.createElement('video');
        const mount = el.firstElementChild;
        mount?.appendChild(media);

        let count = 0;
        el.addEventListener('play', () => {
            count += 1;
        });

        media.dispatchEvent(new Event('play'));
        expect(count).toBe(1);

        el.remove();
        media.dispatchEvent(new Event('play'));
        expect(count).toBe(1);
    });
});

interface FakeVideo extends HTMLVideoElement {
    seekedTo: number | null;
}

/**
 * jsdom leaves `currentTime` and `play()` unimplemented, so the parts of the
 * media element `reload()` touches are stubbed on the instance.
 */
function appendVideo(el: HTMLElement, {currentTime = 0, paused = true} = {}): FakeVideo {
    const media = document.createElement('video') as FakeVideo;
    media.seekedTo = null;
    Object.defineProperty(media, 'currentTime', {
        get: () => (media.seekedTo ?? currentTime),
        set: (value: number) => { media.seekedTo = value; },
        configurable: true,
    });
    Object.defineProperty(media, 'paused', {get: () => paused, configurable: true});
    media.play = vi.fn().mockResolvedValue(undefined);
    el.firstElementChild?.appendChild(media);
    return media;
}

interface ReloadablePlayer extends HTMLElement {
    reload(src: string, options?: {time?: number}): void;
}

const FRESH_SRC = 'https://cdn.example.com/master.m3u8?sig=fresh';

describe('<evade-player> reload()', () => {
    it('swaps the source without recreating the element', () => {
        const el = createPlayer({src: 'https://cdn.example.com/master.m3u8?sig=stale'}) as ReloadablePlayer;
        const mount = el.firstElementChild;
        const media = appendVideo(el);

        el.reload(FRESH_SRC, {time: 1841.2});

        expect(el.getAttribute('src')).toBe(FRESH_SRC);
        // Same mount, same media element: nothing was torn down and rebuilt.
        expect(el.firstElementChild).toBe(mount);
        expect(mount?.contains(media)).toBe(true);
    });

    it('restores the requested position once the new source reports metadata', () => {
        const el = createPlayer({src: 'https://x/stale.m3u8'}) as ReloadablePlayer;
        const media = appendVideo(el);

        el.reload(FRESH_SRC, {time: 1841.2});
        expect(media.seekedTo).toBeNull();

        media.dispatchEvent(new Event('loadedmetadata'));
        expect(media.seekedTo).toBe(1841.2);
    });

    it('falls back to the position at the time of the call', () => {
        const el = createPlayer({src: 'https://x/stale.m3u8'}) as ReloadablePlayer;
        const media = appendVideo(el, {currentTime: 42});

        el.reload(FRESH_SRC);
        media.dispatchEvent(new Event('loadedmetadata'));

        expect(media.seekedTo).toBe(42);
    });

    it('resumes playback when the player was not paused', () => {
        const el = createPlayer({src: 'https://x/stale.m3u8'}) as ReloadablePlayer;
        const media = appendVideo(el, {currentTime: 10, paused: false});

        el.reload(FRESH_SRC);
        media.dispatchEvent(new Event('loadedmetadata'));

        expect(media.play).not.toHaveBeenCalled();
    });

    it('starts playback when the source loads back paused', () => {
        const el = createPlayer({src: 'https://x/stale.m3u8'}) as ReloadablePlayer;
        const media = appendVideo(el, {currentTime: 10, paused: false});

        el.reload(FRESH_SRC);
        Object.defineProperty(media, 'paused', {get: () => true, configurable: true});
        media.dispatchEvent(new Event('loadedmetadata'));

        expect(media.play).toHaveBeenCalledTimes(1);
    });

    it('leaves a paused player paused', () => {
        const el = createPlayer({src: 'https://x/stale.m3u8'}) as ReloadablePlayer;
        const media = appendVideo(el, {currentTime: 10, paused: true});

        el.reload(FRESH_SRC);
        media.dispatchEvent(new Event('loadedmetadata'));

        expect(media.seekedTo).toBe(10);
        expect(media.play).not.toHaveBeenCalled();
    });

    it('seeks only once', () => {
        const el = createPlayer({src: 'https://x/stale.m3u8'}) as ReloadablePlayer;
        const media = appendVideo(el);

        el.reload(FRESH_SRC, {time: 100});
        media.dispatchEvent(new Event('loadedmetadata'));
        media.seekedTo = null;
        media.dispatchEvent(new Event('loadedmetadata'));

        expect(media.seekedTo).toBeNull();
    });

    it('ignores a negative or non-finite time and uses the current position', () => {
        const el = createPlayer({src: 'https://x/stale.m3u8'}) as ReloadablePlayer;
        const media = appendVideo(el, {currentTime: 7});

        el.reload(FRESH_SRC, {time: Number.NaN});
        media.dispatchEvent(new Event('loadedmetadata'));

        expect(media.seekedTo).toBe(7);
    });

    it('stops waiting for the new source after disconnect', () => {
        const el = createPlayer({src: 'https://x/stale.m3u8'}) as ReloadablePlayer;
        const media = appendVideo(el);

        el.reload(FRESH_SRC, {time: 100});
        el.remove();
        media.dispatchEvent(new Event('loadedmetadata'));

        expect(media.seekedTo).toBeNull();
    });
});
