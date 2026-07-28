import type {FragmentType} from '../types';
import {FRAGMENT_LABEL_KEYS, type Locale, type LocaleStrings} from './strings';
import {localeEn} from './en';
import {localeRu} from './ru';

/**
 * Locale used when none is supplied, and as the fallback for an unregistered
 * locale tag.
 */
export const DEFAULT_LOCALE = 'en';

/**
 * Locales shipped with the player.
 *
 * ── Adding a language ────────────────────────────────────────────────────────
 * 1. Copy `en.ts` to `<tag>.ts` and translate every value.
 * 2. Import it here and add one entry below.
 * That is the whole change — `locales.test.ts` then verifies the new table has
 * no missing keys, no empty strings, and the same `{placeholders}` as English.
 */
const BUILTIN_LOCALES = {
    en: localeEn,
    ru: localeRu,
} satisfies Record<string, LocaleStrings>;

const registry = new Map<string, LocaleStrings>(Object.entries(BUILTIN_LOCALES));

/**
 * Registers or replaces a locale at runtime, for languages that are not (yet)
 * shipped with the player.
 *
 * @example
 * ```ts
 * registerLocale('de', {...localeEn, commonOff: 'Aus'});
 * <VideoPlayer locale="de" />
 * ```
 */
export function registerLocale(locale: Locale, strings: LocaleStrings): void {
    registry.set(locale, strings);
}

/** Every currently registered locale tag. */
export function listLocales(): Locale[] {
    return [...registry.keys()];
}

/** Whether a locale tag can be resolved. */
export function hasLocale(locale: Locale): boolean {
    return registry.has(locale);
}

/**
 * Resolves a locale tag to its string table.
 *
 * Falls back to {@link DEFAULT_LOCALE} for unknown or omitted tags, so an
 * unrecognised language never renders raw keys.
 */
export function resolveLocaleStrings(locale?: Locale): LocaleStrings {
    if (locale) {
        const exact = registry.get(locale);
        if (exact) return exact;

        // Accept regional tags like "ru-RU" by falling back to the base language.
        const base = locale.split('-')[0];
        if (base && base !== locale) {
            const baseStrings = registry.get(base);
            if (baseStrings) return baseStrings;
        }
    }

    // BUILTIN_LOCALES always contains the default, so this cannot be undefined.
    return registry.get(DEFAULT_LOCALE) ?? localeEn;
}

/**
 * Fragment label for the active locale.
 *
 * Accepts a resolved string table (preferred) or a locale tag.
 */
export function getFragmentLabel(type: FragmentType, source: LocaleStrings | Locale): string {
    const t = typeof source === 'string' ? resolveLocaleStrings(source) : source;
    return t[FRAGMENT_LABEL_KEYS[type]];
}

function fragmentLabelsOf(t: LocaleStrings): Record<FragmentType, string> {
    return {
        opening: t.fragmentOpening,
        ending: t.fragmentEnding,
        preview: t.fragmentPreview,
        compilation: t.fragmentCompilation,
    };
}

/** @deprecated Use `getFragmentLabel(type, t)` — this cannot cover other locales. */
export const FRAGMENT_LABELS_RU: Record<FragmentType, string> = fragmentLabelsOf(localeRu);

/** @deprecated Use `getFragmentLabel(type, t)` — this cannot cover other locales. */
export const FRAGMENT_LABELS_EN: Record<FragmentType, string> = fragmentLabelsOf(localeEn);
