import {
    Component,
    ElementRef,
    computed,
    inject,
    input,
    output,
    signal,
} from '@angular/core';
import { TRANSLATION_PORT } from '@cmz/shared-application';
import { ActionDropdownItem } from '../../interfaces/action-dropdown-item.interface';

/**
 * Menu d'actions de ligne — **design-system**, sans lib UI tierce. Présentation
 * pure : reçoit les actions ([[ActionDropdownItem]]), émet l'id sélectionné.
 * Accessible : bouton `aria-haspopup`, menu `role="menu"`, items
 * `role="menuitem"`, fermeture Escape / clic extérieur, libellés traduits via
 * `TranslationPort`. Stylé par tokens CSS (`--cmz-*`).
 */
@Component({
    selector: 'cmz-action-dropdown',
    // Audit-workspace-2026-08-02-addendum.md, J-5 : objet `host` du
    // décorateur plutôt que les décorateurs de host binding par méthode
    // (conventions/angular-22.profile.json, component.hostBindings).
    host: {
        '(document:click)': 'onOutsideClick($event)',
        '(document:keydown.escape)': 'onEscape()',
    },
    template: `
        <button
            type="button"
            class="cmz-action__trigger"
            [disabled]="disabled()"
            [title]="tooltip()"
            [attr.aria-label]="t('COMMON.ACTIONS')"
            [attr.aria-haspopup]="'menu'"
            [attr.aria-expanded]="open()"
            (click)="toggle($event)"
        >
            ⋮
        </button>

        @if (open()) {
            <ul class="cmz-action__menu" role="menu">
                @for (item of visibleActions(); track item.id) {
                    <li role="none">
                        <button
                            type="button"
                            role="menuitem"
                            class="cmz-action__item"
                            [class.cmz-action__item--danger]="
                                item.severity === 'danger'
                            "
                            [disabled]="item.disabled"
                            [title]="item.tooltip ?? ''"
                            (click)="select(item)"
                        >
                            @if (item.icon) {
                                <i
                                    class="cmz-action__icon"
                                    [class]="item.icon"
                                    aria-hidden="true"
                                ></i>
                            }
                            <span>{{ t(item.label) }}</span>
                        </button>
                    </li>
                }
            </ul>
        }
    `,
    styles: `
        :host {
            position: relative;
            display: inline-block;
        }
        .cmz-action__trigger {
            width: 2rem;
            height: 2rem;
            border: none;
            border-radius: var(--cmz-radius, 0.375rem);
            background: transparent;
            color: var(--cmz-color-text, #0f172a);
            font-size: 1.25rem;
            line-height: 1;
            cursor: pointer;
        }
        .cmz-action__trigger:hover:not(:disabled) {
            background: var(--cmz-color-surface-hover, #f1f5f9);
        }
        .cmz-action__trigger:focus-visible {
            outline: 2px solid var(--cmz-color-focus, #2563eb);
            outline-offset: 2px;
        }
        .cmz-action__trigger:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .cmz-action__menu {
            position: absolute;
            right: 0;
            z-index: var(--cmz-z-dropdown, 50);
            min-width: 10rem;
            margin: var(--cmz-space-1, 0.25rem) 0 0;
            padding: var(--cmz-space-1, 0.25rem);
            list-style: none;
            background: var(--cmz-color-surface, #fff);
            border: 1px solid var(--cmz-color-border, #e2e8f0);
            border-radius: var(--cmz-radius, 0.375rem);
            box-shadow: var(--cmz-shadow-md, 0 4px 12px rgba(0, 0, 0, 0.12));
        }
        .cmz-action__item {
            display: flex;
            align-items: center;
            gap: var(--cmz-space-2, 0.5rem);
            width: 100%;
            padding: var(--cmz-space-2, 0.5rem);
            border: none;
            border-radius: var(--cmz-radius-sm, 0.25rem);
            background: transparent;
            color: var(--cmz-color-text, #0f172a);
            font: inherit;
            text-align: left;
            cursor: pointer;
        }
        .cmz-action__item:hover:not(:disabled) {
            background: var(--cmz-color-surface-hover, #f1f5f9);
        }
        .cmz-action__item:focus-visible {
            outline: 2px solid var(--cmz-color-focus, #2563eb);
            outline-offset: -2px;
        }
        .cmz-action__item--danger {
            color: var(--cmz-color-danger, #dc2626);
        }
        .cmz-action__item:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    `,
})
export class ActionDropdownComponent {
    private readonly i18n = inject(TRANSLATION_PORT);
    private readonly host = inject(ElementRef<HTMLElement>);

    readonly actions = input.required<ActionDropdownItem[]>();
    readonly disabled = input(false);
    readonly tooltip = input('');

    /** Émet l'`id` de l'action choisie. */
    readonly actionSelected = output<string>();

    protected readonly open = signal(false);
    protected readonly visibleActions = computed(() =>
        this.actions().filter((a) => !a.hidden)
    );

    protected t(key: string): string {
        return this.i18n.translate(key);
    }

    protected toggle(event: Event): void {
        event.stopPropagation();
        this.open.update((v) => !v);
    }

    protected select(item: ActionDropdownItem): void {
        if (item.disabled) {
            return;
        }
        this.actionSelected.emit(item.id);
        this.open.set(false);
    }

    protected onOutsideClick(event: MouseEvent): void {
        if (
            this.open() &&
            !this.host.nativeElement.contains(event.target as Node)
        ) {
            this.open.set(false);
        }
    }

    protected onEscape(): void {
        this.open.set(false);
    }
}
