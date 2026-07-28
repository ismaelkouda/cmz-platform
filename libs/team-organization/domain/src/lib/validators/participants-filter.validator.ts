import { ParticipantsFilterContract } from '../contracts/participants-filter.contract';

/**
 * Aucun champ requis pour ce filtre (jugé explicitement, cf. contrat) —
 * aucune contrainte structurelle non plus (pas de plage de dates ici).
 */
export function validateParticipantsFilter(
    contract: ParticipantsFilterContract
): void {
    void contract;
}
