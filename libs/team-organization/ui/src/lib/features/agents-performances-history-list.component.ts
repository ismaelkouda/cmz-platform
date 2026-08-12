import { Component, Signal, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { AgentsPerformancesHistoryFacade } from '@cmz/team-organization-application';
import { TRANSLATION_PORT } from '@cmz/shared-application';
import {
    FilterComponent,
    FilterField,
    PaginationComponent,
    TableComponent,
} from '@cmz/shared-ui';
import { AGENTS_PERFORMANCES_HISTORY_FILTER_KEYS } from '../constants/agents-performances-history-filter-keys.constant';
import { AGENTS_PERFORMANCES_HISTORY_TABLE } from '../constants/agents-performances-history-table.constant';
import { AgentsPerformancesHistoryVmProps } from '../adapters/agents-performances-history-vm-props.interface';
import { AgentsPerformancesHistoryPresenter } from '../adapters/agents-performances-history-vm.presenter';
import { AgentsPerformancesHistoryFilterStore } from '../stores/agents-performances-history-filter.store';

const T = 'TEAM_ORGANIZATION.AGENTS_PERFORMANCES.HISTORY';

@Component({
    selector: 'cmz-agents-performances-history-list',
    imports: [FilterComponent, TableComponent, PaginationComponent],
    providers: [AgentsPerformancesHistoryFilterStore],
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
export class AgentsPerformancesHistoryListComponent {
    protected readonly facade = inject(AgentsPerformancesHistoryFacade);
    private readonly store = inject(AgentsPerformancesHistoryFilterStore);
    private readonly i18n = inject(TRANSLATION_PORT);
    private readonly route = inject(ActivatedRoute);

    protected readonly ns = T;
    protected readonly filterModel = this.store.model;
    protected readonly tableColumns = AGENTS_PERFORMANCES_HISTORY_TABLE.cols;

    private readonly queryUniqId = toSignal(this.route.queryParamMap, {
        initialValue: null,
    });
    private readonly uniqId = computed(
        () => this.queryUniqId()?.get('uniqId') ?? null
    );

    private readonly presenter = new AgentsPerformancesHistoryPresenter();

    protected readonly itemsVM = computed<AgentsPerformancesHistoryVmProps[]>(
        () => this.facade.items().map((item) => this.presenter.map(item))
    );

    protected readonly indexOffset = computed(() => {
        const page = this.facade.value();
        return page ? (page.currentPage - 1) * page.perPage : 0;
    });

    protected readonly filterFields: Signal<FilterField[]> = computed(() => [
        {
            type: 'text',
            name: AGENTS_PERFORMANCES_HISTORY_FILTER_KEYS.SEARCH,
            label: `${T}.FILTER.SEARCH`,
        },
        {
            type: 'date',
            name: AGENTS_PERFORMANCES_HISTORY_FILTER_KEYS.START_DATE,
            label: 'COMMON.START_DATE',
        },
        {
            type: 'date',
            name: AGENTS_PERFORMANCES_HISTORY_FILTER_KEYS.END_DATE,
            label: 'COMMON.END_DATE',
        },
    ]);

    constructor() {
        this.facade.load(this.store.toContract(this.uniqId()));
    }

    protected t(key: string): string {
        return this.i18n.translate(key);
    }

    protected onApply(): void {
        this.facade.load(this.store.toContract(this.uniqId()), '1', {
            forceRefresh: true,
        });
    }

    protected onClear(): void {
        this.store.reset();
        this.facade.load(this.store.toContract(this.uniqId()), '1', {
            forceRefresh: true,
        });
    }

    protected onRefresh(): void {
        this.facade.reload();
    }

    protected onChangePage(page: number): void {
        this.facade.changePage(String(page));
    }
}
