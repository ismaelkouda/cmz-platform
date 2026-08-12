import { Component, Signal, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AllFinalizationFacade } from '@cmz/finalization-application';
import {
    NotificationPort,
    PermissionActionsService,
    TranslationPort,
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
import { AllFinalizationVmProps } from '../adapters/all-finalization-vm-props.interface';
import { AllFinalizationPresenter } from '../adapters/all-finalization-vm.presenter';
import { ALL_FINALIZATION_FILTER_KEYS } from '../constants/all-finalization-filter-keys.constant';
import { ALL_FINALIZATION_TABLE } from '../constants/all-finalization-table.constant';
import { FINALIZATION_ALL_ROUTE } from '../constants/finalization-paths.constant';
import { FINALIZATION_ALL_STATE_OPTIONS } from '../constants/finalization-all-status-label.constant';
import { AllFinalizationFilterStore } from '../stores/all-finalization-filter.store';
import {
    exportFinalizationList,
    finalizationListExportDisabled,
    finalizationListExportTooltip,
} from '../utils/finalization-list-export.util';
import { FinalizationDetailsDialogComponent } from './finalization-details-dialog.component';

const T = 'FINALIZATION.ALL';

@Component({
    selector: 'cmz-all-finalization-page',
    imports: [
        FilterComponent,
        TableComponent,
        PaginationComponent,
        FinalizationDetailsDialogComponent,
    ],
    providers: [AllFinalizationFilterStore],
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

        <cmz-finalization-details-dialog
            [visible]="detailsDialogVisible()"
            [uniqId]="selectedUniqId()"
            (closed)="onDetailsDialogClosed()"
            (actionCompleted)="onDetailsActionCompleted()"
        />
    `,
})
export class AllFinalizationPageComponent {
    protected readonly facade = inject(AllFinalizationFacade);
    private readonly store = inject(AllFinalizationFilterStore);
    private readonly permissions = inject(PermissionActionsService);
    private readonly notification = inject(NotificationPort);
    private readonly i18n = inject(TranslationPort);
    private readonly excelExport = inject(EXCEL_EXPORT_PORT);

    protected readonly ns = T;
    protected readonly filterModel = this.store.model;
    protected readonly tableColumns = ALL_FINALIZATION_TABLE.cols;
    protected readonly tableActions = ALL_FINALIZATION_TABLE.actions;

    protected readonly detailsDialogVisible = signal(false);
    protected readonly selectedUniqId = signal<string | null>(null);
    protected readonly exporting = signal(false);

    private readonly canExport = this.permissions.can(
        FINALIZATION_ALL_ROUTE,
        'export'
    );

    private readonly presenter = new AllFinalizationPresenter((key) =>
        this.i18n.translate(key)
    );

    protected readonly itemsVM = computed<AllFinalizationVmProps[]>(() =>
        this.facade.items().map((item) => this.presenter.map(item))
    );

    protected readonly indexOffset = computed(() => {
        const page = this.facade.value();
        return page ? (page.currentPage - 1) * page.perPage : 0;
    });

    protected readonly exportTooltip = computed(() =>
        finalizationListExportTooltip(
            (key) => this.t(key),
            T,
            this.canExport(),
            this.facade.total()
        )
    );

    protected readonly exportDisabled = computed(() =>
        finalizationListExportDisabled(
            this.canExport(),
            this.facade.total(),
            this.facade.isLoading(),
            this.exporting()
        )
    );

    protected readonly filterFields: Signal<FilterField[]> = computed(() => [
        {
            type: 'text',
            name: ALL_FINALIZATION_FILTER_KEYS.INITIATOR_PHONE_NUMBER,
            label: `${T}.FILTER.INITIATOR`,
            placeholder: 'COMMON.PHONE_PLACEHOLDER',
        },
        {
            type: 'text',
            name: ALL_FINALIZATION_FILTER_KEYS.UNIQ_ID,
            label: `${T}.FILTER.UNIQ_ID`,
            placeholder: 'COMMON.REPORT_UNIQ_ID_PLACEHOLDER',
        },
        {
            type: 'select',
            name: ALL_FINALIZATION_FILTER_KEYS.REPORT_TYPE,
            label: `${T}.FILTER.REPORT_TYPE`,
            placeholder: 'COMMON.SELECT_PLACEHOLDER',
            options: REPORT_TYPE_OPTIONS,
        },
        {
            type: 'text',
            name: ALL_FINALIZATION_FILTER_KEYS.OPERATORS,
            label: `${T}.FILTER.OPERATORS`,
            placeholder: 'COMMON.SELECT_PLACEHOLDER',
        },
        {
            type: 'select',
            name: ALL_FINALIZATION_FILTER_KEYS.SOURCE,
            label: `${T}.FILTER.SOURCE`,
            placeholder: 'COMMON.SELECT_PLACEHOLDER',
            options: REPORT_SOURCE_OPTIONS,
        },
        {
            type: 'select',
            name: ALL_FINALIZATION_FILTER_KEYS.STATE,
            label: `${T}.FILTER.STATE`,
            placeholder: 'COMMON.SELECT_PLACEHOLDER',
            options: FINALIZATION_ALL_STATE_OPTIONS,
        },
        {
            type: 'date',
            name: ALL_FINALIZATION_FILTER_KEYS.START_DATE,
            label: 'COMMON.START_DATE',
        },
        {
            type: 'date',
            name: ALL_FINALIZATION_FILTER_KEYS.END_DATE,
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
        void exportFinalizationList({
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
        row: AllFinalizationVmProps;
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
