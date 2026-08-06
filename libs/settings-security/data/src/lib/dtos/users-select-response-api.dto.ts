import { SimpleResponseDto } from '@cmz/shared-data';

/**
 * `id`/`first_name`/`last_name` — mêmes champs wire que `UsersItemApiDto`
 * (pas de champ `name` unique).
 */
export interface UsersSelectItemApiDto {
    id: string;
    first_name: string;
    last_name: string;
}

export type UsersSelectResponseApiDto = SimpleResponseDto<
    UsersSelectItemApiDto[]
>;
