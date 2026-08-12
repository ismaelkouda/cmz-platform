import { Component, Signal, computed, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
    MunicipalityFacade,
    RegionSelectFacade,
} from '@cmz/administrative-boundary-application';
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
import { MUNICIPALITY_FILTER_KEYS } from '../constants/municipality-filter-keys.constant';
import { MUNICIPALITY_FORM } from '../constants/municipality-paths.constant';
import { MUNICIPALITY_TABLE } from '../constants/municipality-table.constant';
import { MunicipalityVmProps } from '../adapters/municipality-vm-props.interface';
import { MunicipalityPresenter } from '../adapters/municipality-vm.presenter';
import { MunicipalityFilterStore } from '../stores/municipality-filter.store';

const ROUTE = '/territorial-structures/municipalities';
const T = 'ADMINISTRATIVE_BOUNDARY.MUNICIPALITY';

@Component({
    selector: 'cmz-municipality-list',
    imports: [FilterComponent, TableComponent, PaginationComponent],
    providers: [MunicipalityFilterStore],
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
export class MunicipalityListComponent {
    protected readonly facade = inject(MunicipalityFacade);
    private readonly store = inject(MunicipalityFilterStore);
    private readonly regionSelect = inject(RegionSelectFacade);
    private readonly permissions = inject(PermissionActionsService);
    private readonly confirm = inject(CONFIRM_DIALOG_PORT);
    private readonly notification = inject(NotificationPort);
    private readonly i18n = inject(TranslationPort);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    protected readonly ns = T;
    protected readonly filterModel = this.store.model;
    protected readonly tableColumns = MUNICIPALITY_TABLE.cols;
    protected readonly regionOptions = this.regionSelect.options;

    /** Départements de la région sélectionnée dans le filtre (cascade). */
    protected readonly filterDepartmentOptions = computed(() => {
        const regionId = this.filterModel()[MUNICIPALITY_FILTER_KEYS.REGION_ID];
        if (!regionId) {
            return [];
        }
        return (
            this.regionOptions().find((r) => r.id === regionId)?.departments ??
            []
        );
    });

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

    private readonly presenter = new MunicipalityPresenter((k) =>
        this.i18n.translate(k)
    );

    protected readonly itemsVM = computed<MunicipalityVmProps[]>(() => {
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
            name: MUNICIPALITY_FILTER_KEYS.SEARCH,
            label: T + '.FILTER.SEARCH',
            placeholder: T + '.FILTER.SEARCH_PLACEHOLDER',
        },
        {
            type: 'select',
            name: MUNICIPALITY_FILTER_KEYS.REGION_ID,
            label: T + '.FILTER.REGION',
            placeholder: 'COMMON.SELECT_PLACEHOLDER',
            options: this.regionOptions().map((region) => ({
                label: region.name,
                value: region.id,
            })),
        },
        {
            type: 'select',
            name: MUNICIPALITY_FILTER_KEYS.DEPARTMENT_ID,
            label: T + '.FILTER.DEPARTMENT',
            placeholder: 'COMMON.SELECT_PLACEHOLDER',
            options: this.filterDepartmentOptions().map((department) => ({
                label: department.name,
                value: department.id,
            })),
        },
        {
            type: 'date',
            name: MUNICIPALITY_FILTER_KEYS.START_DATE,
            label: T + '.FILTER.DATE.FROM',
        },
        {
            type: 'date',
            name: MUNICIPALITY_FILTER_KEYS.END_DATE,
            label: T + '.FILTER.DATE.TO',
        },
    ]);

    constructor() {
        this.regionSelect.load();
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

    protected onAction(event: {
        row: MunicipalityVmProps;
        actionId: string;
    }): void {
        const { row, actionId } = event;
        switch (actionId) {
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
        row: MunicipalityVmProps,
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
        void this.router.navigate(['../', MUNICIPALITY_FORM], {
            relativeTo: this.route,
            queryParams: uniqId ? { uniqId, ref } : { ref },
        });
    }
}
