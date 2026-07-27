import { SimpleResponseDto } from '@cmz/shared-data';

export interface TowerTypeSelectItemApiDto {
    id: string;
    name: string;
}

export type TowerTypeSelectResponseApiDto = SimpleResponseDto<
    TowerTypeSelectItemApiDto[]
>;
