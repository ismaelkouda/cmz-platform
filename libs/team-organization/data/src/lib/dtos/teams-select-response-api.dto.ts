import { SimpleResponseDto } from '@cmz/shared-data';

export interface TeamsSelectItemApiDto {
    uniq_id: string;
    name: string;
    code: string;
}

export type TeamsSelectResponseApiDto = SimpleResponseDto<
    TeamsSelectItemApiDto[]
>;
