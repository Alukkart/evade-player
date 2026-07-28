'use client';

import {type ReactNode, useCallback, useEffect, useRef, useState} from 'react';
import {usePlayer} from '@videojs/react';
import {SkipForward} from 'lucide-react';
import {Button} from './button';
import {
    type Fragment,
    type FragmentSettings,
    FRAGMENT_COLORS,
} from '../types';
import {useFragmentSettings} from './fragment-settings-context';
import {getFragmentLabel} from '../locales';
import {useLocaleStrings} from './locale-context';

const AUTO_SKIP_DELAY_MS = 300;
const RESET_DELAY_MS = 1000;

function useDuration(): number {
    return usePlayer((s) => (s as { duration: number }).duration) ?? 0;
}

function useCurrentTime(): number {
    return usePlayer((s) => (s as { currentTime: number }).currentTime) ?? 0;
}

function useSeek(): (time: number) => void {
    const store = usePlayer();
    return useCallback(
        (time: number) => {
            (store as { seek?: (t: number) => void }).seek?.(time);
        },
        [store]
    );
}

export function FragmentMarkers({fragments}: { fragments: Fragment[] }): ReactNode {
    const duration = useDuration();
    const t = useLocaleStrings();

    if (!duration || duration <= 0 || !fragments.length) return null;

    return (
        <div className="media-fragment-markers" aria-hidden="true">
            {fragments.map((fragment, index) => {
                const left = (fragment.startTime / duration) * 100;
                const width = ((fragment.endTime - fragment.startTime) / duration) * 100;
                const color = FRAGMENT_COLORS[fragment.type];

                return (
                    <div
                        key={index}
                        className="media-fragment-marker"
                        style={{
                            left: `${left}%`,
                            width: `${width}%`,
                            backgroundColor: color,
                        }}
                        title={fragment.label ?? getFragmentLabel(fragment.type, t)}
                    />
                );
            })}
        </div>
    );
}

function getActiveFragment(fragments: Fragment[], currentTime: number): Fragment | null {
    return fragments.find((f) => currentTime >= f.startTime && currentTime < f.endTime) ?? null;
}

export function SkipFragmentButton({
    fragments,
}: {
    fragments: Fragment[];
}): ReactNode {
    const currentTime = useCurrentTime();
    const seek = useSeek();
    const t = useLocaleStrings();
    const {settings: fragmentSettings} = useFragmentSettings();
    const [skippedFragments, setSkippedFragments] = useState<Set<number>>(new Set());
    const skippedRef = useRef(skippedFragments);

    useEffect(() => {
        skippedRef.current = skippedFragments;
    }, [skippedFragments]);

    const autoSkipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const currentActive = getActiveFragment(fragments, currentTime);

    useEffect(() => {
        if (!currentActive) {
            if (autoSkipTimerRef.current) {
                clearTimeout(autoSkipTimerRef.current);
                autoSkipTimerRef.current = null;
            }
            return;
        }

        const fragmentIndex = fragments.indexOf(currentActive);
        const wasManuallySkipped = skippedRef.current.has(fragmentIndex);

        if (wasManuallySkipped) return;

        const shouldAutoSkip = getAutoSkipValue(currentActive.type, fragmentSettings);

        if (shouldAutoSkip) {
            if (!autoSkipTimerRef.current) {
                autoSkipTimerRef.current = setTimeout(() => {
                    if (skippedRef.current.has(fragmentIndex)) return;
                    seek(currentActive.endTime);
                    setSkippedFragments((prev) => new Set(prev).add(fragmentIndex));
                    autoSkipTimerRef.current = null;
                }, AUTO_SKIP_DELAY_MS);
            }
        }

        return () => {
            if (autoSkipTimerRef.current) {
                clearTimeout(autoSkipTimerRef.current);
                autoSkipTimerRef.current = null;
            }
        };
    }, [currentActive, fragments, fragmentSettings, seek]);

    useEffect(() => {
        if (currentActive) return;
        const timer = setTimeout(() => {
            setSkippedFragments(new Set());
        }, RESET_DELAY_MS);
        return () => clearTimeout(timer);
    }, [currentActive]);

    if (!currentActive) return null;

    const fragmentIndex = fragments.indexOf(currentActive);
    if (skippedFragments.has(fragmentIndex)) return null;

    // Silent auto-skip: hide the button entirely, the seek effect handles it
    if (getAutoSkipValue(currentActive.type, fragmentSettings)) return null;

    const label = currentActive.label ?? getFragmentLabel(currentActive.type, t);

    const handleSkip = () => {
        seek(currentActive.endTime);
        setSkippedFragments((prev) => new Set(prev).add(fragmentIndex));
    };

    return (
        <div className="media-skip-fragment">
            <span className="media-skip-fragment__label">{label}</span>
            <Button className="media-button--icon media-skip-fragment__button" onClick={handleSkip}>
                <SkipForward className="media-icon"/>
            </Button>
        </div>
    );
}

function getAutoSkipValue(type: string, settings: FragmentSettings): boolean {
    switch (type) {
        case 'opening':
            return settings.autoSkipOpening;
        case 'ending':
            return settings.autoSkipEnding;
        case 'preview':
            return settings.autoSkipPreview;
        case 'compilation':
            return settings.autoSkipCompilation;
        default:
            return false;
    }
}
