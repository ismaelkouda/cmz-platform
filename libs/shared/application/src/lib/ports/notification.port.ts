export type NotificationSeverity = 'success' | 'error' | 'warning' | 'info';

/**
 * Port de notification (toasts) — **abstraction agnostique**. Adaptateurs :
 * Angular → `ngx-sonner`, React → `sonner` (même UX Sonner). Cf. ADR-0012.
 */
export abstract class NotificationPort {
    abstract notify(severity: NotificationSeverity, message: string): void;
    abstract success(message: string): void;
    abstract error(message: string): void;
    abstract warning(message: string): void;
    abstract info(message: string): void;
}
