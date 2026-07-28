import {describe, expect, it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {SubtitleSettingsContent} from './subtitle-settings';
import {LocaleProvider} from './locale-context';
import {DEFAULT_SUBTITLE_APPEARANCE, type SubtitleSettingsView} from '../types';
import {localeEn, localeRu, type Locale} from '../locales';

const SETTING_VIEWS: SubtitleSettingsView[] = [
    'font-size',
    'text-color',
    'text-bg',
    'edge-style',
    'font-family',
    'position',
];

function render(locale: Locale, subSettingsView: SubtitleSettingsView | null): string {
    return renderToStaticMarkup(
        <LocaleProvider locale={locale}>
            <SubtitleSettingsContent
                subSettingsView={subSettingsView}
                subtitleAppearance={DEFAULT_SUBTITLE_APPEARANCE}
                onSubtitleAppearanceChange={() => {}}
                onSubSettingsViewChange={() => {}}
                onBack={() => {}}
            />
        </LocaleProvider>
    );
}

describe('SubtitleSettingsContent localization', () => {
    it.each(SETTING_VIEWS)('renders a translated heading for the "%s" submenu', (view) => {
        for (const locale of ['ru', 'en'] as const) {
            const html = render(locale, view);
            const strings = locale === 'ru' ? localeRu : localeEn;

            // Regression: the heading and aria-label used to render the raw
            // locale key (e.g. "subtitleFontSize") instead of the translation.
            for (const key of Object.keys(strings) as (keyof typeof strings)[]) {
                expect(html).not.toContain(`>${key}<`);
                expect(html).not.toContain(`aria-label="${key}"`);
            }
        }
    });

    it('translates the submenu heading and its aria-label', () => {
        const html = render('ru', 'font-size');
        expect(html).toContain(`<span>${localeRu.subtitleFontSize}</span>`);
        expect(html).toContain(`aria-label="${localeRu.subtitleFontSize}"`);
    });

    it('translates the current-value summary rows instead of using English labels', () => {
        const html = render('ru', null);

        // Regression: these rows preferred the hardcoded English `option.label`
        // over the locale tables, so they stayed English in the ru locale.
        expect(html).toContain(localeRu.fontSizeMedium);
        expect(html).toContain(localeRu.colorWhite);
        expect(html).toContain(localeRu.bgBlack);
        expect(html).toContain(localeRu.fontProportional);

        for (const english of ['Medium', 'White', 'Black', 'Proportional']) {
            expect(html).not.toContain(`<span>${english}</span>`);
        }
    });

    it('still renders English labels for the en locale', () => {
        const html = render('en', null);
        expect(html).toContain(localeEn.fontSizeMedium);
        expect(html).toContain(localeEn.colorWhite);
    });
});
