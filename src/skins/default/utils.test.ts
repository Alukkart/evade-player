import {describe, it, expect} from 'vitest';
import {
    isString,
    getQualityOptions,
    parseHlsMasterPlaylist,
    buildQualityMenuOptions,
    resolveActiveQualityValue,
    isHlsSource,
    getSubtitleOptions,
    getActiveSubtitleValue,
} from './utils';
import {AUTO_QUALITY_VALUE, SUBTITLES_OFF_VALUE} from './types';
import {makeMediaElement, makeTextTrack} from '../../test-utils/media';

// ---------------------------------------------------------------------------
// isString
// ---------------------------------------------------------------------------

describe('isString', () => {
    it('returns true for strings', () => {
        expect(isString('hello')).toBe(true);
        expect(isString('')).toBe(true);
    });

    it('returns false for non-strings', () => {
        expect(isString(42)).toBe(false);
        expect(isString(null)).toBe(false);
        expect(isString(undefined)).toBe(false);
        expect(isString({})).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// isHlsSource
// ---------------------------------------------------------------------------

describe('isHlsSource', () => {
    it('recognises .m3u8 URLs', () => {
        expect(isHlsSource('https://example.com/stream.m3u8')).toBe(true);
        expect(isHlsSource('https://example.com/STREAM.M3U8')).toBe(true);
    });

    it('rejects non-HLS URLs and null', () => {
        expect(isHlsSource('https://example.com/video.mp4')).toBe(false);
        expect(isHlsSource(null)).toBe(false);
        expect(isHlsSource('')).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// getQualityOptions
// ---------------------------------------------------------------------------

describe('getQualityOptions', () => {
    it('deduplicates options by src', () => {
        const options = [
            {label: '1080p', src: 'https://cdn/1080.m3u8'},
            {label: '1080p dup', src: 'https://cdn/1080.m3u8'},
            {label: '720p', src: 'https://cdn/720.m3u8'},
        ];
        const result = getQualityOptions(options, null);
        expect(result).toHaveLength(2);
        expect(result[0]?.label).toBe('1080p');
    });

    it('adds source as Auto when source is not in options list', () => {
        const options = [{label: '720p', src: 'https://cdn/720.m3u8'}];
        const result = getQualityOptions(options, 'https://cdn/master.m3u8');
        expect(result).toHaveLength(2);
        const added = result.find((o) => o.src === 'https://cdn/master.m3u8');
        expect(added?.label).toBe('Auto');
    });

    it('does not add source when it already exists in options', () => {
        const src = 'https://cdn/720.m3u8';
        const options = [{label: '720p', src}];
        const result = getQualityOptions(options, src);
        expect(result).toHaveLength(1);
    });

    it('filters out options with blank src', () => {
        const options = [
            {label: 'Bad', src: '   '},
            {label: '720p', src: 'https://cdn/720.m3u8'},
        ];
        const result = getQualityOptions(options, null);
        expect(result).toHaveLength(1);
    });

    it('returns empty array for undefined options and null source', () => {
        expect(getQualityOptions(undefined, null)).toHaveLength(0);
    });
});

// ---------------------------------------------------------------------------
// parseHlsMasterPlaylist
// ---------------------------------------------------------------------------

const MASTER_URL = 'https://cdn.example.com/stream/master.m3u8';

const MASTER_PLAYLIST = `#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360,CODECS="avc1.42c01e,mp4a.40.2"
360p/index.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2000000,RESOLUTION=1280x720,CODECS="avc1.4d401f,mp4a.40.2"
720p/index.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=4000000,RESOLUTION=1920x1080,CODECS="avc1.640028,mp4a.40.2"
1080p/index.m3u8
`;

describe('parseHlsMasterPlaylist', () => {
    it('extracts streams with resolution labels', () => {
        const options = parseHlsMasterPlaylist(MASTER_URL, MASTER_PLAYLIST);
        expect(options).toHaveLength(3);
        expect(options.map((o) => o.label)).toEqual(['360p', '720p', '1080p']);
    });

    it('resolves relative URIs against master URL', () => {
        const options = parseHlsMasterPlaylist(MASTER_URL, MASTER_PLAYLIST);
        expect(options[0]?.src).toBe('https://cdn.example.com/stream/360p/index.m3u8');
    });

    it('falls back to Mbps label when no RESOLUTION attribute', () => {
        const playlist = `#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=2500000,AUDIO="audio",CODECS="avc1.4d401f,mp4a.40.2"
mid/index.m3u8
`;
        const options = parseHlsMasterPlaylist(MASTER_URL, playlist);
        expect(options[0]?.label).toMatch(/Mbps/);
    });

    it('skips streams without audio codec or AUDIO attribute', () => {
        const playlist = `#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360,CODECS="avc1.42c01e"
360p/index.m3u8
`;
        const options = parseHlsMasterPlaylist(MASTER_URL, playlist);
        expect(options).toHaveLength(0);
    });

    it('deduplicates streams with the same URL', () => {
        const playlist = `#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360,CODECS="avc1.42c01e,mp4a.40.2"
360p/index.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=900000,RESOLUTION=640x360,CODECS="avc1.42c01e,mp4a.40.2"
360p/index.m3u8
`;
        const options = parseHlsMasterPlaylist(MASTER_URL, playlist);
        expect(options).toHaveLength(1);
    });

    it('returns empty array for empty playlist', () => {
        expect(parseHlsMasterPlaylist(MASTER_URL, '')).toHaveLength(0);
    });
});

// ---------------------------------------------------------------------------
// buildQualityMenuOptions
// ---------------------------------------------------------------------------

describe('buildQualityMenuOptions', () => {
    const masterSrc = 'https://cdn/master.m3u8';
    const rawOptions = [
        {label: '360p', src: 'https://cdn/360.m3u8'},
        {label: '1080p', src: 'https://cdn/1080.m3u8'},
        {label: '720p', src: 'https://cdn/720.m3u8'},
    ];

    it('sorts options by resolution ascending', () => {
        const result = buildQualityMenuOptions(rawOptions, masterSrc);
        const labels = result.map((o) => o.label).filter((l) => l !== 'Auto');
        expect(labels).toEqual(['360p', '720p', '1080p']);
    });

    it('prepends Auto option for HLS master source', () => {
        const result = buildQualityMenuOptions(rawOptions, masterSrc);
        expect(result[0]?.value).toBe(AUTO_QUALITY_VALUE);
        expect(result[0]?.label).toBe('Auto');
    });

    it('does not prepend Auto for non-HLS source', () => {
        const result = buildQualityMenuOptions(rawOptions, 'https://cdn/master.mp4');
        expect(result.every((o) => o.value !== AUTO_QUALITY_VALUE)).toBe(true);
    });

    it('excludes the master source from the list items', () => {
        const withMaster = [...rawOptions, {label: 'Master', src: masterSrc}];
        const result = buildQualityMenuOptions(withMaster, masterSrc);
        expect(result.every((o) => o.src !== masterSrc || o.value === AUTO_QUALITY_VALUE)).toBe(true);
    });

    it('normalises common quality aliases', () => {
        const options = [
            {label: 'HD', src: 'https://cdn/hd.m3u8'},
            {label: 'FHD', src: 'https://cdn/fhd.m3u8'},
            {label: '4K', src: 'https://cdn/4k.m3u8'},
        ];
        const result = buildQualityMenuOptions(options, masterSrc);
        const labels = result.map((o) => o.label);
        expect(labels).toContain('720p');
        expect(labels).toContain('1080p');
        expect(labels).toContain('2160p');
    });
});

// ---------------------------------------------------------------------------
// resolveActiveQualityValue
// ---------------------------------------------------------------------------

describe('resolveActiveQualityValue', () => {
    const masterSrc = 'https://cdn/master.m3u8';
    const options = [
        {label: 'Auto', src: masterSrc, value: AUTO_QUALITY_VALUE},
        {label: '720p', src: 'https://cdn/720.m3u8', value: 'https://cdn/720.m3u8'},
        {label: '1080p', src: 'https://cdn/1080.m3u8', value: 'https://cdn/1080.m3u8'},
    ];

    it('returns AUTO_QUALITY_VALUE when source equals master', () => {
        expect(resolveActiveQualityValue(options, masterSrc, masterSrc)).toBe(AUTO_QUALITY_VALUE);
    });

    it('finds the matching option by src', () => {
        expect(resolveActiveQualityValue(options, 'https://cdn/720.m3u8', masterSrc)).toBe('https://cdn/720.m3u8');
    });

    it('falls back to first option when source not found', () => {
        expect(resolveActiveQualityValue(options, 'https://cdn/unknown.m3u8', masterSrc)).toBe(AUTO_QUALITY_VALUE);
    });

    it('falls back to first option when source is null', () => {
        expect(resolveActiveQualityValue(options, null, masterSrc)).toBe(AUTO_QUALITY_VALUE);
    });

    // Regression: an empty option list (a progressive source with no variants)
    // used to return undefined despite the declared `string` return type, and
    // threw a TypeError once a source was set.
    describe('with an empty option list', () => {
        const progressive = 'https://cdn/video.mp4';

        it('returns a string when source is null', () => {
            expect(resolveActiveQualityValue([], null, progressive)).toBe(AUTO_QUALITY_VALUE);
        });

        it('does not throw when source differs from master', () => {
            expect(() => resolveActiveQualityValue([], 'https://cdn/other.mp4', progressive)).not.toThrow();
            expect(resolveActiveQualityValue([], 'https://cdn/other.mp4', progressive)).toBe(AUTO_QUALITY_VALUE);
        });

        it('still reports Auto when source equals master', () => {
            expect(resolveActiveQualityValue([], progressive, progressive)).toBe(AUTO_QUALITY_VALUE);
        });
    });
});

// ---------------------------------------------------------------------------
// getSubtitleOptions
// ---------------------------------------------------------------------------


describe('getSubtitleOptions', () => {
    it('returns only Off option when no text tracks', () => {
        const media = makeMediaElement([]);
        const result = getSubtitleOptions(media);
        expect(result).toHaveLength(1);
        expect(result[0]?.value).toBe(SUBTITLES_OFF_VALUE);
    });

    it('returns Off option for null media', () => {
        const result = getSubtitleOptions(null);
        expect(result).toHaveLength(1);
    });

    it('includes subtitle and captions tracks', () => {
        const media = makeMediaElement([
            makeTextTrack('subtitles', 'English', 'en'),
            makeTextTrack('captions', 'French', 'fr'),
            makeTextTrack('metadata', '', ''),
        ]);
        const result = getSubtitleOptions(media);
        expect(result).toHaveLength(3); // Off + English + French
        expect(result[1]?.label).toBe('English');
        expect(result[2]?.label).toBe('French');
    });

    it('uses language as fallback label when track label is empty', () => {
        const media = makeMediaElement([makeTextTrack('subtitles', '', 'de')]);
        const result = getSubtitleOptions(media);
        expect(result[1]?.label).toBe('de');
    });

    it('uses Track N as fallback when both label and language are empty', () => {
        const media = makeMediaElement([makeTextTrack('subtitles', '', '')]);
        const result = getSubtitleOptions(media);
        expect(result[1]?.label).toBe('Track 1');
    });
});

// ---------------------------------------------------------------------------
// getActiveSubtitleValue
// ---------------------------------------------------------------------------

describe('getActiveSubtitleValue', () => {
    it('returns SUBTITLES_OFF_VALUE for null media', () => {
        expect(getActiveSubtitleValue(null)).toBe(SUBTITLES_OFF_VALUE);
    });

    it('returns SUBTITLES_OFF_VALUE when no track is showing', () => {
        const media = makeMediaElement([makeTextTrack('subtitles', 'English', 'en', 'disabled')]);
        expect(getActiveSubtitleValue(media)).toBe(SUBTITLES_OFF_VALUE);
    });

    it('returns the value of the showing track', () => {
        const media = makeMediaElement([
            makeTextTrack('subtitles', 'English', 'en', 'disabled'),
            makeTextTrack('subtitles', 'French', 'fr', 'showing'),
        ]);
        expect(getActiveSubtitleValue(media)).toBe('track:1');
    });
});
