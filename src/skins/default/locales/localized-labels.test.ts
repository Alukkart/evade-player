import {describe, expect, it} from 'vitest';
import {localeEn, localeRu, resolveLocalizedLabel} from './index';
import {
    buildQualityMenuOptions,
    getActiveSubtitleValue,
    getQualityOptions,
    getSubtitleOptions,
    parseHlsMasterPlaylist,
} from '../utils';
import {makeMediaElement, makeTextTrack} from '../../../test-utils/media';

const MASTER = 'https://cdn.example.com/master.m3u8';

/**
 * Regression coverage for player-generated labels. These used to be hardcoded
 * English strings that no locale could override, because the UI read
 * `option.label` before ever consulting the string table.
 */
describe('player-generated labels are localized', () => {
    it('translates the subtitles "Off" entry', () => {
        const [off] = getSubtitleOptions(null);

        expect(off?.label).toBe('Off'); // untranslated fallback is preserved
        expect(resolveLocalizedLabel(off!, localeRu)).toBe('Выкл');
        expect(resolveLocalizedLabel(off!, localeEn)).toBe('Off');
    });

    it('translates the quality "Auto" entry', () => {
        const options = buildQualityMenuOptions(
            [{label: '720p', src: 'https://cdn.example.com/720.m3u8'}],
            MASTER
        );
        const auto = options[0];

        expect(auto?.label).toBe('Auto');
        expect(resolveLocalizedLabel(auto!, localeRu)).toBe('Авто');
        expect(resolveLocalizedLabel(auto!, localeEn)).toBe('Auto');
    });

    it('translates the synthetic entry for a source outside the quality list', () => {
        const [synthetic] = getQualityOptions([], 'https://cdn.example.com/unlisted.m3u8');

        expect(resolveLocalizedLabel(synthetic!, localeRu)).toBe('Авто');
    });

    it('translates an unnamed subtitle track with its index', () => {
        // A track with neither label nor language: the player names it itself.
        const generated = {value: 'track:0', label: 'Track 1', labelKey: 'subtitlesTrack' as const, labelParams: {index: 1}};

        expect(resolveLocalizedLabel(generated, localeRu)).toBe('Дорожка 1');
        expect(resolveLocalizedLabel(generated, localeEn)).toBe('Track 1');
    });

    it('translates a quality variant that has no resolution or bitrate', () => {
        const manifest = [
            '#EXTM3U',
            '#EXT-X-STREAM-INF:CODECS="avc1.4d401f,mp4a.40.2"',
            'variant.m3u8',
        ].join('\n');

        const [variant] = parseHlsMasterPlaylist(MASTER, manifest);

        expect(variant?.label).toBe('Quality 1');
        expect(resolveLocalizedLabel(variant!, localeRu)).toBe('Качество 1');
        expect(resolveLocalizedLabel(variant!, localeEn)).toBe('Quality 1');
    });

    it('never translates a label the consumer supplied', () => {
        const options = buildQualityMenuOptions([{label: '1080p', src: 'https://cdn.example.com/1080.m3u8'}], MASTER);
        const userSupplied = options.find((option) => option.label === '1080p');

        expect(userSupplied?.labelKey).toBeUndefined();
        expect(resolveLocalizedLabel(userSupplied!, localeRu)).toBe('1080p');
    });

    it('never translates a track name that came from the media itself', () => {
        const media = makeMediaElement([makeTextTrack('subtitles', 'Deutsch', 'de')]);
        const named = getSubtitleOptions(media)[1];

        expect(named?.labelKey).toBeUndefined();
        expect(resolveLocalizedLabel(named!, localeRu)).toBe('Deutsch');
    });

    it('translates an unnamed track end to end, straight from the media element', () => {
        const media = makeMediaElement([makeTextTrack('subtitles', '', '')]);
        const unnamed = getSubtitleOptions(media)[1];

        expect(unnamed?.label).toBe('Track 1');
        expect(resolveLocalizedLabel(unnamed!, localeRu)).toBe('Дорожка 1');
        expect(resolveLocalizedLabel(unnamed!, localeEn)).toBe('Track 1');
    });

    it('keeps the active-subtitle value pointing at the Off entry by default', () => {
        const options = getSubtitleOptions(null);
        const active = options.find((option) => option.value === getActiveSubtitleValue(null));

        expect(resolveLocalizedLabel(active!, localeRu)).toBe('Выкл');
    });
});
