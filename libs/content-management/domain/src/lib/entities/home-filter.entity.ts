import { resolveOpenEndedEndDate } from '@cmz/shared-domain';
import { HomeFilterContract } from '../contracts/home-filter.contract';

/**
 * Étape « entité de filtre » du pattern crud-entity (cœur canonique,
 * `docs/architecture/patterns/crud-entity.pattern.json`), manquante ici
 * jusqu'au 2026-08-04 (backlog #3, cartographie). `HomeFilterContract` a
 * bien `startDate`/`endDate` (contrairement à `team-organization/teams`)
 * et `homeFilterVo` ne fait déjà que valider (contrairement à
 * `communication/messaging` avant correction) — cas le plus simple des 5
 * candidats de ce backlog : reproduction directe du pattern de référence,
 * vérifiée avant écriture, pas supposée.
 */
export function homeFilterEntity(
    contract: HomeFilterContract
): HomeFilterContract {
    return {
        ...contract,
        endDate: resolveOpenEndedEndDate(contract.startDate, contract.endDate),
    };
}
