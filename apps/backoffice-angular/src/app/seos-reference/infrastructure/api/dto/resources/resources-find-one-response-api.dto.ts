import { SimpleResponseDto } from '@shared/data/dto/simple-response.dto';

export interface ResourcesFindOneItemApiDto {
    id: string;
    code: string;
    name: string;
    description: string;
    updated_at: string;
}

export type ResourcesFindOneResponseApiDto =
    SimpleResponseDto<ResourcesFindOneItemApiDto>;
