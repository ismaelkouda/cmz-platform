import { SimpleResponseDto } from '@cmz/shared-data';

export interface FiberConstructorSelectItemApiDto {
    id: string;
    name: string;
}

export type FiberConstructorSelectResponseApiDto = SimpleResponseDto<
    FiberConstructorSelectItemApiDto[]
>;
