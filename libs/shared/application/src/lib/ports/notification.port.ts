export type NotificationSeverity = 'success' | 'error' | 'warning' | 'info';

/**
 * Port de notification (toasts) — **abstraction agnostique**. Adaptateurs :
 * Adaptateur design-system `cmz-toast` (Angular) ; équivalent React à venir.
 */
export abstract class NotificationPort {
    abstract notify(severity: NotificationSeverity, message: string): void;
    abstract success(message: string): void;
    abstract error(message: string): void;
    abstract warning(message: string): void;
    abstract info(message: string): void;
}
