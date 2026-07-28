import { SimpleResponseDto } from '@cmz/shared-data';

/**
 * Une seule et même ressource `variables` sert 4 usages : le champ
 * `useOfServersResourcesLink` est partagé par NODE et SERVICES (confirmé
 * dans le source — les deux mappers lisent le même champ), `resources` lit
 * `useOfResourcesLink`, `jobs` lit `impactJobs`. Les 3 champs sont donc bien
 * présents simultanément dans la même réponse wire, jamais un DTO par
 * section comme la structure de dossiers du source le laissait croire.
 */
export interface MonitoringVariablesItemDto {
    readonly useOfServersResourcesLink: string;
    readonly useOfResourcesLink: string;
    readonly impactJobs: string;
}

export type MonitoringVariablesResponseDto =
    SimpleResponseDto<MonitoringVariablesItemDto>;
