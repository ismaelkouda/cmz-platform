import { Role } from '@cmz/shared-domain';
import { ParticipantsStatus } from '../enums/participants-status.enum';

/**
 * Filtre de liste `participants` — recherche libre + rôle + équipe +
 * statut. Aucun champ requis (le formulaire de filtre source n'impose
 * aucune contrainte, et il n'y a pas de plage de dates ici).
 */
export interface ParticipantsFilterContract {
    search?: string;
    role?: Role;
    team?: string;
    status?: ParticipantsStatus;
}
