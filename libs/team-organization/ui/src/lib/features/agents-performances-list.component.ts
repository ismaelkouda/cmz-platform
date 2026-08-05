import { Component, Signal, computed, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AgentsPerformancesFacade } from '@cmz/team-organization-application';
import { PermissionActionsService, TranslationPort } from '@cmz/shared-application';
import {
    FilterComponent,
    FilterField,
    PaginationComponent,
    TableComponent,
} from '@cmz/shared-ui';
import { AGENTS_PERFORMANCES_FILTER_KEYS } from '../constants/agents-performances-filter-keys.constant';
import { AGENTS_PERFORMANCES_HISTORY } from '../constants/agents-performances-paths.constant';
import { AGENTS_PERFORMANCES_TABLE } from '../constants/agents-performances-table.constant';
import { AgentsPerformancesVmProps } from '../adapters/agents-performances-vm-props.interface';
import { AgentsPerformancesPresenter } from '../adapters/agents-performances-vm.presenter';
import { AgentsPerformancesFilterStore } from '../stores/agents-performances-filter.store';

const ROUTE = '/organization/agent-performances';
const T = 'TEAM_ORGANIZATION.AGENTS_PERFORMANCES';

@Component({
    selector: 'cmz-agents-performances-list',
    imports: [FilterComponent, TableComponent, PaginationComponent],
    providers: [AgentsPerformancesFilterStore],
    template: `
        <section class="flex flex-col gap-4">
            <header class="flex items-center justify-between">
                <h1 class="text-lg font-semibold text-text">
                    {{ t(ns + '.TITLE') }}
                </h1>
                <div class="flex gap-2">
                    <button
                        type="button"
                        class="rounded border border-border px-3 py-2 text-sm hover:bg-surface-hover"
                        (click)="onRefresh()"
                    >
                        {{ t('COMMON.REFRESH') }}
                    </button>
                </div>
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
                [rowActionDefinitions]="tableActions"
                dataKey="uniqId"
                (actionClicked)="onAction($event)"
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
export class AgentsPerformancesListComponent {
    protected readonly facade = inject(AgentsPerformancesFacade);
    private readonly store = inject(AgentsPerformancesFilterStore);
    private readonly permissions = inject(PermissionActionsService);
    private readonly i18n = inject(TranslationPort);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    protected readonly ns = T;
    protected readonly filterModel = this.store.model;
    protected readonly tableColumns = AGENTS_PERFORMANCES_TABLE.cols;
    protected readonly tableActions = AGENTS_PERFORMANCES_TABLE.actions;

    private readonly canView = this.permissions.can(ROUTE, 'view');

    private readonly presenter = new AgentsPerformancesPresenter((key) =>
        this.i18n.translate(key)
    );

    protected readonly itemsVM = computed<AgentsPerformancesVmProps[]>(() =>
        this.facade.items().map((item) => this.presenter.map(item))
    );

    protected readonly indexOffset = computed(() => {
        const page = this.facade.value();
        return page ? (page.currentPage - 1) * page.perPage : 0;
    });

    protected readonly filterFields: Signal<FilterField[]> = computed(() => [
        {
            type: 'text',
            name: AGENTS_PERFORMANCES_FILTER_KEYS.SEARCH,
            label: `${T}.FILTER.SEARCH`,
            placeholder: `${T}.FILTER.SEARCH_PLACEHOLDER`,
        },
        {
            type: 'text',
            name: AGENTS_PERFORMANCES_FILTER_KEYS.MEMBER,
            label: `${T}.FILTER.PARTICIPANT`,
            placeholder: `${T}.FILTER.PARTICIPANT_PLACEHOLDER`,
        },
        {
            type: 'date',
            name: AGENTS_PERFORMANCES_FILTER_KEYS.START_DATE,
            label: 'COMMON.START_DATE',
        },
        {
            type: 'date',
            name: AGENTS_PERFORMANCES_FILTER_KEYS.END_DATE,
            label: 'COMMON.END_DATE',
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

    protected onAction(event: {
        row: AgentsPerformancesVmProps;
        actionId: string;
    }): void {
        if (event.actionId !== 'view' || !this.canView()) {
            return;
        }
        void this.router.navigate(['../', AGENTS_PERFORMANCES_HISTORY], {
            relativeTo: this.route,
            queryParams: { uniqId: event.row.uniqId },
        });
    }
}
