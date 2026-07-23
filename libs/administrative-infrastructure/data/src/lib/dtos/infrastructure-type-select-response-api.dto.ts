import { SimpleResponseDto } from '@cmz/shared-data';

export interface InfrastructureTypeSelectItemApiDto {
    id: string;
    name: string;
    description: string;
}

export type InfrastructureTypeSelectResponseApiDto = SimpleResponseDto<
    InfrastructureTypeSelectItemApiDto[]
>;
