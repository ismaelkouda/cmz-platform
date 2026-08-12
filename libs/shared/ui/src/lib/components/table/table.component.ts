import { Component, inject, input, output } from '@angular/core';
import { TRANSLATION_PORT } from '@cmz/shared-application';
import { TableColumn } from '../../interfaces/table-column.interface';
import { TableRowActionDefinition } from '../../interfaces/table-row-action.interface';
import { TableRowBase } from '../../interfaces/table-row.interface';
import { ActionDropdownComponent } from '../action-dropdown/action-dropdown.component';

/** Champs de colonne spéciaux (rendus par le composant, pas par une donnée). */
const INDEX_FIELD = '__index';
const ACTION_BUTTONS_FIELD = '__action';
const ACTIONS_FIELD = '__actionDropdown';

/**
 * Table de données — **design-system**, responsabilité unique : afficher des
 * lignes selon des colonnes + une colonne d'actions, avec états loading/empty.
 * Reconstruite sans lib tierce (le source enveloppait primeng) et sans le
 * fourre-tout d'origine (sélection, export, presse-papier, badges, 30 I/O,
 * `any`). Pagination = composant séparé `cmz-pagination` (composition).
 *
 * Accessible : `<table>` sémantique, `<th scope="col">`, `aria-busy`. Libellés
 * d'en-tête traduits via `TranslationPort`. Générique (`T extends TableRowBase`).
 */
@Component({
    selector: 'cmz-table',
    imports: [ActionDropdownComponent],
    template: `
        <div class="cmz-table" [attr.aria-busy]="loading()">
            <table class="cmz-table__table">
                <thead>
                    <tr>
                        @for (col of columns(); track col.field) {
                            <th
                                scope="col"
                                [class]="col.class ?? ''"
                                [style.width]="col.width"
                            >
                                @if (!isSpecial(col.field)) {
                                    {{ t(col.header) }}
                                } @else {
                                    <span class="cmz-table__sr">{{
                                        t(col.header)
                                    }}</span>
                                }
                            </th>
                        }
                    </tr>
                </thead>

                <tbody>
                    @if (loading()) {
                        <tr>
                            <td
                                [attr.colspan]="columns().length"
                                class="cmz-table__state"
                            >
                                {{ t('COMMON.LOADING') }}
                            </td>
                        </tr>
                    } @else if (rows().length === 0) {
                        <tr>
                            <td
                                [attr.colspan]="columns().length"
                                class="cmz-table__state"
                            >
                                {{ t('COMMON.NO_DATA') }}
                            </td>
                        </tr>
                    } @else {
                        @for (
                            row of rows();
                            track rowKey(row, $index);
                            let i = $index
                        ) {
                            <tr>
                                @for (col of columns(); track col.field) {
                                    <td [class]="col.class ?? ''">
                                        @switch (col.field) {
                                            @case (INDEX_FIELD) {
                                                {{ indexOffset() + i + 1 }}
                                            }
                                            @case (ACTION_BUTTONS_FIELD) {
                                                <div
                                                    class="cmz-table__row-actions"
                                                >
                                                    @for (
                                                        action of rowActionDefinitions();
                                                        track action.id
                                                    ) {
                                                        <button
                                                            type="button"
                                                            class="cmz-table__row-action"
                                                            [title]="
                                                                rowActionTooltip(
                                                                    row,
                                                                    action.id
                                                                )
                                                            "
                                                            [disabled]="
                                                                loading() ||
                                                                rowActionDisabled(
                                                                    row,
                                                                    action.id
                                                                )
                                                            "
                                                            (click)="
                                                                onAction(
                                                                    row,
                                                                    action.id
                                                                )
                                                            "
                                                        >
                                                            <i
                                                                [class]="
                                                                    action.icon
                                                                "
                                                                aria-hidden="true"
                                                            ></i>
                                                        </button>
                                                    }
                                                </div>
                                            }
                                            @case (ACTIONS_FIELD) {
                                                <cmz-action-dropdown
                                                    [actions]="
                                                        row.dropdownActions ??
                                                        []
                                                    "
                                                    [disabled]="
                                                        row.disableDropdown ??
                                                        false
                                                    "
                                                    [tooltip]="
                                                        row.tooltipDropdown ??
                                                        ''
                                                    "
                                                    (actionSelected)="
                                                        onAction(row, $event)
                                                    "
                                                />
                                            }
                                            @default {
                                                {{ cellText(row, col.field) }}
                                            }
                                        }
                                    </td>
                                }
                            </tr>
                        }
                    }
                </tbody>
            </table>
        </div>
    `,
    styles: `
        .cmz-table {
            width: 100%;
            overflow-x: auto;
        }
        .cmz-table__table {
            width: 100%;
            border-collapse: collapse;
            font-family: var(--cmz-font-family, inherit);
            font-size: var(--cmz-font-size-sm, 0.875rem);
        }
        .cmz-table__table th,
        .cmz-table__table td {
            padding: var(--cmz-space-2, 0.5rem) var(--cmz-space-3, 0.75rem);
            border-bottom: 1px solid var(--cmz-color-border, #e2e8f0);
            text-align: left;
        }
        .cmz-table__table th {
            color: var(--cmz-color-muted, #64748b);
            font-weight: 600;
            white-space: nowrap;
        }
        .cmz-table__table tbody tr:hover {
            background: var(--cmz-color-surface-hover, #f8fafc);
        }
        .cmz-table__state {
            text-align: center;
            padding: var(--cmz-space-6, 1.5rem);
            color: var(--cmz-color-muted, #64748b);
        }
        .cmz-table__sr {
            position: absolute;
            width: 1px;
            height: 1px;
            overflow: hidden;
            clip: rect(0 0 0 0);
        }
        .cmz-table__row-actions {
            display: flex;
            justify-content: center;
            gap: var(--cmz-space-1, 0.25rem);
        }
        .cmz-table__row-action {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: var(--cmz-space-1, 0.25rem);
            border: 1px solid var(--cmz-color-border, #e2e8f0);
            border-radius: var(--cmz-radius-sm, 0.25rem);
            background: var(--cmz-color-surface, #fff);
            color: var(--cmz-color-primary, #4f46e5);
            cursor: pointer;
        }
        .cmz-table__row-action:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    `,
})
export class TableComponent<T extends TableRowBase> {
    private readonly i18n = inject(TRANSLATION_PORT);

    protected readonly INDEX_FIELD = INDEX_FIELD;
    protected readonly ACTION_BUTTONS_FIELD = ACTION_BUTTONS_FIELD;
    protected readonly ACTIONS_FIELD = ACTIONS_FIELD;

    readonly columns = input.required<TableColumn[]>();
    readonly rows = input.required<T[]>();
    readonly loading = input(false);
    readonly dataKey = input('uniqId');
    readonly rowActionDefinitions = input<TableRowActionDefinition[]>([]);
    /** Décalage d'index (numérotation continue sur pages : `(page-1)*perPage`). */
    readonly indexOffset = input(0);

    /** Émet la ligne + l'id de l'action choisie. */
    readonly actionClicked = output<{ row: T; actionId: string }>();

    protected t(key: string): string {
        return this.i18n.translate(key);
    }

    protected isSpecial(field: string): boolean {
        return (
            field === INDEX_FIELD ||
            field === ACTION_BUTTONS_FIELD ||
            field === ACTIONS_FIELD
        );
    }

    protected rowActionTooltip(row: T, actionId: string): string {
        return row.actionButtons?.[actionId]?.tooltip ?? '';
    }

    protected rowActionDisabled(row: T, actionId: string): boolean {
        return row.actionButtons?.[actionId]?.disabled ?? false;
    }

    protected cellText(row: T, field: string): string {
        const value = (row as Record<string, unknown>)[field];
        return value == null ? '' : String(value);
    }

    protected rowKey(row: T, index: number): string | number {
        const key = (row as Record<string, unknown>)[this.dataKey()];
        return key == null ? index : String(key);
    }

    protected onAction(row: T, actionId: string): void {
        this.actionClicked.emit({ row, actionId });
    }
}
