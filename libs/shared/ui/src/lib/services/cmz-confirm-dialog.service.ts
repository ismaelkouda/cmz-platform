import { Service, signal } from '@angular/core';
import { ConfirmDialogPort, ConfirmOptions } from '@cmz/shared-application';

export interface DialogState {
    message: string;
    title?: string;
    confirmText?: string;
    cancelText?: string;
    mode: 'confirm' | 'alert';
}

/**
 * Adaptateur **design-system** de `ConfirmDialogPort` — remplace SweetAlert2.
 * Publie l'état courant en signal (rendu par `cmz-dialog-outlet`) et résout la
 * `Promise` sur réponse. Aucune dépendance UI tierce ; a11y/theming maîtrisés.
 */
@Service()
export class CmzConfirmDialogService extends ConfirmDialogPort {
    private readonly _state = signal<DialogState | null>(null);
    readonly state = this._state.asReadonly();
    private resolver: ((value: boolean) => void) | null = null;

    confirm(message: string, options?: ConfirmOptions): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            this.resolver = resolve;
            this._state.set({
                message,
                title: options?.title,
                confirmText: options?.confirmText,
                cancelText: options?.cancelText,
                mode: 'confirm',
            });
        });
    }

    alert(message: string, options?: ConfirmOptions): Promise<void> {
        return new Promise<void>((resolve) => {
            this.resolver = () => resolve();
            this._state.set({
                message,
                title: options?.title,
                confirmText: options?.confirmText,
                mode: 'alert',
            });
        });
    }

    /** Réponse depuis l'outlet (confirm/cancel/Escape). */
    respond(confirmed: boolean): void {
        const resolve = this.resolver;
        this.resolver = null;
        this._state.set(null);
        resolve?.(confirmed);
    }
}
