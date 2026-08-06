import { SimpleResponseDto } from '@cmz/shared-data';

/**
 * `site_name` — même champ que `MobileNetworkItemApiDto.site_name`
 * (confirmé wire réel, `tools/mock-server/domains/coverage-areas.mjs`) ;
 * pas de champ `name` générique sur ce DTO, contrairement à
 * `SiteGroupSelectItemApiDto`.
 */
export interface MobileNetworkSelectItemApiDto {
    id: string;
    site_name: string;
}

export type MobileNetworkSelectResponseApiDto = SimpleResponseDto<
    MobileNetworkSelectItemApiDto[]
>;
