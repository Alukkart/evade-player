export { VideoPlayer } from './skins/default/skin';
export type { VideoPlayerProps } from './skins/default/skin';

export { EvadePlayerElement } from './web-component';

export { Player } from './skins/default/player';

export type {
  QualityOption,
  SeasonOption,
  EpisodeOption,
  VoiceoverOption,
  PlaybackState,
  PlayerSettings,
  SubtitleOption,
  AudioOption,
  SubtitleAppearance,
  SubtitleSettingOption,
  SubtitleSettingsView,
  SettingsView,
  Fragment,
  FragmentType,
  FragmentSettings,
} from './skins/default/types';

export {
  VOLUME_BOOST_OPTIONS,
  NORMALIZATION_OPTIONS,
  DEFAULT_VOLUME_BOOST,
  DEFAULT_NORMALIZATION,
  DEFAULT_SUBTITLE_APPEARANCE,
  SUBTITLE_FONT_SIZE_OPTIONS,
  SUBTITLE_COLOR_OPTIONS,
  SUBTITLE_BG_OPTIONS,
  SUBTITLE_EDGE_STYLE_OPTIONS,
  SUBTITLE_FONT_FAMILY_OPTIONS,
  SUBTITLE_POSITION_OPTIONS,
  DEFAULT_FRAGMENT_SETTINGS,
  FRAGMENT_COLORS,
} from './skins/default/types';

export {
  savePlaybackState,
  loadPlaybackState,
  clearPlaybackState,
} from './skins/default/utils/playback-state';

export {
  savePlayerSettings,
  loadPlayerSettings,
  clearPlayerSettings,
} from './skins/default/utils/settings-persistence';

export {
  applyVolumeBoost,
  applyNormalization,
  resumeOnUserInteraction,
  setMediaElement,
  releaseMediaElement,
  getAudioChainDebugInfo,
} from './skins/default/components/audio-chain';
export type { AudioChainDebugInfo } from './skins/default/components/audio-chain';

export { LocaleProvider } from './skins/default/components/locale-context';
export type { LocaleProviderProps } from './skins/default/components/locale-context';

export {
  DEFAULT_LOCALE,
  getFragmentLabel,
  hasLocale,
  listLocales,
  registerLocale,
  resolveLocaleStrings,
  formatLocaleString,
  resolveLocalizedLabel,
  localeEn,
  localeRu,
  FRAGMENT_LABELS_RU,
  FRAGMENT_LABELS_EN,
} from './skins/default/locales';
export type {
  BuiltinLocale,
  Locale,
  LocaleStrings,
  LocaleStringKey,
  LocalizableLabel,
} from './skins/default/locales';
