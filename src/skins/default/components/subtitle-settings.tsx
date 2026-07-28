import type {ReactNode} from 'react';
import {ChevronLeft, Check} from 'lucide-react';
import type {SubtitleAppearance, SubtitleSettingsView, SubtitleSettingOption} from '../types';
import {
    SUBTITLE_FONT_SIZE_OPTIONS,
    SUBTITLE_COLOR_OPTIONS,
    SUBTITLE_BG_OPTIONS,
    SUBTITLE_EDGE_STYLE_OPTIONS,
    SUBTITLE_FONT_FAMILY_OPTIONS,
    SUBTITLE_POSITION_OPTIONS,
} from '../types';
import {useLocaleStrings} from './locale-context';
import {
    getFontSizeLabel,
    getColorLabel,
    getBgLabel,
    getEdgeStyleLabel,
    getFontFamilyLabel,
    getPositionLabel,
} from '../locales';

function isMenuActionKey(key: string): boolean {
    return key === 'Enter' || key === ' ';
}

function renderSubSettingOptions(
    setting: SubtitleSettingsView,
    options: readonly SubtitleSettingOption[],
    currentValue: string,
    onChange: (value: string) => void,
    onBack: () => void,
    t: ReturnType<typeof useLocaleStrings>,
): ReactNode {
    return (
        <>
            <div className="media-menu__item media-menu__item--back" role="menuitem" tabIndex={0}
                 aria-label={t.commonBack}
                 onClick={onBack}
                 onKeyDown={(event) => {
                     if (!isMenuActionKey(event.key)) return;
                     event.preventDefault();
                     onBack();
                 }}>
                <span className="media-settings__label">
                    <ChevronLeft className="media-icon"/>
                    <span>{getSettingLabel(setting, t)}</span>
                </span>
            </div>
            <div className="media-menu__group" role="radiogroup" aria-label={getSettingLabel(setting, t)}>
                {options.map((option) => (
                    <div key={option.value}
                         className="media-menu__item"
                         role="radio"
                         aria-checked={option.value === currentValue}
                         tabIndex={0}
                         onClick={() => onChange(option.value)}
                         onKeyDown={(event) => {
                             if (!isMenuActionKey(event.key)) return;
                             event.preventDefault();
                             onChange(option.value);
                         }}>
                        <span>{getOptionLabel(setting, option.value, t)}</span>
                        {option.value === currentValue && (
                            <Check className="media-icon media-menu__indicator"/>
                        )}
                    </div>
                ))}
            </div>
        </>
    );
}

const SUBTITLE_SETTING_LABELS: Record<SubtitleSettingsView, keyof ReturnType<typeof useLocaleStrings>> = {
    'font-size': 'subtitleFontSize',
    'text-color': 'subtitleTextColor',
    'text-bg': 'subtitleTextBg',
    'edge-style': 'subtitleEdgeStyle',
    'font-family': 'subtitleFontFamily',
    'position': 'subtitlePosition',
};

const SUBTITLE_SETTING_VIEWS: {key: SubtitleSettingsView; options: readonly SubtitleSettingOption[]; prop: keyof SubtitleAppearance}[] = [
    {key: 'font-size', options: SUBTITLE_FONT_SIZE_OPTIONS, prop: 'fontSize'},
    {key: 'text-color', options: SUBTITLE_COLOR_OPTIONS, prop: 'textColor'},
    {key: 'text-bg', options: SUBTITLE_BG_OPTIONS, prop: 'textBg'},
    {key: 'edge-style', options: SUBTITLE_EDGE_STYLE_OPTIONS, prop: 'edgeStyle'},
    {key: 'font-family', options: SUBTITLE_FONT_FAMILY_OPTIONS, prop: 'fontFamily'},
    {key: 'position', options: SUBTITLE_POSITION_OPTIONS, prop: 'position'},
];

function getOptionLabel(setting: SubtitleSettingsView, value: string, t: ReturnType<typeof useLocaleStrings>): string {
    switch (setting) {
        case 'font-size': return getFontSizeLabel(value, t);
        case 'text-color': return getColorLabel(value, t);
        case 'text-bg': return getBgLabel(value, t);
        case 'edge-style': return getEdgeStyleLabel(value, t);
        case 'font-family': return getFontFamilyLabel(value, t);
        case 'position': return getPositionLabel(value, t);
    }
}

function getSettingLabel(setting: SubtitleSettingsView, t: ReturnType<typeof useLocaleStrings>): string {
    return t[SUBTITLE_SETTING_LABELS[setting]];
}

function getCurrentOptionLabel(setting: SubtitleSettingsView, options: readonly SubtitleSettingOption[], value: string, t: ReturnType<typeof useLocaleStrings>): string {
    // Prefer the localized label; option.label is an untranslated English fallback
    // for values that have no entry in the locale tables.
    const localized = getOptionLabel(setting, value, t);
    if (localized !== value) return localized;
    return options.find((o) => o.value === value)?.label ?? t.commonDefault;
}

interface SubtitleSettingsContentProps {
    subSettingsView: SubtitleSettingsView | null;
    subtitleAppearance: SubtitleAppearance;
    onSubtitleAppearanceChange: (update: Partial<SubtitleAppearance>) => void;
    onSubSettingsViewChange: (view: SubtitleSettingsView | null) => void;
    onBack: () => void;
}

export function SubtitleSettingsContent({
    subSettingsView,
    subtitleAppearance,
    onSubtitleAppearanceChange,
    onSubSettingsViewChange,
    onBack,
}: SubtitleSettingsContentProps): ReactNode {
    const t = useLocaleStrings();

    if (subSettingsView === null) {
        return (
            <div className="media-menu__submenu">
                <div className="media-menu__item media-menu__item--back" role="menuitem" tabIndex={0}
                 aria-label={t.commonBack}
                     onClick={onBack}
                     onKeyDown={(event) => {
                         if (!isMenuActionKey(event.key)) return;
                         event.preventDefault();
                         onBack();
                     }}>
                    <span className="media-settings__label">
                        <ChevronLeft className="media-icon"/>
                        <span>{t.settingsTextStyle}</span>
                    </span>
                </div>
                <div className="media-menu__group">
                    {SUBTITLE_SETTING_VIEWS.map(({key, options, prop}) => (
                        <SubSettingEntry
                            key={key}
                            label={getSettingLabel(key, t)}
                            valueLabel={getCurrentOptionLabel(key, options, subtitleAppearance[prop], t)}
                            onClick={() => onSubSettingsViewChange(key)}
                        />
                    ))}
                </div>
            </div>
        );
    }

    const view = SUBTITLE_SETTING_VIEWS.find((v) => v.key === subSettingsView);
    if (!view) return null;

    const currentValue = subtitleAppearance[view.prop];

    return (
        <div className="media-menu__submenu">
            {renderSubSettingOptions(
                subSettingsView,
                view.options,
                currentValue,
                (value) => onSubtitleAppearanceChange({[view.prop]: value}),
                () => onSubSettingsViewChange(null),
                t,
            )}
        </div>
    );
}

function SubSettingEntry({label, valueLabel, onClick}: { label: string; valueLabel: string; onClick: () => void }): ReactNode {
    return (
        <div className="media-menu__item media-menu__item--submenu media-settings__entry" role="menuitem" tabIndex={0}
             onClick={onClick}
             onKeyDown={(event) => {
                 if (!isMenuActionKey(event.key)) return;
                 event.preventDefault();
                 onClick();
             }}>
            <span className="media-settings__label">
                <span>{label}</span>
            </span>
            <span>{valueLabel}</span>
        </div>
    );
}
