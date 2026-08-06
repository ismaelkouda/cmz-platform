import { SimpleResponseDto } from '@cmz/shared-data';

/**
 * `id`/`first_name`/`last_name` — mêmes champs wire que
 * `ParticipantsItemApiDto` (pas de champ `name` unique sur ce DTO).
 */
export interface ParticipantsSelectItemApiDto {
    id: string;
    first_name: string;
    last_name: string;
}

export type ParticipantsSelectResponseApiDto = SimpleResponseDto<
    ParticipantsSelectItemApiDto[]
>;
