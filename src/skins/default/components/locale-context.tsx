'use client';

/* eslint-disable react-refresh/only-export-components */

import {createContext, useContext, useMemo, type ReactNode} from 'react';
import type {Locale, LocaleStrings} from '../locales';
import {DEFAULT_LOCALE, resolveLocaleStrings} from '../locales';

interface LocaleContextValue {
    locale: Locale;
    strings: LocaleStrings;
}

const LocaleContext = createContext<LocaleContextValue>({
    locale: DEFAULT_LOCALE,
    strings: resolveLocaleStrings(DEFAULT_LOCALE),
});

export interface LocaleProviderProps {
    /**
     * Locale tag. Built-in: `"en"` (default), `"ru"`. Any tag passed to
     * `registerLocale` also works. Unknown tags fall back to `DEFAULT_LOCALE`.
     */
    locale?: Locale;
    /**
     * Overrides for individual strings, merged over the resolved locale. Handy
     * for one-off wording changes or an unregistered language.
     */
    strings?: Partial<LocaleStrings>;
    children: ReactNode;
}

export function LocaleProvider({locale, strings, children}: LocaleProviderProps): ReactNode {
    const value = useMemo<LocaleContextValue>(() => {
        const resolved = locale ?? DEFAULT_LOCALE;
        const base = resolveLocaleStrings(resolved);
        return {
            locale: resolved,
            strings: strings ? {...base, ...strings} : base,
        };
    }, [locale, strings]);

    return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
    return useContext(LocaleContext);
}

export function useLocaleStrings(): LocaleStrings {
    return useContext(LocaleContext).strings;
}
