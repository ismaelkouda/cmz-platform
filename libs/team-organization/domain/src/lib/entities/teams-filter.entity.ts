import { TeamsFilterContract } from '../contracts/teams-filter.contract';

/**
 * Étape « entité de filtre » du pattern crud-entity (cœur canonique,
 * `docs/architecture/patterns/crud-entity.pattern.json`), manquante ici
 * jusqu'au 2026-08-04 (backlog #3, cartographie). Dans les 3 modules déjà
 * validés (`administrative-infrastructure`/`administrative-boundary`/
 * `coverage-areas`), cette fonction résout `endDate` via
 * `resolveOpenEndedEndDate(contract.startDate, contract.endDate)` — mais
 * `TeamsFilterContract` n'a **aucun champ de plage de dates**
 * (`search?`/`status?` seulement, cf. le fichier lui-même). Reproduire
 * l'appel de référence tel quel aurait été une erreur de compilation
 * (`contract.startDate` n'existe pas sur ce contrat), pas une simple
 * question de style — vérifié avant d'écrire ce fichier, pas supposé.
 * Fonction identité : la couche existe (cohérence architecturale et
 * point d'extension futur si `teams` gagne un filtre par plage de dates),
 * son comportement s'adapte honnêtement à la forme réelle du contrat.
 */
export function teamsFilterEntity(
    contract: TeamsFilterContract
): TeamsFilterContract {
    return contract;
}
