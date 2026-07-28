/**
 * Minimal TextTrack / HTMLMediaElement stubs.
 *
 * jsdom does not implement `HTMLMediaElement.addTextTrack`, so tests that need
 * text tracks build the shape they rely on instead.
 */

export function makeTextTrack(
    kind: string,
    label: string,
    language: string,
    mode: TextTrackMode = 'disabled'
): TextTrack {
    return {kind, label, language, mode} as unknown as TextTrack;
}

export function makeMediaElement(tracks: TextTrack[]): HTMLMediaElement {
    const textTracks = {
        length: tracks.length,
        [Symbol.iterator]: function* () {
            for (const track of tracks) yield track;
        },
    };
    Object.assign(textTracks, tracks);
    return {textTracks} as unknown as HTMLMediaElement;
}
