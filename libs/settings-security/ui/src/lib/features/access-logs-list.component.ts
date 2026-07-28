import {
    ChangeDetectionStrategy,
    Component,
    Signal,
    computed,
    inject,
} from '@angular/core';
import { AccessLogsFacade } from '@cmz/settings-security-application';
import { TranslationPort } from '@cmz/shared-application';
import {
    FilterComponent,
    FilterField,
    PaginationComponent,
    TableComponent,
    labelsToFilterOptions,
} from '@cmz/shared-ui';
import { ACCESS_LOGS_ACTION_LABEL } from '../constants/access-logs-action-label.constant';
import { ACCESS_LOGS_FILTER_KEYS } from '../constants/access-logs-filter-keys.constant';
import { ACCESS_LOGS_TABLE } from '../constants/access-logs-table.constant';
import { AccessLogsVmProps } from '../adapters/access-logs-vm-props.interface';
import { AccessLogsPresenter } from '../adapters/access-logs-vm.presenter';
import { AccessLogsFilterStore } from '../stores/access-logs-filter.store';

const T = 'SETTINGS_SECURITY.ACCESS_LOGS';

/**
 * Liste `access-logs` — journal en lecture seule (cf. domaine
 * `AccessLogsRepository` : une seule méthode `execute`). Pas de bouton
 * "créer", pas de colonne d'actions de ligne, pas de garde de permission
 * par action (juste la vue elle-même, gardée au niveau route en Phase 6).
 */
@Component({
    selector: 'cmz-access-logs-list',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FilterComponent, TableComponent, PaginationComponent],
    providers: [AccessLogsFilterStore],
    template: `
        <section class="flex flex-col gap-4">
            <header class="flex items-center justify-between">
                <h1 class="text-lg font-semibold text-text">
                    {{ t(ns + '.TITLE') }}
                </h1>
                <button
                    type="button"
                    class="rounded border border-border px-3 py-2 text-sm hover:bg-surface-hover"
                    (click)="onRefresh()"
                >
                    {{ t('COMMON.REFRESH') }}
                </button>
            </header>

            <cmz-filter
                [(model)]="filterModel"
                [fields]="filterFields()"
                [loading]="facade.isLoading()"
                (apply)="onApply()"
                (clear)="onClear()"
            />

            <cmz-table
                [columns]="tableColumns"
                [rows]="itemsVM()"
                [loading]="facade.isLoading()"
                [indexOffset]="indexOffset()"
                dataKey="uniqId"
            />

            @if (facade.value(); as page) {
                <cmz-pagination
                    [meta]="page"
                    (pageChange)="onChangePage($event)"
                />
            }
        </section>
    `,
})
export class AccessLogsListComponent {
    protected readonly facade = inject(AccessLogsFacade);
    private readonly store = inject(AccessLogsFilterStore);
    private readonly i18n = inject(TranslationPort);

    protected readonly ns = T;
    protected readonly filterModel = this.store.model;
    protected readonly tableColumns = ACCESS_LOGS_TABLE.cols;

    private readonly presenter = new AccessLogsPresenter((k) =>
        this.i18n.translate(k)
    );

    protected readonly itemsVM = computed<AccessLogsVmProps[]>(() =>
        this.facade.items().map((item) => this.presenter.map(item))
    );

    protected readonly indexOffset = computed(() => {
        const page = this.facade.value();
        return page ? (page.currentPage - 1) * page.perPage : 0;
    });

    protected readonly filterFields: Signal<FilterField[]> = computed(() => [
        {
            type: 'text',
            name: ACCESS_LOGS_FILTER_KEYS.SEARCH,
            label: T + '.FILTER.SEARCH',
            placeholder: T + '.FILTER.SEARCH_PLACEHOLDER',
        },
        {
            type: 'select',
            name: ACCESS_LOGS_FILTER_KEYS.ACTION,
            label: T + '.FILTER.ACTION',
            placeholder: 'COMMON.SELECT_PLACEHOLDER',
            options: labelsToFilterOptions(ACCESS_LOGS_ACTION_LABEL, (k) =>
                this.i18n.translate(k)
            ),
        },
        {
            type: 'date',
            name: ACCESS_LOGS_FILTER_KEYS.START_DATE,
            label: T + '.FILTER.DATE.FROM',
        },
        {
            type: 'date',
            name: ACCESS_LOGS_FILTER_KEYS.END_DATE,
            label: T + '.FILTER.DATE.TO',
        },
    ]);

    constructor() {
        this.facade.load(this.store.toContract());
    }

    protected t(key: string): string {
        return this.i18n.translate(key);
    }

    protected onApply(): void {
        this.facade.load(this.store.toContract(), '1', { forceRefresh: true });
    }

    protected onClear(): void {
        this.store.reset();
        this.facade.load(this.store.toContract(), '1', { forceRefresh: true });
    }

    protected onRefresh(): void {
        this.facade.reload();
    }

    protected onChangePage(page: number): void {
        this.facade.changePage(String(page));
    }
}
