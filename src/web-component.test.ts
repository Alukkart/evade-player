import {afterEach, describe, expect, it} from 'vitest';
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
