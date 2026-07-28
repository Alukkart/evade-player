import {afterEach, describe, expect, it} from 'vitest';
import {
    getAudioChainDebugInfo,
    releaseMediaElement,
    setMediaElement,
} from './audio-chain';

afterEach(() => {
    releaseMediaElement();
});

describe('audio chain media element binding', () => {
    it('binds to a media element', () => {
        setMediaElement(document.createElement('video'));
        expect(getAudioChainDebugInfo().mediaElementTagName).toBe('VIDEO');
    });

    it('ignores a second element while one is already bound', () => {
        setMediaElement(document.createElement('video'));
        setMediaElement(document.createElement('audio'));
        expect(getAudioChainDebugInfo().mediaElementTagName).toBe('VIDEO');
    });

    it('rebinds to a new element after release', () => {
        // Regression: without a release path the chain stayed bound to the first
        // element forever, so volume boost silently died after a remount.
        const first = document.createElement('video');
        setMediaElement(first);
        releaseMediaElement(first);

        setMediaElement(document.createElement('audio'));
        expect(getAudioChainDebugInfo().mediaElementTagName).toBe('AUDIO');
    });

    it('ignores a release from an element that does not own the chain', () => {
        const owner = document.createElement('video');
        setMediaElement(owner);

        releaseMediaElement(document.createElement('audio'));

        expect(getAudioChainDebugInfo().hasMediaElement).toBe(true);
        expect(getAudioChainDebugInfo().mediaElementTagName).toBe('VIDEO');
    });

    it('releases unconditionally when called without an element', () => {
        setMediaElement(document.createElement('video'));
        releaseMediaElement();
        expect(getAudioChainDebugInfo().hasMediaElement).toBe(false);
    });

    it('treats releasing null as a no-op', () => {
        const owner = document.createElement('video');
        setMediaElement(owner);

        // VolumeProcessor passes its (possibly null) attachedMedia straight through.
        releaseMediaElement(null);

        expect(getAudioChainDebugInfo().mediaElementTagName).toBe('VIDEO');
    });

    it('ignores non-media values', () => {
        setMediaElement(document.createElement('div'));
        setMediaElement(null);
        setMediaElement('not an element');
        expect(getAudioChainDebugInfo().hasMediaElement).toBe(false);
    });
});
