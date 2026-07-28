import { PaginatedResponseDto } from '@cmz/shared-data';

/**
 * `action` reste une string large au wire — normalisée en `AccessLogsAction`
 * (enum domaine) dans le mapper via `isAccessLogsAction`, contrairement au
 * source qui laisse `AccessLogsEntity.action: string` non validé (le
 * `AccessLogsActionsMapper.mapToEnum` du source existe mais n'est jamais
 * appelé sur ce chemin — code mort qu'on corrige ici).
 */
export interface AccessLogsItemApiDto {
    id: string;
    action: string;
    source: string;
    used_agent: string;
    created_at: string;
}

export type AccessLogsResponseApiDto =
    PaginatedResponseDto<AccessLogsItemApiDto>;
