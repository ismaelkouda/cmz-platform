/**
 * Filtre de liste `region` — recherche libre + plage de dates. Aucun champ
 * requis (jugé explicitement contre la réalité métier : le formulaire de
 * filtre source n'impose aucune contrainte) → pas de `.validate-contract`
 * séparé, cf. `validators/region-filter.validator.ts`.
 */
export interface RegionFilterContract {
    search?: string;
    startDate?: Date;
    endDate?: Date;
}
