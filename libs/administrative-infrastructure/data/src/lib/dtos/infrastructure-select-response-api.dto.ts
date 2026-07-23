import { SimpleResponseDto } from '@cmz/shared-data';

export interface InfrastructureSelectItemApiDto {
    id: string;
    name: string;
    description: string;
}

export type InfrastructureSelectResponseApiDto = SimpleResponseDto<
    InfrastructureSelectItemApiDto[]
>;
