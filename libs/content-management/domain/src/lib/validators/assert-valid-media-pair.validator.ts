import { GenericRequiredError, TypeMedia } from '@cmz/shared-domain';

/**
 * Règle transverse slide/news : selon `type` (IMAGE ou VIDEO), exactement le
 * champ correspondant (`image` ou `video`) est requis — l'autre reste
 * optionnel/null. Extrait en un seul helper partagé (au lieu de dupliquer la
 * même paire de checks par entité, comme le source le faisait déjà en partie).
 */
export function assertValidMediaPair(
    type: TypeMedia,
    image: File | null | string | undefined,
    video: string | null | undefined,
    imageRequiredKey: string,
    videoRequiredKey: string
): void {
    if (type === TypeMedia.IMAGE && !image) {
        throw new GenericRequiredError(imageRequiredKey);
    }
    if (type === TypeMedia.VIDEO && !video) {
        throw new GenericRequiredError(videoRequiredKey);
    }
}
