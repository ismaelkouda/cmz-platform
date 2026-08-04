import { SimpleResponseDto } from '@cmz/shared-data';

/** `id`/`title` — mêmes champs wire que `NewsItemApiDto`. */
export interface NewsSelectItemApiDto {
    id: string;
    title: string;
}

export type NewsSelectResponseApiDto = SimpleResponseDto<
    NewsSelectItemApiDto[]
>;
