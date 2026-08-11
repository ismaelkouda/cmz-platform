import { SimpleResponseDto } from '@cmz/shared-data';

/**
 * `name` — même champ que `OpticalFiberNetworkItemApiDto.name` (confirmé
 * wire réel, `optical-fiber-network-response-api.dto.ts`), même convention
 * que `SiteGroupSelectItemApiDto` (T11-7, 2026-08-11).
 */
export interface OpticalFiberNetworkSelectItemApiDto {
    id: string;
    name: string;
}

export type OpticalFiberNetworkSelectResponseApiDto = SimpleResponseDto<
    OpticalFiberNetworkSelectItemApiDto[]
>;
