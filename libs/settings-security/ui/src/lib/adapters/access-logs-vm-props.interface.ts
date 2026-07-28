import { AccessLogsAction } from '@cmz/settings-security-domain';
import { TableRowBase } from '@cmz/shared-ui';

/**
 * Étend `TableRowBase` sans en exploiter les champs (lecture seule, aucune
 * action de ligne) — nécessaire car `TableComponent<T extends TableRowBase>`
 * (générique) échoue en `strictTemplates` (TS2322 « no properties in
 * common ») dès lors qu'un VM ne partage AUCUNE propriété avec un type
 * entièrement optionnel (heuristique « weak type » de TS) ; remonté par
 * `ngc`, pas par `tsc` seul (pas de vérification des templates). 1er VM du
 * projet sans `dropdownActions` (toutes les entités précédentes ont au
 * moins une action de ligne).
 */
export interface AccessLogsVmProps extends TableRowBase {
    uniqId: string;
    action: AccessLogsAction;
    actionLabel: string;
    source: string;
    userAgent: string;
    createdAt: string;
}
