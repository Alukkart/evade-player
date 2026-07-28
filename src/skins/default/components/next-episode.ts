import type {EpisodeOption, SeasonOption} from '../types';

export interface NextEpisodeTarget {
    seasonValue: string;
    episode: EpisodeOption;
}

export function findVoiceoverEpisodes(
    season: SeasonOption,
    currentVoiceover: string | undefined
): EpisodeOption[] | undefined {
    if (!currentVoiceover) return undefined;

    for (const episode of season.episodes ?? []) {
        const voiceover = episode.voiceovers?.find((item) => item.value === currentVoiceover);
        if (voiceover?.episodes && voiceover.episodes.length > 0) {
            return voiceover.episodes;
        }
    }

    const filtered = (season.episodes ?? []).filter((episode) =>
        episode.voiceovers?.some((voiceover) => voiceover.value === currentVoiceover)
    );

    return filtered.length > 0 ? filtered : undefined;
}

export function getPlayableEpisodes(
    seasons: SeasonOption[] | undefined,
    currentVoiceover: string | undefined
): NextEpisodeTarget[] {
    if (!seasons) return [];

    return seasons.flatMap((season) => {
        const episodes = findVoiceoverEpisodes(season, currentVoiceover) ?? season.episodes ?? [];
        return episodes.map((episode) => ({seasonValue: season.value, episode}));
    });
}

export function getNextEpisode(
    seasons: SeasonOption[] | undefined,
    currentSeason: string | undefined,
    currentEpisode: string | undefined,
    currentVoiceover: string | undefined
): NextEpisodeTarget | null {
    if (!currentEpisode) return null;

    const playableEpisodes = getPlayableEpisodes(seasons, currentVoiceover);
    const currentIndex = playableEpisodes.findIndex((item) =>
        item.episode.value === currentEpisode && (!currentSeason || item.seasonValue === currentSeason)
    );

    if (currentIndex < 0) return null;
    return playableEpisodes[currentIndex + 1] ?? null;
}

export function getNextVoiceover(episode: EpisodeOption, currentVoiceover: string | undefined): string | undefined {
    if (!episode.voiceovers?.length) return currentVoiceover;
    if (currentVoiceover && episode.voiceovers.some((voiceover) => voiceover.value === currentVoiceover)) {
        return currentVoiceover;
    }
    return episode.voiceovers[0]?.value;
}
