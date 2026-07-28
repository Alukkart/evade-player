import type {FragmentType} from '../types';

/** Locales shipped with the player. */
export type BuiltinLocale = 'en' | 'ru';

/**
 * A locale tag. Built-in locales are suggested by autocomplete, but any string
 * works once registered via `registerLocale`.
 */
export type Locale = BuiltinLocale | (string & {});

export interface LocaleStrings {
    commonAuto: string;
    commonBack: string;
    commonOk: string;
    commonOn: string;
    commonOff: string;
    commonDefault: string;

    settingsTrigger: string;
    settingsQuality: string;
    settingsSpeed: string;
    settingsSubtitles: string;
    settingsFragments: string;
    settingsAudio: string;
    settingsVideoQuality: string;
    settingsPlaybackRate: string;
    settingsTextStyle: string;
    settingsVolumeBoost: string;
    settingsNormalization: string;
    settingsFullscreenScale: string;
    settingsSleepTimer: string;
    settingsSampleSubtitle: string;

    errorTitle: string;

    resumeContinueFrom: string;
    resumeResume: string;
    resumeDismiss: string;

    nextEpisodeUpNext: string;
    nextEpisodePlay: string;
    nextEpisodeCancel: string;
    nextEpisodeAutoplayIn: string;

    selectorSeason: string;
    selectorEpisode: string;
    selectorVoiceover: string;

    qualityTrack: string;

    subtitlesOff: string;
    subtitlesTrack: string;

    fragmentOpening: string;
    fragmentEnding: string;
    fragmentPreview: string;
    fragmentCompilation: string;

    subtitleFontSize: string;
    subtitleTextColor: string;
    subtitleTextBg: string;
    subtitleEdgeStyle: string;
    subtitleFontFamily: string;
    subtitlePosition: string;

    fontSizeSmall: string;
    fontSizeMedium: string;
    fontSizeLarge: string;

    colorWhite: string;
    colorYellow: string;
    colorGreen: string;
    colorCyan: string;
    colorBlue: string;
    colorMagenta: string;
    colorRed: string;

    bgBlack: string;
    bgWhite: string;
    bgYellow: string;
    bgGreen: string;
    bgCyan: string;
    bgBlue: string;
    bgMagenta: string;
    bgRed: string;
    bgNone: string;

    edgeNone: string;
    edgeRaised: string;
    edgeDepressed: string;
    edgeOutline: string;
    edgeDropShadow: string;

    fontProportional: string;
    fontMonospace: string;
    fontSansSerif: string;
    fontSerif: string;
    fontCasual: string;
    fontCursive: string;
    fontSmallCaps: string;

    positionLow: string;
    positionDefault: string;
    positionHigh: string;
    positionVeryHigh: string;

    volumeBoost50: string;
    volumeBoost100: string;
    volumeBoost150: string;
    volumeBoost200: string;
    volumeBoost300: string;

    normalizationOff: string;
    normalizationLight: string;
    normalizationMedium: string;
    normalizationStrong: string;

    fullscreenScaleContain: string;
    fullscreenScaleFill: string;
    fullscreenScaleCover: string;

    sleepTimerOff: string;
    sleepTimerMinutes: string;
}

/** Any key of the string table — used to tag player-generated labels. */
export type LocaleStringKey = keyof LocaleStrings;

/**
 * Substitutes `{placeholder}` tokens in a locale string.
 *
 * Unknown placeholders are left untouched, so a translation that forgets one
 * degrades to visible `{token}` text rather than `undefined`.
 */
export function formatLocaleString(
    template: string,
    params?: Record<string, string | number>
): string {
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (match, token: string) => {
        const value = params[token];
        return value === undefined ? match : String(value);
    });
}

/**
 * Describes a label that the player generated itself (as opposed to one the
 * consumer supplied), so the UI can translate it at render time.
 */
export interface LocalizableLabel {
    /** Untranslated fallback, kept for consumers reading options directly. */
    label: string;
    /** Locale key to render instead of `label`. */
    labelKey?: LocaleStringKey;
    /** Values interpolated into the `labelKey` template. */
    labelParams?: Record<string, string | number>;
}

/**
 * Resolves the text to display for an option, preferring the translation over
 * the untranslated `label`.
 */
export function resolveLocalizedLabel(option: LocalizableLabel, t: LocaleStrings): string {
    if (!option.labelKey) return option.label;
    return formatLocaleString(t[option.labelKey], option.labelParams);
}

// --- Option label resolvers ---

type LabelValueMap = Record<string, keyof LocaleStrings>;

const FONT_SIZE_MAP: LabelValueMap = {
    small: 'fontSizeSmall',
    medium: 'fontSizeMedium',
    large: 'fontSizeLarge',
};

const COLOR_MAP: LabelValueMap = {
    white: 'colorWhite',
    yellow: 'colorYellow',
    green: 'colorGreen',
    cyan: 'colorCyan',
    blue: 'colorBlue',
    magenta: 'colorMagenta',
    red: 'colorRed',
};

const BG_MAP: LabelValueMap = {
    black: 'bgBlack',
    white: 'bgWhite',
    yellow: 'bgYellow',
    green: 'bgGreen',
    cyan: 'bgCyan',
    blue: 'bgBlue',
    magenta: 'bgMagenta',
    red: 'bgRed',
    none: 'bgNone',
};

const EDGE_STYLE_MAP: LabelValueMap = {
    none: 'edgeNone',
    raised: 'edgeRaised',
    depressed: 'edgeDepressed',
    uniform: 'edgeOutline',
    dropshadow: 'edgeDropShadow',
};

const FONT_FAMILY_MAP: LabelValueMap = {
    proportional: 'fontProportional',
    monospace: 'fontMonospace',
    'sans-serif': 'fontSansSerif',
    serif: 'fontSerif',
    casual: 'fontCasual',
    cursive: 'fontCursive',
    'small-caps': 'fontSmallCaps',
};

const POSITION_MAP: LabelValueMap = {
    low: 'positionLow',
    default: 'positionDefault',
    high: 'positionHigh',
    'very-high': 'positionVeryHigh',
};

const VOLUME_BOOST_MAP: LabelValueMap = {
    '50': 'volumeBoost50',
    '100': 'volumeBoost100',
    '150': 'volumeBoost150',
    '200': 'volumeBoost200',
    '300': 'volumeBoost300',
};

const NORMALIZATION_MAP: LabelValueMap = {
    off: 'normalizationOff',
    light: 'normalizationLight',
    medium: 'normalizationMedium',
    strong: 'normalizationStrong',
};

const FULLSCREEN_SCALE_MAP: LabelValueMap = {
    contain: 'fullscreenScaleContain',
    fill: 'fullscreenScaleFill',
    cover: 'fullscreenScaleCover',
};

function resolveOptionLabel(value: string, map: LabelValueMap, t: LocaleStrings, fallback: string): string {
    const key = map[value];
    return key ? t[key] : fallback;
}

export function getFontSizeLabel(value: string, t: LocaleStrings): string {
    return resolveOptionLabel(value, FONT_SIZE_MAP, t, value);
}

export function getColorLabel(value: string, t: LocaleStrings): string {
    return resolveOptionLabel(value, COLOR_MAP, t, value);
}

export function getBgLabel(value: string, t: LocaleStrings): string {
    return resolveOptionLabel(value, BG_MAP, t, value);
}

export function getEdgeStyleLabel(value: string, t: LocaleStrings): string {
    return resolveOptionLabel(value, EDGE_STYLE_MAP, t, value);
}

export function getFontFamilyLabel(value: string, t: LocaleStrings): string {
    return resolveOptionLabel(value, FONT_FAMILY_MAP, t, value);
}

export function getPositionLabel(value: string, t: LocaleStrings): string {
    return resolveOptionLabel(value, POSITION_MAP, t, value);
}

export function getVolumeBoostLabel(value: string, t: LocaleStrings): string {
    return resolveOptionLabel(value, VOLUME_BOOST_MAP, t, value);
}

export function getNormalizationLabel(value: string, t: LocaleStrings): string {
    return resolveOptionLabel(value, NORMALIZATION_MAP, t, value);
}

export function getFullscreenScaleLabel(value: string, t: LocaleStrings): string {
    return resolveOptionLabel(value, FULLSCREEN_SCALE_MAP, t, value);
}

export function getSleepTimerLabel(value: string, t: LocaleStrings): string {
    if (value === 'off') return t.sleepTimerOff;
    return formatLocaleString(t.sleepTimerMinutes, {minutes: value});
}

export const FRAGMENT_LABEL_KEYS: Record<FragmentType, keyof LocaleStrings> = {
    opening: 'fragmentOpening',
    ending: 'fragmentEnding',
    preview: 'fragmentPreview',
    compilation: 'fragmentCompilation',
};
