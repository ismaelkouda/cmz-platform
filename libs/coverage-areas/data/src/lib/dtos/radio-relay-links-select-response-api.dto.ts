import { SimpleResponseDto } from '@cmz/shared-data';

/**
 * `name` — même champ que `RadioRelayLinksItemApiDto.name` (confirmé wire
 * réel, `radio-relay-links-response-api.dto.ts`), même convention que
 * `SiteGroupSelectItemApiDto`/`OpticalFiberNetworkSelectItemApiDto`
 * (T11-7, 2026-08-11).
 */
export interface RadioRelayLinksSelectItemApiDto {
    id: string;
    name: string;
}

export type RadioRelayLinksSelectResponseApiDto = SimpleResponseDto<
    RadioRelayLinksSelectItemApiDto[]
>;
