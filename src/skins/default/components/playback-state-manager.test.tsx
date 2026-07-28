import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {Player} from '../player';
import {PlaybackStateManager} from './playback-state-manager';

declare global {
    // eslint-disable-next-line no-var
    var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

const SRC = 'https://cdn.example.com/episode.m3u8';

let container: HTMLDivElement;
let root: Root;

function mount(): void {
    act(() => {
        root.render(
            <Player.Provider>
                <PlaybackStateManager src={SRC} />
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

describe('PlaybackStateManager page-hide handling', () => {
    it('listens for visibilitychange and pagehide', () => {
        const onDocument = vi.spyOn(document, 'addEventListener');
        const onWindow = vi.spyOn(window, 'addEventListener');

        mount();

        expect(onDocument.mock.calls.map(([type]) => type)).toContain('visibilitychange');
        expect(onWindow.mock.calls.map(([type]) => type)).toContain('pagehide');
    });

    it('does not register beforeunload', () => {
        // Regression: beforeunload was the only save signal. It is unreliable on
        // mobile and registering it can disable the back/forward cache.
        const onWindow = vi.spyOn(window, 'addEventListener');

        mount();

        expect(onWindow.mock.calls.map(([type]) => type)).not.toContain('beforeunload');
    });

    it('removes both listeners on unmount', () => {
        const offDocument = vi.spyOn(document, 'removeEventListener');
        const offWindow = vi.spyOn(window, 'removeEventListener');

        mount();
        act(() => root.render(<></>));

        expect(offDocument.mock.calls.map(([type]) => type)).toContain('visibilitychange');
        expect(offWindow.mock.calls.map(([type]) => type)).toContain('pagehide');
    });

    it('survives a visibilitychange with no playback progress', () => {
        mount();

        expect(() => {
            Object.defineProperty(document, 'visibilityState', {value: 'hidden', configurable: true});
            document.dispatchEvent(new Event('visibilitychange'));
            window.dispatchEvent(new Event('pagehide'));
        }).not.toThrow();
    });
});
