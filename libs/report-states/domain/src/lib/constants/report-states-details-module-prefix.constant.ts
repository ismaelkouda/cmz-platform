/**
 * Préfixe des clés i18n d'erreur de validation `workflowDetails*Vo`
 * (`REPORT_STATES.DETAILS.*`, `apps/backoffice-angular/src/app/i18n/fr/
 * fr-pack-04.ts`) — ADR-0022 (POC ADR-0020 Option B, 2026-08-11).
 *
 * Source unique : avant ce fichier, la chaîne `'REPORT_STATES'` était
 * recopiée séparément dans `report-states-details.use-case.ts` ET
 * `report-states-details-dialog.component.ts` — exactement la classe de
 * bug (une valeur qui doit rester identique en 2 endroits, sans qu'aucun
 * outil ne le garantisse) que la factorisation `workflow-details` visait à
 * éliminer (cf. incident T1-5, `taches-restantes.md`). Trouvé en audit de
 * cohérence après coup ; corrigé en centralisant la constante ici.
 */
export const REPORT_STATES_DETAILS_MODULE_PREFIX = 'REPORT_STATES';
