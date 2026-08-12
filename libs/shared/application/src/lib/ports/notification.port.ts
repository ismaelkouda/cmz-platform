export type NotificationSeverity = 'success' | 'error' | 'warning' | 'info';

/**
 * Port de notification (toasts) — **abstraction agnostique**. Adaptateurs :
 * Adaptateur design-system `cmz-toast` (Angular) ; équivalent React à venir.
 *
 * Interface pure depuis ADR-0024 (Chantier Q). Jeton `NOTIFICATION_PORT`
 * colocalisé ici même, dans `@cmz/shared-application` (pas `@cmz/shared-ui`
 * comme `ConfirmDialogPort`/`ExcelExportPort`) : ce port a des
 * consommateurs `inject()` à la fois en `type:ui` (composants de page) et
 * en `type:application` (façades — ex. `CollectionResourceFacade`,
 * `ProcessingDetailsFacade`). `type:application` n'a pas le droit de
 * dépendre de `type:ui` (`eslint.config.mjs`) ; `type:ui` a le droit de
 * dépendre de `type:application`. La seule couche commune aux deux est
 * donc `type:application` lui-même.
 */
export interface NotificationPort {
    notify(severity: NotificationSeverity, message: string): void;
    success(message: string): void;
    error(message: string): void;
    warning(message: string): void;
    info(message: string): void;
}
