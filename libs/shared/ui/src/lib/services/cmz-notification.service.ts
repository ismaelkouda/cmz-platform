import { Service, signal } from '@angular/core';
import {
    NotificationPort,
    NotificationSeverity,
} from '@cmz/shared-application';

export interface ToastMessage {
    id: number;
    severity: NotificationSeverity;
    text: string;
}

/**
 * Adaptateur **design-system** de `NotificationPort` — remplace l'adaptateur
 * ngx-sonner. File de toasts en signal (rendue par `cmz-toast-outlet`),
 * auto-dismiss. Aucune dépendance UI tierce ; réplicable en React.
 */
@Service()
export class CmzNotificationService extends NotificationPort {
    private seq = 0;
    private readonly _toasts = signal<ToastMessage[]>([]);
    readonly toasts = this._toasts.asReadonly();

    /** Durée d'affichage avant disparition (ms). */
    readonly autoDismissMs = 5000;

    notify(severity: NotificationSeverity, message: string): void {
        const id = ++this.seq;
        this._toasts.update((list) => [
            ...list,
            { id, severity, text: message },
        ]);
        setTimeout(() => this.dismiss(id), this.autoDismissMs);
    }

    success(message: string): void {
        this.notify('success', message);
    }
    error(message: string): void {
        this.notify('error', message);
    }
    warning(message: string): void {
        this.notify('warning', message);
    }
    info(message: string): void {
        this.notify('info', message);
    }

    dismiss(id: number): void {
        this._toasts.update((list) => list.filter((t) => t.id !== id));
    }
}
