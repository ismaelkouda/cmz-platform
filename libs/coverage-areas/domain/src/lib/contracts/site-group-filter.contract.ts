import { Status } from '../enums/status.enum';

/**
 * Filtre de liste `site-group` — recherche libre + statut + plage de dates.
 * Aucun champ requis (même décision que `region`/`infrastructure-type` : le
 * formulaire de filtre source n'impose aucune contrainte).
 */
export interface SiteGroupFilterContract {
    search?: string;
    status?: Status;
    startDate?: Date;
    endDate?: Date;
}
