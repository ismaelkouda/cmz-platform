import { SimpleResponseDto } from '@cmz/shared-data';

/**
 * `id`/`title` — mêmes champs wire que `SlideItemApiDto`, même convention que
 * `home`/`news` (entités avec un champ `title` unifié).
 */
export interface SlideSelectItemApiDto {
    id: string;
    title: string;
}

export type SlideSelectResponseApiDto = SimpleResponseDto<
    SlideSelectItemApiDto[]
>;
