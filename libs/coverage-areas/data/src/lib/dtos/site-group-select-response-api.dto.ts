import { SimpleResponseDto } from '@cmz/shared-data';

export interface SiteGroupSelectItemApiDto {
    id: string;
    name: string;
    description: string;
}

export type SiteGroupSelectResponseApiDto = SimpleResponseDto<
    SiteGroupSelectItemApiDto[]
>;
