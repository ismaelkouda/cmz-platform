import { WorkflowDetailsFilterContract } from '../contracts/workflow-details-filter.contract';

/**
 * `modulePrefix` — décision utilisateur (2026-08-11, POC ADR-0020 Option B) :
 * la logique de validation est 100 % partagée, seule la clé i18n de l'erreur
 * reste préfixée par module (`REPORT_STATES.DETAILS.*` / `REQUESTS.DETAILS.*`,
 * déjà traduites dans `apps/backoffice-angular/src/app/i18n/fr/fr-pack-04/05.ts`
 * — non renommées pour ne pas casser les clés existantes). Chaque wrapper
 * par module (`report-states-details-filter.vo.ts`, etc.) fournit son
 * préfixe et ne fait plus que ça.
 */
export function workflowDetailsFilterVo(
    contract: WorkflowDetailsFilterContract,
    modulePrefix: string
): WorkflowDetailsFilterContract {
    const uniqId = contract.uniqId?.trim();
    if (!uniqId) {
        throw new Error(`${modulePrefix}.DETAILS.FILTER.UNIQ_ID_REQUIRED`);
    }
    return { uniqId };
}
