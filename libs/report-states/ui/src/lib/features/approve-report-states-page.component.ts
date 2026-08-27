import { Component, Signal, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApproveReportStatesFacade } from '@cmz/report-states-application';
import {
    PermissionActionsService,
    NOTIFICATION_PORT,
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
import { ApproveReportStatesVmProps } from '../adapters/approve-report-states-vm-props.interface';
import { ApproveReportStatesPresenter } from '../adapters/approve-report-states-vm.presenter';
import { APPROVE_REPORT_STATES_FILTER_KEYS } from '../constants/approve-report-states-filter-keys.constant';
import { REPORT_STATES_APPROVE_ROUTE } from '../constants/report-states-paths.constant';
import { APPROVE_REPORT_STATES_TABLE } from '../constants/approve-report-states-table.constant';
import { ApproveReportStatesFilterStore } from '../stores/approve-report-states-filter.store';
import {
    exportReportStatesList,
    reportStatesListExportDisabled,
    reportStatesListExportTooltip,
} from '../utils/report-states-list-export.util';
import { ReportStatesDetailsDialogComponent } from './report-states-details-dialog.component';
import { TranslocoService } from '@jsverse/transloco';

const T = 'REPORT_STATES.APPROVE';

@Component({
    selector: 'cmz-approve-report-states-page',
    imports: [
        FilterComponent,
        TableComponent,
        PaginationComponent,
        ReportStatesDetailsDialogComponent,
    ],
    providers: [ApproveReportStatesFilterStore],
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

        <cmz-report-states-details-dialog
            [visible]="detailsDialogVisible()"
            [uniqId]="selectedUniqId()"
            (closed)="onDetailsDialogClosed()"
            (actionCompleted)="onDetailsActionCompleted()"
        />
    `,
})
export class ApproveReportStatesPageComponent {
    protected readonly facade = inject(ApproveReportStatesFacade);
    private readonly store = inject(ApproveReportStatesFilterStore);
    private readonly permissions = inject(PermissionActionsService);
    private readonly notification = inject(NOTIFICATION_PORT);
    private readonly i18n = inject(TranslocoService);
    private readonly excelExport = inject(EXCEL_EXPORT_PORT);

    protected readonly ns = T;
    protected readonly filterModel = this.store.model;
    protected readonly tableColumns = APPROVE_REPORT_STATES_TABLE.cols;
    protected readonly tableActions = APPROVE_REPORT_STATES_TABLE.actions;

    /** Tranche B — branchement `ReportStatesDetailsDialogComponent`. */
    protected readonly detailsDialogVisible = signal(false);
    protected readonly selectedUniqId = signal<string | null>(null);
    protected readonly exporting = signal(false);

    private readonly canTake = this.permissions.can(
        REPORT_STATES_APPROVE_ROUTE,
        'take'
    );
    private readonly canExport = this.permissions.can(
        REPORT_STATES_APPROVE_ROUTE,
        'export'
    );

    private readonly presenter = new ApproveReportStatesPresenter((key) =>
        this.i18n.translate(key)
    );

    protected readonly itemsVM = computed<ApproveReportStatesVmProps[]>(() =>
        this.facade
            .items()
            .map((item) =>
                this.presenter.map(item, { canTake: this.canTake() })
            )
    );

    protected readonly indexOffset = computed(() => {
        const page = this.facade.value();
        return page ? (page.currentPage - 1) * page.perPage : 0;
    });

    protected readonly exportTooltip = computed(() =>
        reportStatesListExportTooltip(
            (key) => this.t(key),
            T,
            this.canExport(),
            this.facade.total()
        )
    );

    protected readonly exportDisabled = computed(() =>
        reportStatesListExportDisabled(
            this.canExport(),
            this.facade.total(),
            this.facade.isLoading(),
            this.exporting()
        )
    );

    protected readonly filterFields: Signal<FilterField[]> = computed(() => [
        {
            type: 'text',
            name: APPROVE_REPORT_STATES_FILTER_KEYS.INITIATOR_PHONE_NUMBER,
            label: `${T}.FILTER.INITIATOR`,
            placeholder: 'COMMON.PHONE_PLACEHOLDER',
        },
        {
            type: 'text',
            name: APPROVE_REPORT_STATES_FILTER_KEYS.UNIQ_ID,
            label: `${T}.FILTER.UNIQ_ID`,
            placeholder: 'COMMON.REPORT_UNIQ_ID_PLACEHOLDER',
        },
        {
            type: 'select',
            name: APPROVE_REPORT_STATES_FILTER_KEYS.REPORT_TYPE,
            label: `${T}.FILTER.REPORT_TYPE`,
            placeholder: 'COMMON.SELECT_PLACEHOLDER',
            options: REPORT_TYPE_OPTIONS,
        },
        {
            type: 'text',
            name: APPROVE_REPORT_STATES_FILTER_KEYS.OPERATORS,
            label: `${T}.FILTER.OPERATORS`,
            placeholder: 'COMMON.SELECT_PLACEHOLDER',
        },
        {
            type: 'select',
            name: APPROVE_REPORT_STATES_FILTER_KEYS.SOURCE,
            label: `${T}.FILTER.SOURCE`,
            placeholder: 'COMMON.SELECT_PLACEHOLDER',
            options: REPORT_SOURCE_OPTIONS,
        },
        {
            type: 'date',
            name: APPROVE_REPORT_STATES_FILTER_KEYS.START_DATE,
            label: 'COMMON.START_DATE',
        },
        {
            type: 'date',
            name: APPROVE_REPORT_STATES_FILTER_KEYS.END_DATE,
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
        void exportReportStatesList({
            excelExport: this.excelExport,
            notification: this.notification,
            translate: (key) => this.t(key),
            ns: T,
            volet: 'approve',
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
                return entities.map((item) =>
                    this.presenter.map(item, { canTake: this.canTake() })
                );
            },
        }).finally(() => this.exporting.set(false));
    }

    protected onChangePage(page: number): void {
        this.facade.changePage(String(page));
    }

    protected onAction(event: {
        row: ApproveReportStatesVmProps;
        actionId: string;
    }): void {
        if (event.actionId === 'take' && !this.canTake()) {
            this.notification.error(this.t(`${T}.TOOLTIP.NO_PERMISSION_TAKE`));
            return;
        }
        this.selectedUniqId.set(event.row.uniqId);
        this.detailsDialogVisible.set(true);
    }

    protected onDetailsDialogClosed(): void {
        this.detailsDialogVisible.set(false);
        this.selectedUniqId.set(null);
    }

    protected onDetailsActionCompleted(): void {
        this.facade.reload();
    }
}
