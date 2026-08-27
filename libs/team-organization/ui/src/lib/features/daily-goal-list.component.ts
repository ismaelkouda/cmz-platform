import { Component, Signal, computed, inject } from '@angular/core';
import { DailyGoalFacade } from '@cmz/team-organization-application';
import { PermissionActionsService } from '@cmz/shared-application';
import {
    FilterComponent,
    FilterField,
    PaginationComponent,
    TableComponent,
} from '@cmz/shared-ui';
import { DAILY_GOAL_FILTER_KEYS } from '../constants/daily-goal-filter-keys.constant';
import { DAILY_GOAL_TABLE } from '../constants/daily-goal-table.constant';
import { DailyGoalVmProps } from '../adapters/daily-goal-vm-props.interface';
import { DailyGoalPresenter } from '../adapters/daily-goal-vm.presenter';
import { DailyGoalFilterStore } from '../stores/daily-goal-filter.store';
import { TranslocoService } from '@jsverse/transloco';

const ROUTE = '/team-organization/daily-goal';
const T = 'TEAM_ORGANIZATION.DAILY_GOAL';

@Component({
    selector: 'cmz-daily-goal-list',
    imports: [FilterComponent, TableComponent, PaginationComponent],
    providers: [DailyGoalFilterStore],
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
export class DailyGoalListComponent {
    protected readonly facade = inject(DailyGoalFacade);
    private readonly store = inject(DailyGoalFilterStore);
    private readonly permissions = inject(PermissionActionsService);
    private readonly i18n = inject(TranslocoService);

    protected readonly ns = T;
    protected readonly filterModel = this.store.model;
    protected readonly tableColumns = DAILY_GOAL_TABLE.cols;

    private readonly canView = this.permissions.can(ROUTE, 'read');

    private readonly presenter = new DailyGoalPresenter((key) =>
        this.i18n.translate(key)
    );

    protected readonly itemsVM = computed<DailyGoalVmProps[]>(() =>
        this.facade.items().map((item) => this.presenter.map(item))
    );

    protected readonly indexOffset = computed(() => {
        const page = this.facade.value();
        return page ? (page.currentPage - 1) * page.perPage : 0;
    });

    protected readonly filterFields: Signal<FilterField[]> = computed(() => [
        {
            type: 'date',
            name: DAILY_GOAL_FILTER_KEYS.START_DATE,
            label: 'COMMON.START_DATE',
        },
        {
            type: 'date',
            name: DAILY_GOAL_FILTER_KEYS.END_DATE,
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
}
