import { Component, Signal, computed, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RegionFacade } from '@cmz/administrative-boundary-application';
import {
    NotificationPort,
    PermissionActionsService,
    TranslationPort,
} from '@cmz/shared-application';
import {
    FilterComponent,
    FilterField,
    PaginationComponent,
    TableComponent,
    CONFIRM_DIALOG_PORT,
} from '@cmz/shared-ui';
import { REGION_FILTER_KEYS } from '../constants/region-filter-keys.constant';
import { REGION_FORM } from '../constants/region-paths.constant';
import { REGION_TABLE } from '../constants/region-table.constant';
import { RegionVmProps } from '../adapters/region-vm-props.interface';
import { RegionPresenter } from '../adapters/region-vm.presenter';
import { RegionFilterStore } from '../stores/region-filter.store';

const ROUTE = '/territorial-structures/regions';
const T = 'ADMINISTRATIVE_BOUNDARY.REGION';

@Component({
    selector: 'cmz-region-list',
    imports: [FilterComponent, TableComponent, PaginationComponent],
    providers: [RegionFilterStore],
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
                    <button
                        type="button"
                        class="rounded bg-primary px-3 py-2 text-sm font-medium text-on-primary disabled:opacity-50"
                        [disabled]="!canCreate()"
                        [title]="createTooltip()"
                        (click)="onCreate()"
                    >
                        {{ t('COMMON.CREATE') }}
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
export class RegionListComponent {
    protected readonly facade = inject(RegionFacade);
    private readonly store = inject(RegionFilterStore);
    private readonly permissions = inject(PermissionActionsService);
    private readonly confirm = inject(CONFIRM_DIALOG_PORT);
    private readonly notification = inject(NotificationPort);
    private readonly i18n = inject(TranslationPort);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    protected readonly ns = T;
    protected readonly filterModel = this.store.model;
    protected readonly tableColumns = REGION_TABLE.cols;

    protected readonly canCreate = this.permissions.can(ROUTE, 'create');
    private readonly canEdit = this.permissions.can(ROUTE, 'edit');
    private readonly canDelete = this.permissions.can(ROUTE, 'delete');
    private readonly canChoose = computed(
        () => this.canEdit() && this.canDelete()
    );

    protected readonly createTooltip = computed(() =>
        this.canCreate()
            ? this.t(T + '.TOOLTIP.CREATE')
            : this.t(T + '.TOOLTIP.NO_PERMISSION_CREATE')
    );

    private readonly presenter = new RegionPresenter((k) =>
        this.i18n.translate(k)
    );

    protected readonly itemsVM = computed<RegionVmProps[]>(() => {
        const authorization = {
            canEdit: this.canEdit(),
            canDelete: this.canDelete(),
            canChoose: this.canChoose(),
        };
        const tooltip = {
            edit: this.t(T + '.TOOLTIP.NO_PERMISSION_EDIT'),
            delete: this.t(T + '.TOOLTIP.NO_PERMISSION_DELETE'),
            choose: this.t(T + '.TOOLTIP.NO_PERMISSION_CHOOSE'),
        };
        return this.facade
            .items()
            .map((item) =>
                this.presenter.map(item, { authorization, tooltip })
            );
    });

    protected readonly indexOffset = computed(() => {
        const page = this.facade.value();
        return page ? (page.currentPage - 1) * page.perPage : 0;
    });

    protected readonly filterFields: Signal<FilterField[]> = computed(() => [
        {
            type: 'text',
            name: REGION_FILTER_KEYS.SEARCH,
            label: T + '.FILTER.SEARCH',
            placeholder: T + '.FILTER.SEARCH_PLACEHOLDER',
        },
        {
            type: 'date',
            name: REGION_FILTER_KEYS.START_DATE,
            label: T + '.FILTER.DATE.FROM',
        },
        {
            type: 'date',
            name: REGION_FILTER_KEYS.END_DATE,
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

    protected onCreate(): void {
        if (!this.canCreate()) {
            this.notification.error(this.createTooltip());
            return;
        }
        this.navigateToForm(undefined, 'create');
    }

    /** Drill-down vers la vue imbriquée « départements de cette région ». */
    protected onDrillDown(row: RegionVmProps): void {
        void this.router.navigate(['../', 'departments'], {
            relativeTo: this.route,
            queryParams: { uniqId: row.uniqId, name: row.name },
        });
    }

    protected onAction(event: { row: RegionVmProps; actionId: string }): void {
        const { row, actionId } = event;
        switch (actionId) {
            case 'view-departments':
                this.onDrillDown(row);
                break;
            case 'edit':
                this.navigateToForm(row.uniqId, 'edit');
                break;
            case 'delete':
                void this.confirmThen(row, () =>
                    this.facade.delete({ uniqId: row.uniqId })
                );
                break;
        }
    }

    private async confirmThen(
        row: RegionVmProps,
        run: () => void
    ): Promise<void> {
        const confirmed = await this.confirm.confirm(
            this.i18n.translate(`${T}.SWEET_ALERT.MESSAGE.DELETE`, {
                uniqId: row.actionsRef,
            }),
            { title: this.t(`${T}.SWEET_ALERT.TITLE.DELETE`) }
        );
        if (confirmed) {
            run();
        }
    }

    private navigateToForm(
        uniqId: string | undefined,
        ref: 'create' | 'edit'
    ): void {
        void this.router.navigate(['../', REGION_FORM], {
            relativeTo: this.route,
            queryParams: uniqId ? { uniqId, ref } : { ref },
        });
    }
}
