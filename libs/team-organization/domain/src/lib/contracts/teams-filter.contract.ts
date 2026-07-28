import { TeamsStatus } from '../enums/teams-status.enum';

/**
 * Filtre de liste `teams` — recherche libre + statut. Aucun champ requis,
 * pas de plage de dates.
 */
export interface TeamsFilterContract {
    search?: string;
    status?: TeamsStatus;
}
