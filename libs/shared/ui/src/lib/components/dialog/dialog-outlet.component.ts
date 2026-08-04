import {
    Component,
    ElementRef,
    effect,
    inject,
    viewChild,
} from '@angular/core';
import { TranslationPort } from '@cmz/shared-application';
import { CmzConfirmDialogService } from '../../services/cmz-confirm-dialog.service';

/**
 * Outlet de dialogue de confirmation — **design-system**. À placer une fois dans
 * le shell. Utilise l'élément natif `<dialog>` (`showModal()`) : **focus-trap**,
 * `Escape` et `::backdrop` gérés par le navigateur (a11y correcte). Piloté par le
 * signal d'état du `CmzConfirmDialogService`. Sans lib UI tierce, stylé par tokens.
 */
@Component({
    selector: 'cmz-dialog-outlet',
    template: `
        <dialog
            #dlg
            class="cmz-dialog"
            aria-labelledby="cmz-dialog-title"
            aria-describedby="cmz-dialog-message"
            (cancel)="onCancel($event)"
        >
            @if (state(); as s) {
                @if (s.title) {
                    <h2 id="cmz-dialog-title" class="cmz-dialog__title">
                        {{ s.title }}
                    </h2>
                }
                <p id="cmz-dialog-message" class="cmz-dialog__message">
                    {{ s.message }}
                </p>
                <div class="cmz-dialog__actions">
                    @if (s.mode === 'confirm') {
                        <button
                            type="button"
                            class="cmz-dialog__btn"
                            (click)="cancel()"
                        >
                            {{ s.cancelText || t('COMMON.CANCEL') }}
                        </button>
                    }
                    <button
                        type="button"
                        class="cmz-dialog__btn cmz-dialog__btn--primary"
                        autofocus
                        (click)="confirm()"
                    >
                        {{ s.confirmText || t('COMMON.CONFIRM') }}
                    </button>
                </div>
            }
        </dialog>
    `,
    styles: `
        .cmz-dialog {
            width: min(28rem, 92vw);
            padding: var(--cmz-space-5, 1.25rem);
            border: none;
            border-radius: var(--cmz-radius-lg, 0.5rem);
            background: var(--cmz-color-surface, #fff);
            color: var(--cmz-color-text, #0f172a);
            box-shadow: var(--cmz-shadow-lg, 0 10px 30px rgba(0, 0, 0, 0.2));
            font-family: var(--cmz-font-family, inherit);
        }
        .cmz-dialog::backdrop {
            background: rgba(15, 23, 42, 0.5);
        }
        .cmz-dialog__title {
            margin: 0 0 var(--cmz-space-2, 0.5rem);
            font-size: var(--cmz-font-size-lg, 1.125rem);
            font-weight: 600;
        }
        .cmz-dialog__message {
            margin: 0 0 var(--cmz-space-4, 1rem);
            color: var(--cmz-color-muted, #475569);
            font-size: var(--cmz-font-size-sm, 0.875rem);
        }
        .cmz-dialog__actions {
            display: flex;
            justify-content: flex-end;
            gap: var(--cmz-space-2, 0.5rem);
        }
        .cmz-dialog__btn {
            padding: var(--cmz-space-2, 0.5rem) var(--cmz-space-4, 1rem);
            border: 1px solid var(--cmz-color-border, #e2e8f0);
            border-radius: var(--cmz-radius, 0.375rem);
            background: var(--cmz-color-surface, #fff);
            color: var(--cmz-color-text, #0f172a);
            font: inherit;
            cursor: pointer;
        }
        .cmz-dialog__btn:hover {
            background: var(--cmz-color-surface-hover, #f1f5f9);
        }
        .cmz-dialog__btn:focus-visible {
            outline: 2px solid var(--cmz-color-focus, #2563eb);
            outline-offset: 2px;
        }
        .cmz-dialog__btn--primary {
            background: var(--cmz-color-primary, #2563eb);
            border-color: var(--cmz-color-primary, #2563eb);
            color: var(--cmz-color-on-primary, #fff);
            font-weight: 500;
        }
    `,
})
export class DialogOutletComponent {
    private readonly service = inject(CmzConfirmDialogService);
    private readonly i18n = inject(TranslationPort);
    private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dlg');

    protected readonly state = this.service.state;

    constructor() {
        effect(() => {
            const open = this.state() !== null;
            const el = this.dialog()?.nativeElement;
            if (!el) {
                return;
            }
            if (open && !el.open) {
                el.showModal();
            } else if (!open && el.open) {
                el.close();
            }
        });
    }

    protected t(key: string): string {
        return this.i18n.translate(key);
    }

    protected confirm(): void {
        this.service.respond(true);
    }

    protected cancel(): void {
        this.service.respond(false);
    }

    /** Escape (événement natif `cancel`). */
    protected onCancel(event: Event): void {
        event.preventDefault();
        this.service.respond(false);
    }
}
