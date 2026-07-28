// Registers the <evade-player> custom element as a side effect.
import './web-component';

export {EvadePlayerElement} from './web-component';

// Locale API, so script-tag consumers can add or override a language without
// a bundler. In the IIFE build these hang off the `EvadePlayer` global.
export {
    DEFAULT_LOCALE,
    getFragmentLabel,
    hasLocale,
    listLocales,
    registerLocale,
    resolveLocaleStrings,
    formatLocaleString,
    localeEn,
    localeRu,
} from './skins/default/locales';
export type {
    BuiltinLocale,
    Locale,
    LocaleStrings,
    LocaleStringKey,
} from './skins/default/locales';
