/**
 * Préfixe des clés i18n d'erreur de validation `workflowDetails*Vo`
 * (`REQUESTS.DETAILS.*`, `apps/backoffice-angular/src/app/i18n/fr/
 * fr-pack-05.ts`) — ADR-0022 (POC ADR-0020 Option B, 2026-08-11).
 *
 * Source unique : avant ce fichier, la chaîne `'REQUESTS'` était recopiée
 * séparément dans `requests-details.use-case.ts` ET
 * `requests-details-dialog.component.ts` — exactement la classe de bug
 * (une valeur qui doit rester identique en 2 endroits, sans qu'aucun outil
 * ne le garantisse) que la factorisation `workflow-details` visait à
 * éliminer (cf. incident T1-5, `taches-restantes.md`). Trouvé en audit de
 * cohérence après coup ; corrigé en centralisant la constante ici.
 */
export const REQUESTS_DETAILS_MODULE_PREFIX = 'REQUESTS';
