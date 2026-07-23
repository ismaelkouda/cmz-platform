import { SimpleResponseDto } from '@cmz/shared-data';

export interface InfrastructureTypeFindOneItemApiDto {
    id: string;
    name: string;
    description: string;
    is_active: boolean;
    created_at?: string;
    updated_at: string;
}

export type InfrastructureTypeFindOneResponseApiDto =
    SimpleResponseDto<InfrastructureTypeFindOneItemApiDto>;
