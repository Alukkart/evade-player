import type {LocaleStringKey} from './locales/strings';

export interface QualityOption {
    label: string;
    src: string;
    /**
     * Set by the player when it generated `label` itself (e.g. "Auto"), so the
     * UI can translate it. Leave unset when supplying your own label.
     */
    labelKey?: LocaleStringKey;
    /** Values interpolated into the `labelKey` template. */
    labelParams?: Record<string, string | number>;
}

export interface QualityMenuOption extends QualityOption {
    value: string;
}

export interface SubtitleOption {
    value: string;
    label: string;
    /** See {@link QualityOption.labelKey}. */
    labelKey?: LocaleStringKey;
    /** Values interpolated into the `labelKey` template. */
    labelParams?: Record<string, string | number>;
}

export interface AudioOption {
    value: string;
    label: string;
}

export interface SeasonOption {
    label: string;
    value: string;
    episodes?: EpisodeOption[];
}

export interface EpisodeOption {
    label: string;
    value: string;
    src?: string;
    voiceovers?: VoiceoverOption[];
}

export interface VoiceoverOption {
    label: string;
    value: string;
    src?: string;
    episodes?: EpisodeOption[];
}

export interface PlaybackState {
    time: number;
    season?: string;
    episode?: string;
    voiceover?: string;
}

export const AUTO_QUALITY_VALUE = '__auto__';
export const SUBTITLES_OFF_VALUE = '__subtitles_off__';
export const AUDIO_OFF_VALUE = '__audio_off__';
export const SLEEP_TIMER_OFF_VALUE = 'off';

export interface SubtitleAppearance {
    fontSize: string;
    textColor: string;
    textBg: string;
    edgeStyle: string;
    fontFamily: string;
    position: string;
}

export interface SubtitleSettingOption {
    value: string;
    label: string;
    css: string;
}

export type SubtitleSettingsView = 'font-size' | 'text-color' | 'text-bg' | 'edge-style' | 'font-family' | 'position';

export const SUBTITLE_FONT_SIZE_OPTIONS: SubtitleSettingOption[] = [
    {value: 'small', label: 'Small', css: '1.1rem'},
    {value: 'medium', label: 'Medium', css: '1.5rem'},
    {value: 'large', label: 'Large', css: '2rem'},
];

export const SUBTITLE_COLOR_OPTIONS: SubtitleSettingOption[] = [
    {value: 'white', label: 'White', css: '#FFFFFF'},
    {value: 'yellow', label: 'Yellow', css: '#FFFF00'},
    {value: 'green', label: 'Green', css: '#00FF00'},
    {value: 'cyan', label: 'Cyan', css: '#00FFFF'},
    {value: 'blue', label: 'Blue', css: '#00BFFF'},
    {value: 'magenta', label: 'Magenta', css: '#FF00FF'},
    {value: 'red', label: 'Red', css: '#FF0000'},
];

export const SUBTITLE_BG_OPTIONS: SubtitleSettingOption[] = [
    {value: 'black', label: 'Black', css: 'rgba(0,0,0,0.8)'},
    {value: 'white', label: 'White', css: 'rgba(255,255,255,0.8)'},
    {value: 'yellow', label: 'Yellow', css: 'rgba(255,255,0,0.8)'},
    {value: 'green', label: 'Green', css: 'rgba(0,255,0,0.8)'},
    {value: 'cyan', label: 'Cyan', css: 'rgba(0,255,255,0.8)'},
    {value: 'blue', label: 'Blue', css: 'rgba(0,191,255,0.8)'},
    {value: 'magenta', label: 'Magenta', css: 'rgba(255,0,255,0.8)'},
    {value: 'red', label: 'Red', css: 'rgba(255,0,0,0.8)'},
    {value: 'none', label: 'None', css: 'transparent'},
];

export const SUBTITLE_EDGE_STYLE_OPTIONS: SubtitleSettingOption[] = [
    {value: 'none', label: 'None', css: 'none'},
    {value: 'raised', label: 'Raised', css: '2px 2px 4px rgba(0,0,0,1), -1px -1px 1px rgba(0,0,0,0.4)'},
    {value: 'depressed', label: 'Depressed', css: '-2px -2px 4px rgba(0,0,0,1), 1px 1px 1px rgba(0,0,0,0.4)'},
    {value: 'uniform', label: 'Outline', css: '0 0 2px #000, 0 0 2px #000, 0 0 2px #000, 0 0 2px #000'},
    {value: 'dropshadow', label: 'Drop shadow', css: '2px 2px 4px rgba(0,0,0,1)'},
];

export const SUBTITLE_FONT_FAMILY_OPTIONS: SubtitleSettingOption[] = [
    {value: 'proportional', label: 'Proportional', css: 'sans-serif'},
    {value: 'monospace', label: 'Monospace', css: 'monospace'},
    {value: 'sans-serif', label: 'Sans-serif', css: 'sans-serif'},
    {value: 'serif', label: 'Serif', css: 'serif'},
    {value: 'casual', label: 'Casual', css: '"Comic Sans MS", cursive'},
    {value: 'cursive', label: 'Cursive', css: 'cursive'},
    {value: 'small-caps', label: 'Small caps', css: 'small-caps'},
];

export const SUBTITLE_POSITION_OPTIONS: SubtitleSettingOption[] = [
    {value: 'low', label: 'Low', css: '0rem'},
    {value: 'default', label: 'Default', css: '1.5rem'},
    {value: 'high', label: 'High', css: '3rem'},
    {value: 'very-high', label: 'Very high', css: '5rem'},
];

export const VOLUME_BOOST_OPTIONS: SubtitleSettingOption[] = [
    {value: '50', label: '50%', css: '0.5'},
    {value: '100', label: '100%', css: '1'},
    {value: '150', label: '150%', css: '1.5'},
    {value: '200', label: '200%', css: '2'},
    {value: '300', label: '300%', css: '3'},
];

export const NORMALIZATION_OPTIONS: SubtitleSettingOption[] = [
    {value: 'off', label: 'Off', css: '0'},
    {value: 'light', label: 'Light', css: '1'},
    {value: 'medium', label: 'Medium', css: '2'},
    {value: 'strong', label: 'Strong', css: '3'},
];

export const DEFAULT_VOLUME_BOOST = '100';
export const DEFAULT_NORMALIZATION = 'off';
export const DEFAULT_FULLSCREEN_SCALE = 'contain';

export type FullscreenScale = 'contain' | 'fill' | 'cover';

export interface FullscreenScaleOption {
    value: FullscreenScale;
    label: string;
    css: string;
}

export const FULLSCREEN_SCALE_OPTIONS: FullscreenScaleOption[] = [
    {value: 'contain', label: 'None', css: 'contain'},
    {value: 'fill', label: 'Stretch', css: 'fill'},
    {value: 'cover', label: 'Crop', css: 'cover'},
];

export interface SleepTimerOption {
    value: string;
    minutes: number | null;
}

export const SLEEP_TIMER_OPTIONS: SleepTimerOption[] = [
    {value: SLEEP_TIMER_OFF_VALUE, minutes: null},
    {value: '5', minutes: 5},
    {value: '10', minutes: 10},
    {value: '15', minutes: 15},
    {value: '30', minutes: 30},
    {value: '60', minutes: 60},
    {value: '90', minutes: 90},
    {value: '120', minutes: 120},
];

export interface PlayerSettings {
    volume: number;
    muted: boolean;
    playbackRate: number;
    subtitleAppearance: SubtitleAppearance;
    volumeBoost: string;
    normalization: string;
    fullscreenScale: FullscreenScale;
    fragmentSettings: FragmentSettings;
}

export const DEFAULT_SUBTITLE_APPEARANCE: SubtitleAppearance = {
    fontSize: 'medium',
    textColor: 'white',
    textBg: 'black',
    edgeStyle: 'none',
    fontFamily: 'proportional',
    position: 'default',
};

export type FragmentType = 'opening' | 'ending' | 'preview' | 'compilation';

export interface Fragment {
    type: FragmentType;
    startTime: number;
    endTime: number;
    label?: string;
}

export interface FragmentSettings {
    autoSkipOpening: boolean;
    autoSkipEnding: boolean;
    autoSkipPreview: boolean;
    autoSkipCompilation: boolean;
}

export const DEFAULT_FRAGMENT_SETTINGS: FragmentSettings = {
    autoSkipOpening: false,
    autoSkipEnding: false,
    autoSkipPreview: false,
    autoSkipCompilation: false,
};

export const FRAGMENT_COLORS: Record<FragmentType, string> = {
    opening: '#06b6d4',
    ending: '#a855f7',
    preview: '#22c55e',
    compilation: '#f59e0b',
};

export type SettingsView = 'root' | 'quality' | 'subtitles' | 'subtitles-settings' | 'audio' | 'season' | 'episode' | 'speed' | 'fragments' | 'fullscreen-scale' | 'sleep-timer';
