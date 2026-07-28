import {useEffect} from 'react';
import {usePlayerContext} from '@videojs/react';
import {setMediaElement, releaseMediaElement, resumeOnUserInteraction} from './audio-chain';

export function VolumeProcessor(): null {
    const {container} = usePlayerContext();

    useEffect(() => {

        if (!container) {
            return;
        }

        let attachedMedia: HTMLMediaElement | null = null;
        let detachListeners: (() => void) | null = null;
        let rafId: number | null = null;
        let observer: MutationObserver | null = null;

        const RESUME_EVENTS = ['play', 'playing', 'click', 'mousedown'] as const;

        const setupListeners = (media: HTMLMediaElement): void => {
            const handleResume = (): void => {
                resumeOnUserInteraction();
            };

            for (const type of RESUME_EVENTS) {
                media.addEventListener(type, handleResume);
            }

            detachListeners = () => {
                for (const type of RESUME_EVENTS) {
                    media.removeEventListener(type, handleResume);
                }
            };
        };

        const attachMediaElement = (): boolean => {
            if (attachedMedia || !(container instanceof HTMLElement)) {
                return false;
            }

            const mediaEl = container.querySelector<HTMLMediaElement>('video, audio');
            if (!mediaEl) {
                return false;
            }

            setMediaElement(mediaEl);
            attachedMedia = mediaEl;
            setupListeners(mediaEl);
            return true;
        };

        const pollForMediaElement = (): void => {
            if (attachMediaElement()) {
                return;
            }

            rafId = requestAnimationFrame(pollForMediaElement);
        };

        pollForMediaElement();

        observer = new MutationObserver(() => {
            attachMediaElement();
        });

        if (container instanceof HTMLElement) {
            observer.observe(container, {
                childList: true,
                subtree: true,
                attributes: true
            });
        }

        return () => {
            if (rafId !== null) cancelAnimationFrame(rafId);
            if (observer) observer.disconnect();
            detachListeners?.();
            // Hand the chain back so a remounted player can bind a new element.
            releaseMediaElement(attachedMedia);
        };
    }, [container]);

    return null;
}
