import { ParticipantsFilterContract } from '../contracts/participants-filter.contract';

/**
 * Étape « entité de filtre » du pattern crud-entity (cœur canonique,
 * `docs/architecture/patterns/crud-entity.pattern.json`), manquante ici
 * jusqu'au 2026-08-04 (backlog #3, cartographie). `ParticipantsFilterContract`
 * n'a aucun champ de plage de dates (`search?`/`role?`/`team?`/`status?`
 * seulement, confirmé par lecture du contrat lui-même) — même situation que
 * `teams-filter.entity.ts` dans ce même module, écrit plus tôt le même
 * jour : fonction identité, pas une reproduction aveugle du
 * `resolveOpenEndedEndDate` des modules qui ont une plage de dates.
 */
export function participantsFilterEntity(
    contract: ParticipantsFilterContract
): ParticipantsFilterContract {
    return contract;
}
