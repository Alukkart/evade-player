import {describe, expect, it} from 'vitest';
import {
    DEFAULT_LOCALE,
    formatLocaleString,
    getBgLabel,
    getColorLabel,
    getEdgeStyleLabel,
    getFontFamilyLabel,
    getFontSizeLabel,
    getFragmentLabel,
    getFullscreenScaleLabel,
    getNormalizationLabel,
    getPositionLabel,
    getVolumeBoostLabel,
    hasLocale,
    listLocales,
    localeEn,
    localeRu,
    registerLocale,
    resolveLocaleStrings,
    type LocaleStrings,
} from './index';
import {
    FRAGMENT_COLORS,
    FULLSCREEN_SCALE_OPTIONS,
    NORMALIZATION_OPTIONS,
    SUBTITLE_BG_OPTIONS,
    SUBTITLE_COLOR_OPTIONS,
    SUBTITLE_EDGE_STYLE_OPTIONS,
    SUBTITLE_FONT_FAMILY_OPTIONS,
    SUBTITLE_FONT_SIZE_OPTIONS,
    SUBTITLE_POSITION_OPTIONS,
    VOLUME_BOOST_OPTIONS,
    type FragmentType,
    type SubtitleSettingOption,
} from '../types';

/** English is the reference table every other locale is measured against. */
const REFERENCE = localeEn;

const SHIPPED_LOCALES: [string, LocaleStrings][] = listLocales()
    .map((tag) => [tag, resolveLocaleStrings(tag)] as [string, LocaleStrings]);

function placeholdersOf(value: string): string[] {
    return [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1] as string).sort();
}

// ---------------------------------------------------------------------------
// Contract every shipped locale must satisfy. A new `locales/<tag>.ts` that
// fails any of these is an incomplete translation.
// ---------------------------------------------------------------------------

describe.each(SHIPPED_LOCALES)('locale "%s"', (tag, strings) => {
    it('defines exactly the reference keys — nothing missing, nothing extra', () => {
        const expected = Object.keys(REFERENCE).sort();
        const actual = Object.keys(strings).sort();

        const missing = expected.filter((key) => !actual.includes(key));
        const extra = actual.filter((key) => !expected.includes(key));

        expect({missing, extra}).toEqual({missing: [], extra: []});
    });

    it('has no empty or whitespace-only values', () => {
        const blank = Object.entries(strings)
            .filter(([, value]) => typeof value !== 'string' || value.trim().length === 0)
            .map(([key]) => key);

        expect(blank).toEqual([]);
    });

    it('keeps the same {placeholders} as the reference', () => {
        const mismatched = Object.keys(REFERENCE)
            .map((key) => {
                const k = key as keyof LocaleStrings;
                return {
                    key,
                    expected: placeholdersOf(REFERENCE[k]),
                    actual: placeholdersOf(strings[k]),
                };
            })
            .filter((entry) => entry.expected.join() !== entry.actual.join());

        expect(mismatched).toEqual([]);
    });

    it(`translates every option offered by the UI (tag: ${tag})`, () => {
        // A resolver returns the raw value when a key is missing, so "label === value"
        // means the option has no translation in this locale.
        const groups: [string, readonly SubtitleSettingOption[], (v: string, t: LocaleStrings) => string][] = [
            ['font-size', SUBTITLE_FONT_SIZE_OPTIONS, getFontSizeLabel],
            ['text-color', SUBTITLE_COLOR_OPTIONS, getColorLabel],
            ['text-bg', SUBTITLE_BG_OPTIONS, getBgLabel],
            ['edge-style', SUBTITLE_EDGE_STYLE_OPTIONS, getEdgeStyleLabel],
            ['font-family', SUBTITLE_FONT_FAMILY_OPTIONS, getFontFamilyLabel],
            ['position', SUBTITLE_POSITION_OPTIONS, getPositionLabel],
            ['volume-boost', VOLUME_BOOST_OPTIONS, getVolumeBoostLabel],
            ['normalization', NORMALIZATION_OPTIONS, getNormalizationLabel],
        ];

        const untranslated: string[] = [];

        for (const [group, options, resolve] of groups) {
            for (const option of options) {
                // Numeric labels such as "50%" are intentionally identical.
                if (/^\d/.test(option.value)) continue;
                if (resolve(option.value, strings) === option.value) {
                    untranslated.push(`${group}/${option.value}`);
                }
            }
        }

        for (const option of FULLSCREEN_SCALE_OPTIONS) {
            if (getFullscreenScaleLabel(option.value, strings) === option.value) {
                untranslated.push(`fullscreen-scale/${option.value}`);
            }
        }

        for (const type of Object.keys(FRAGMENT_COLORS) as FragmentType[]) {
            if (!getFragmentLabel(type, strings)) {
                untranslated.push(`fragment/${type}`);
            }
        }

        expect(untranslated).toEqual([]);
    });
});

// ---------------------------------------------------------------------------

describe('registry', () => {
    it('ships en and ru', () => {
        expect(listLocales()).toEqual(expect.arrayContaining(['en', 'ru']));
    });

    it('defaults to English', () => {
        expect(DEFAULT_LOCALE).toBe('en');
        expect(resolveLocaleStrings()).toBe(localeEn);
        expect(resolveLocaleStrings(undefined)).toBe(localeEn);
    });

    it('resolves known tags', () => {
        expect(resolveLocaleStrings('ru')).toBe(localeRu);
        expect(hasLocale('ru')).toBe(true);
    });

    it('falls back to the default for unknown tags instead of returning undefined', () => {
        expect(hasLocale('kl')).toBe(false);
        expect(resolveLocaleStrings('kl')).toBe(localeEn);
    });

    it('resolves a regional tag to its base language', () => {
        expect(resolveLocaleStrings('ru-RU')).toBe(localeRu);
        expect(resolveLocaleStrings('en-GB')).toBe(localeEn);
    });

    it('accepts a locale registered at runtime', () => {
        const pirate: LocaleStrings = {...localeEn, commonOff: 'Nay', commonOn: 'Aye'};
        registerLocale('x-pirate', pirate);

        expect(hasLocale('x-pirate')).toBe(true);
        expect(resolveLocaleStrings('x-pirate').commonOff).toBe('Nay');
        expect(listLocales()).toContain('x-pirate');
    });
});

describe('getFragmentLabel', () => {
    it('uses the supplied string table', () => {
        expect(getFragmentLabel('opening', localeRu)).toBe(localeRu.fragmentOpening);
        expect(getFragmentLabel('opening', localeEn)).toBe(localeEn.fragmentOpening);
    });

    it('accepts a locale tag', () => {
        expect(getFragmentLabel('ending', 'ru')).toBe(localeRu.fragmentEnding);
    });

    it('honours a third locale rather than falling back to Russian', () => {
        // Regression: this used to be `locale === 'en' ? EN : RU`, so every other
        // language silently rendered Russian fragment names.
        registerLocale('x-frag', {...localeEn, fragmentOpening: 'Vorspann'});
        expect(getFragmentLabel('opening', 'x-frag')).toBe('Vorspann');
    });
});

describe('no dead keys', () => {
    it('every declared key is actually wired into the player', () => {
        const sources = import.meta.glob('/src/**/*.{ts,tsx}', {
            query: '?raw',
            eager: true,
            import: 'default',
        }) as Record<string, string>;

        // Declaring a key is not using it: skip translation tables entirely, and
        // strip the `interface LocaleStrings { … }` block from the schema file.
        const consumers = Object.entries(sources)
            .filter(([path]) => !/\.test\.tsx?$/.test(path))
            .map(([, source]) => source)
            .filter((source) => !/:\s*LocaleStrings\s*=\s*\{/.test(source))
            .map((source) => source.replace(/export interface LocaleStrings \{[\s\S]*?\n\}/, ''))
            .join('\n');

        const unused = Object.keys(REFERENCE).filter((key) => !consumers.includes(key));

        // Regression: qualityTrack, subtitlesTrack and commonBack were declared
        // and translated, but nothing ever read them.
        expect(unused).toEqual([]);
    });
});

describe('formatLocaleString', () => {
    it('substitutes placeholders', () => {
        expect(formatLocaleString('{minutes} min', {minutes: 15})).toBe('15 min');
        expect(formatLocaleString('Track {index}', {index: 2})).toBe('Track 2');
    });

    it('returns the template untouched with no params', () => {
        expect(formatLocaleString('Track {index}')).toBe('Track {index}');
    });

    it('leaves unknown placeholders visible instead of printing undefined', () => {
        expect(formatLocaleString('{a} and {b}', {a: 1})).toBe('1 and {b}');
    });
});
