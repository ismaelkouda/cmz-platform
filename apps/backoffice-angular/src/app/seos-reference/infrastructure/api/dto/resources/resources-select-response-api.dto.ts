import { SimpleResponseDto } from '@shared/data/dto/simple-response.dto';

export interface ResourcesSelectItemApiDto {
    id: string;
    name: string;
}

export type ResourcesSelectResponseApiDto = SimpleResponseDto<
    ResourcesSelectItemApiDto[]
>;
