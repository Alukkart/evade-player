import {describe, it, expect} from 'vitest';
import {
    findVoiceoverEpisodes,
    getPlayableEpisodes,
    getNextEpisode,
    getNextVoiceover,
} from './next-episode';
import type {SeasonOption, EpisodeOption} from '../types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ep = (value: string, extra: Partial<EpisodeOption> = {}): EpisodeOption => ({
    label: `Episode ${value}`,
    value,
    ...extra,
});

// Two flat seasons, no voiceovers.
const flatSeasons: SeasonOption[] = [
    {label: 'S1', value: 's1', episodes: [ep('1'), ep('2'), ep('3')]},
    {label: 'S2', value: 's2', episodes: [ep('4'), ep('5')]},
];

// ---------------------------------------------------------------------------
// getNextEpisode
// ---------------------------------------------------------------------------

describe('getNextEpisode', () => {
    it('returns the next episode within the same season', () => {
        const next = getNextEpisode(flatSeasons, 's1', '1', undefined);
        expect(next?.episode.value).toBe('2');
        expect(next?.seasonValue).toBe('s1');
    });

    it('crosses the season boundary to the first episode of the next season', () => {
        const next = getNextEpisode(flatSeasons, 's1', '3', undefined);
        expect(next?.seasonValue).toBe('s2');
        expect(next?.episode.value).toBe('4');
    });

    it('returns null on the very last episode', () => {
        expect(getNextEpisode(flatSeasons, 's2', '5', undefined)).toBeNull();
    });

    it('returns null when the current episode is not found', () => {
        expect(getNextEpisode(flatSeasons, 's1', 'nope', undefined)).toBeNull();
    });

    it('returns null when no current episode is provided', () => {
        expect(getNextEpisode(flatSeasons, 's1', undefined, undefined)).toBeNull();
    });

    it('returns null for undefined seasons', () => {
        expect(getNextEpisode(undefined, 's1', '1', undefined)).toBeNull();
    });

    it('matches the first episode with that value when season is unspecified', () => {
        const next = getNextEpisode(flatSeasons, undefined, '4', undefined);
        expect(next?.episode.value).toBe('5');
    });

    it('disambiguates duplicate episode values by season', () => {
        const seasons: SeasonOption[] = [
            {label: 'S1', value: 's1', episodes: [ep('1'), ep('2')]},
            {label: 'S2', value: 's2', episodes: [ep('1'), ep('2')]},
        ];
        const next = getNextEpisode(seasons, 's2', '1', undefined);
        expect(next?.seasonValue).toBe('s2');
        expect(next?.episode.value).toBe('2');
    });
});

// ---------------------------------------------------------------------------
// getPlayableEpisodes
// ---------------------------------------------------------------------------

describe('getPlayableEpisodes', () => {
    it('flattens all seasons in order', () => {
        const playable = getPlayableEpisodes(flatSeasons, undefined);
        expect(playable.map((item) => item.episode.value)).toEqual(['1', '2', '3', '4', '5']);
        expect(playable.map((item) => item.seasonValue)).toEqual(['s1', 's1', 's1', 's2', 's2']);
    });

    it('returns an empty list for undefined seasons', () => {
        expect(getPlayableEpisodes(undefined, undefined)).toEqual([]);
    });

    it('uses a voiceover-specific episode list when present', () => {
        const seasons: SeasonOption[] = [
            {
                label: 'S1',
                value: 's1',
                episodes: [
                    ep('1', {
                        voiceovers: [
                            {label: 'VO A', value: 'a', episodes: [ep('a1'), ep('a2')]},
                        ],
                    }),
                ],
            },
        ];
        const playable = getPlayableEpisodes(seasons, 'a');
        expect(playable.map((item) => item.episode.value)).toEqual(['a1', 'a2']);
    });
});

// ---------------------------------------------------------------------------
// findVoiceoverEpisodes
// ---------------------------------------------------------------------------

describe('findVoiceoverEpisodes', () => {
    const season: SeasonOption = {
        label: 'S1',
        value: 's1',
        episodes: [
            ep('1', {voiceovers: [{label: 'A', value: 'a'}, {label: 'B', value: 'b'}]}),
            ep('2', {voiceovers: [{label: 'A', value: 'a'}]}),
            ep('3', {voiceovers: [{label: 'B', value: 'b'}]}),
        ],
    };

    it('returns undefined when no voiceover is selected', () => {
        expect(findVoiceoverEpisodes(season, undefined)).toBeUndefined();
    });

    it('prefers an explicit per-voiceover episode list', () => {
        const withList: SeasonOption = {
            label: 'S1',
            value: 's1',
            episodes: [
                ep('1', {voiceovers: [{label: 'A', value: 'a', episodes: [ep('x'), ep('y')]}]}),
            ],
        };
        expect(findVoiceoverEpisodes(withList, 'a')?.map((e) => e.value)).toEqual(['x', 'y']);
    });

    it('falls back to filtering episodes that contain the voiceover', () => {
        expect(findVoiceoverEpisodes(season, 'a')?.map((e) => e.value)).toEqual(['1', '2']);
        expect(findVoiceoverEpisodes(season, 'b')?.map((e) => e.value)).toEqual(['1', '3']);
    });

    it('returns undefined when the voiceover matches no episodes', () => {
        expect(findVoiceoverEpisodes(season, 'missing')).toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// getNextVoiceover
// ---------------------------------------------------------------------------

describe('getNextVoiceover', () => {
    it('keeps the current voiceover when the next episode offers it', () => {
        const episode = ep('2', {voiceovers: [{label: 'A', value: 'a'}, {label: 'B', value: 'b'}]});
        expect(getNextVoiceover(episode, 'b')).toBe('b');
    });

    it('falls back to the first voiceover when the current one is unavailable', () => {
        const episode = ep('2', {voiceovers: [{label: 'A', value: 'a'}, {label: 'B', value: 'b'}]});
        expect(getNextVoiceover(episode, 'z')).toBe('a');
    });

    it('keeps the current voiceover when the episode has no voiceovers', () => {
        expect(getNextVoiceover(ep('2'), 'a')).toBe('a');
    });
});
