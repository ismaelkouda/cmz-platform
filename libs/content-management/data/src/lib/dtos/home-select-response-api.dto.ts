import { SimpleResponseDto } from '@cmz/shared-data';

/**
 * `id`/`title` — mêmes champs wire que `HomeItemApiDto` (confirmé
 * `tools/mock-server/domains/content-management.mjs`).
 */
export interface HomeSelectItemApiDto {
    id: string;
    title: string;
}

export type HomeSelectResponseApiDto = SimpleResponseDto<
    HomeSelectItemApiDto[]
>;
