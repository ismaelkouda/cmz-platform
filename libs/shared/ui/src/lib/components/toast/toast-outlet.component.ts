import { Component, inject } from '@angular/core';
import { CmzNotificationService } from '../../services/cmz-notification.service';

/**
 * Outlet des toasts — **design-system**. À placer une fois dans le shell de
 * l'app. Rend la file du `CmzNotificationService` dans une région
 * `aria-live="polite"` (les erreurs en `assertive`), stylée par tokens `--cmz-*`.
 * Sans lib UI tierce.
 */
@Component({
    selector: 'cmz-toast-outlet',
    template: `
        <div class="cmz-toast-region" role="region" aria-label="Notifications">
            @for (toast of service.toasts(); track toast.id) {
                <div
                    class="cmz-toast"
                    [class]="'cmz-toast--' + toast.severity"
                    [attr.role]="
                        toast.severity === 'error' ? 'alert' : 'status'
                    "
                    [attr.aria-live]="
                        toast.severity === 'error' ? 'assertive' : 'polite'
                    "
                >
                    <span class="cmz-toast__text">{{ toast.text }}</span>
                    <button
                        type="button"
                        class="cmz-toast__close"
                        aria-label="Fermer"
                        (click)="service.dismiss(toast.id)"
                    >
                        ✕
                    </button>
                </div>
            }
        </div>
    `,
    styles: `
        .cmz-toast-region {
            position: fixed;
            top: var(--cmz-space-4, 1rem);
            right: var(--cmz-space-4, 1rem);
            z-index: var(--cmz-z-toast, 100);
            display: flex;
            flex-direction: column;
            gap: var(--cmz-space-2, 0.5rem);
            max-width: 22rem;
        }
        .cmz-toast {
            display: flex;
            align-items: flex-start;
            gap: var(--cmz-space-3, 0.75rem);
            padding: var(--cmz-space-3, 0.75rem);
            border-radius: var(--cmz-radius, 0.375rem);
            border-left: 4px solid var(--cmz-toast-accent, #2563eb);
            background: var(--cmz-color-surface, #fff);
            box-shadow: var(--cmz-shadow-md, 0 4px 12px rgba(0, 0, 0, 0.12));
            font-family: var(--cmz-font-family, inherit);
            font-size: var(--cmz-font-size-sm, 0.875rem);
            color: var(--cmz-color-text, #0f172a);
        }
        .cmz-toast--success {
            --cmz-toast-accent: var(--cmz-color-success, #16a34a);
        }
        .cmz-toast--error {
            --cmz-toast-accent: var(--cmz-color-danger, #dc2626);
        }
        .cmz-toast--warning {
            --cmz-toast-accent: var(--cmz-color-warning, #d97706);
        }
        .cmz-toast--info {
            --cmz-toast-accent: var(--cmz-color-info, #2563eb);
        }
        .cmz-toast__text {
            flex: 1;
        }
        .cmz-toast__close {
            border: none;
            background: transparent;
            color: var(--cmz-color-muted, #64748b);
            cursor: pointer;
            font-size: 0.875rem;
            line-height: 1;
        }
        .cmz-toast__close:focus-visible {
            outline: 2px solid var(--cmz-color-focus, #2563eb);
            outline-offset: 2px;
        }
    `,
})
export class ToastOutletComponent {
    protected readonly service = inject(CmzNotificationService);
}
