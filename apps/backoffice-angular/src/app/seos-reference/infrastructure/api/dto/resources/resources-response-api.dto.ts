import { PaginatedResponseDto } from '@shared/data/dto/simple-response.dto';

export interface ResourcesItemApiDto {
    id: string;
    code: string;
    name: string;
    description: string;
    created_at: string;
    updated_at: string;
}

export type ResourcesResponseApiDto = PaginatedResponseDto<ResourcesItemApiDto>;
