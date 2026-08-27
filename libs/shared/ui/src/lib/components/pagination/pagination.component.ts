import { Component, computed, inject, input, output } from '@angular/core';
import { PaginationMeta } from '@cmz/shared-domain';
import { pageWindow } from './page-window.util';
import { TranslocoService } from '@jsverse/transloco';

/**
 * Composant de pagination — **design-system**, sans dépendance à une lib UI
 * tierce. Présentation pure : reçoit les métadonnées ([[PaginationMeta]]),
 * émet la page demandée. Accessible (`<nav>`, `aria-current`, boutons
 * désactivés aux bornes) ; libellés traduits via Transloco.
 * Stylé par tokens CSS (`--cmz-*`) → thémable et réplicable en React.
 */
@Component({
    selector: 'cmz-pagination',
    template: `
        @if (meta(); as m) {
            <nav
                class="cmz-pagination"
                [attr.aria-label]="t('COMMON.PAGINATION.LABEL')"
            >
                <p class="cmz-pagination__range" aria-live="polite">
                    {{ rangeLabel() }}
                </p>

                <ul class="cmz-pagination__list">
                    <li>
                        <button
                            type="button"
                            class="cmz-pagination__btn"
                            [disabled]="!canPrev()"
                            [attr.aria-label]="t('COMMON.PAGINATION.PREVIOUS')"
                            (click)="go(current() - 1)"
                        >
                            ‹
                        </button>
                    </li>

                    @for (token of tokens(); track $index) {
                        @if (token === 'ellipsis') {
                            <li
                                class="cmz-pagination__ellipsis"
                                aria-hidden="true"
                            >
                                …
                            </li>
                        } @else {
                            <li>
                                <button
                                    type="button"
                                    class="cmz-pagination__btn"
                                    [class.cmz-pagination__btn--active]="
                                        token === current()
                                    "
                                    [attr.aria-current]="
                                        token === current() ? 'page' : null
                                    "
                                    (click)="go(token)"
                                >
                                    {{ token }}
                                </button>
                            </li>
                        }
                    }

                    <li>
                        <button
                            type="button"
                            class="cmz-pagination__btn"
                            [disabled]="!canNext()"
                            [attr.aria-label]="t('COMMON.PAGINATION.NEXT')"
                            (click)="go(current() + 1)"
                        >
                            ›
                        </button>
                    </li>
                </ul>
            </nav>
        }
    `,
    styles: `
        .cmz-pagination {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: var(--cmz-space-3, 0.75rem);
            flex-wrap: wrap;
            font-family: var(--cmz-font-family, inherit);
        }
        .cmz-pagination__range {
            margin: 0;
            color: var(--cmz-color-muted, #64748b);
            font-size: var(--cmz-font-size-sm, 0.875rem);
        }
        .cmz-pagination__list {
            display: flex;
            align-items: center;
            gap: var(--cmz-space-1, 0.25rem);
            list-style: none;
            margin: 0;
            padding: 0;
        }
        .cmz-pagination__btn {
            min-width: 2rem;
            height: 2rem;
            padding: 0 var(--cmz-space-2, 0.5rem);
            border: 1px solid var(--cmz-color-border, #e2e8f0);
            border-radius: var(--cmz-radius, 0.375rem);
            background: var(--cmz-color-surface, #fff);
            color: var(--cmz-color-text, #0f172a);
            font: inherit;
            cursor: pointer;
            transition:
                background 0.15s ease,
                border-color 0.15s ease;
        }
        .cmz-pagination__btn:hover:not(:disabled) {
            background: var(--cmz-color-surface-hover, #f1f5f9);
        }
        .cmz-pagination__btn:focus-visible {
            outline: 2px solid var(--cmz-color-focus, #2563eb);
            outline-offset: 2px;
        }
        .cmz-pagination__btn--active {
            background: var(--cmz-color-primary, #2563eb);
            border-color: var(--cmz-color-primary, #2563eb);
            color: var(--cmz-color-on-primary, #fff);
            font-weight: 600;
        }
        .cmz-pagination__btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .cmz-pagination__ellipsis {
            padding: 0 var(--cmz-space-1, 0.25rem);
            color: var(--cmz-color-muted, #64748b);
        }
    `,
})
export class PaginationComponent {
    private readonly i18n = inject(TranslocoService);

    /** Métadonnées de pagination (structurellement satisfaites par `PageResult`). */
    readonly meta = input.required<PaginationMeta>();

    /** Émet la page demandée (1-based). */
    readonly pageChange = output<number>();

    protected readonly current = computed(() => this.meta().currentPage);
    protected readonly last = computed(() => Math.max(1, this.meta().lastPage));
    protected readonly canPrev = computed(() => this.current() > 1);
    protected readonly canNext = computed(() => this.current() < this.last());
    protected readonly tokens = computed(() =>
        pageWindow(this.current(), this.last())
    );

    protected readonly rangeLabel = computed(() => {
        const m = this.meta();
        const from = m.total === 0 ? 0 : (m.currentPage - 1) * m.perPage + 1;
        const to = Math.min(m.currentPage * m.perPage, m.total);
        return this.i18n.translate('COMMON.PAGINATION.RANGE', {
            from,
            to,
            total: m.total,
        });
    });

    protected t(key: string): string {
        return this.i18n.translate(key);
    }

    protected go(page: number): void {
        if (page < 1 || page > this.last() || page === this.current()) {
            return;
        }
        this.pageChange.emit(page);
    }
}
