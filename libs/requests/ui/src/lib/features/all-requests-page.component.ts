import { Component, Signal, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AllRequestsFacade } from '@cmz/requests-application';
import {
    PermissionActionsService,
    NOTIFICATION_PORT,
    TRANSLATION_PORT,
} from '@cmz/shared-application';
import {
    FilterComponent,
    FilterField,
    PaginationComponent,
    REPORT_SOURCE_OPTIONS,
    REPORT_TYPE_OPTIONS,
    TableComponent,
    EXCEL_EXPORT_PORT,
} from '@cmz/shared-ui';
import { AllRequestsVmProps } from '../adapters/all-requests-vm-props.interface';
import { AllRequestsPresenter } from '../adapters/all-requests-vm.presenter';
import { ALL_REQUESTS_FILTER_KEYS } from '../constants/all-requests-filter-keys.constant';
import { ALL_REQUESTS_TABLE } from '../constants/all-requests-table.constant';
import { REQUESTS_ALL_ROUTE } from '../constants/requests-paths.constant';
import { REQUESTS_ALL_STATUS_OPTIONS } from '../constants/requests-all-status-label.constant';
import { AllRequestsFilterStore } from '../stores/all-requests-filter.store';
import {
    exportRequestsList,
    requestsListExportDisabled,
    requestsListExportTooltip,
} from '../utils/requests-list-export.util';
import { RequestsDetailsDialogComponent } from './requests-details-dialog.component';

const T = 'REQUESTS.ALL';

@Component({
    selector: 'cmz-all-requests-page',
    imports: [
        FilterComponent,
        TableComponent,
        PaginationComponent,
        RequestsDetailsDialogComponent,
    ],
    providers: [AllRequestsFilterStore],
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
                        class="rounded border border-border px-3 py-2 text-sm hover:bg-surface-hover disabled:opacity-50"
                        [disabled]="exportDisabled()"
                        [attr.title]="exportTooltip()"
                        (click)="onExport()"
                    >
                        {{ t('COMMON.EXPORT') }}
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

        <cmz-requests-details-dialog
            [visible]="detailsDialogVisible()"
            [uniqId]="selectedUniqId()"
            (closed)="onDetailsDialogClosed()"
            (actionCompleted)="onDetailsActionCompleted()"
        />
    `,
})
export class AllRequestsPageComponent {
    protected readonly facade = inject(AllRequestsFacade);
    private readonly store = inject(AllRequestsFilterStore);
    private readonly permissions = inject(PermissionActionsService);
    private readonly notification = inject(NOTIFICATION_PORT);
    private readonly i18n = inject(TRANSLATION_PORT);
    private readonly excelExport = inject(EXCEL_EXPORT_PORT);

    protected readonly ns = T;
    protected readonly filterModel = this.store.model;
    protected readonly tableColumns = ALL_REQUESTS_TABLE.cols;
    protected readonly tableActions = ALL_REQUESTS_TABLE.actions;

    protected readonly detailsDialogVisible = signal(false);
    protected readonly selectedUniqId = signal<string | null>(null);
    protected readonly exporting = signal(false);

    private readonly canExport = this.permissions.can(
        REQUESTS_ALL_ROUTE,
        'export'
    );

    private readonly presenter = new AllRequestsPresenter((key) =>
        this.i18n.translate(key)
    );

    protected readonly itemsVM = computed<AllRequestsVmProps[]>(() =>
        this.facade.items().map((item) => this.presenter.map(item))
    );

    protected readonly indexOffset = computed(() => {
        const page = this.facade.value();
        return page ? (page.currentPage - 1) * page.perPage : 0;
    });

    protected readonly exportTooltip = computed(() =>
        requestsListExportTooltip(
            (key) => this.t(key),
            T,
            this.canExport(),
            this.facade.total()
        )
    );

    protected readonly exportDisabled = computed(() =>
        requestsListExportDisabled(
            this.canExport(),
            this.facade.total(),
            this.facade.isLoading(),
            this.exporting()
        )
    );

    protected readonly filterFields: Signal<FilterField[]> = computed(() => [
        {
            type: 'text',
            name: ALL_REQUESTS_FILTER_KEYS.INITIATOR_PHONE_NUMBER,
            label: `${T}.FILTER.INITIATOR`,
            placeholder: 'COMMON.PHONE_PLACEHOLDER',
        },
        {
            type: 'text',
            name: ALL_REQUESTS_FILTER_KEYS.UNIQ_ID,
            label: `${T}.FILTER.UNIQ_ID`,
            placeholder: 'COMMON.REPORT_UNIQ_ID_PLACEHOLDER',
        },
        {
            type: 'select',
            name: ALL_REQUESTS_FILTER_KEYS.REPORT_TYPE,
            label: `${T}.FILTER.REPORT_TYPE`,
            placeholder: 'COMMON.SELECT_PLACEHOLDER',
            options: REPORT_TYPE_OPTIONS,
        },
        {
            type: 'text',
            name: ALL_REQUESTS_FILTER_KEYS.OPERATORS,
            label: `${T}.FILTER.OPERATORS`,
            placeholder: 'COMMON.SELECT_PLACEHOLDER',
        },
        {
            type: 'select',
            name: ALL_REQUESTS_FILTER_KEYS.SOURCE,
            label: `${T}.FILTER.SOURCE`,
            placeholder: 'COMMON.SELECT_PLACEHOLDER',
            options: REPORT_SOURCE_OPTIONS,
        },
        {
            type: 'select',
            name: ALL_REQUESTS_FILTER_KEYS.STATUS,
            label: `${T}.FILTER.STATUS`,
            placeholder: 'COMMON.SELECT_PLACEHOLDER',
            options: REQUESTS_ALL_STATUS_OPTIONS,
        },
        {
            type: 'date',
            name: ALL_REQUESTS_FILTER_KEYS.START_DATE,
            label: 'COMMON.START_DATE',
        },
        {
            type: 'date',
            name: ALL_REQUESTS_FILTER_KEYS.END_DATE,
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

    protected onExport(): void {
        this.exporting.set(true);
        void exportRequestsList({
            excelExport: this.excelExport,
            notification: this.notification,
            translate: (key) => this.t(key),
            ns: T,
            volet: 'all',
            canExport: this.canExport(),
            totalCount: this.facade.total(),
            columns: this.tableColumns,
            loading: this.facade.isLoading(),
            exporting: this.exporting(),
            fetchRows: async () => {
                const entities = await firstValueFrom(
                    this.facade.export(this.store.toContract(), {
                        forceRefresh: true,
                    })
                );
                return entities.map((item) => this.presenter.map(item));
            },
        }).finally(() => this.exporting.set(false));
    }

    protected onChangePage(page: number): void {
        this.facade.changePage(String(page));
    }

    protected onAction(event: {
        row: AllRequestsVmProps;
        actionId: string;
    }): void {
        if (event.actionId === 'view') {
            this.selectedUniqId.set(event.row.uniqId);
            this.detailsDialogVisible.set(true);
        }
    }

    protected onDetailsDialogClosed(): void {
        this.detailsDialogVisible.set(false);
        this.selectedUniqId.set(null);
    }

    protected onDetailsActionCompleted(): void {
        this.facade.reload();
    }
}
