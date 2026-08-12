import { firstValueFrom } from 'rxjs';
import { Component, Signal, computed, inject, signal } from '@angular/core';
import { DownloadReportStatesFacade } from '@cmz/report-states-application';
import { DownloadReportStatesStatus } from '@cmz/report-states-domain';
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
    EXCEL_EXPORT_PORT,
} from '@cmz/shared-ui';
import { DownloadReportStatesVmProps } from '../adapters/download-report-states-vm-props.interface';
import { DownloadReportStatesPresenter } from '../adapters/download-report-states-vm.presenter';
import { DOWNLOAD_REPORT_STATES_FILTER_KEYS } from '../constants/download-report-states-filter-keys.constant';
import { REPORT_STATES_DOWNLOAD_ROUTE } from '../constants/report-states-paths.constant';
import { DOWNLOAD_REPORT_STATES_TABLE } from '../constants/download-report-states-table.constant';
import { DownloadReportStatesFilterStore } from '../stores/download-report-states-filter.store';
import {
    exportReportStatesList,
    reportStatesListExportDisabled,
    reportStatesListExportTooltip,
} from '../utils/report-states-list-export.util';

const T = 'REPORT_STATES.DOWNLOAD';

const STATUS_OPTIONS = [
    {
        label: DownloadReportStatesStatus.PENDING,
        value: DownloadReportStatesStatus.PENDING,
    },
    {
        label: DownloadReportStatesStatus.PROCESSING,
        value: DownloadReportStatesStatus.PROCESSING,
    },
    {
        label: DownloadReportStatesStatus.DONE,
        value: DownloadReportStatesStatus.DONE,
    },
    {
        label: DownloadReportStatesStatus.FAILED,
        value: DownloadReportStatesStatus.FAILED,
    },
];

@Component({
    selector: 'cmz-download-report-states-page',
    imports: [FilterComponent, TableComponent, PaginationComponent],
    providers: [DownloadReportStatesFilterStore],
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
    `,
})
export class DownloadReportStatesPageComponent {
    protected readonly facade = inject(DownloadReportStatesFacade);
    private readonly store = inject(DownloadReportStatesFilterStore);
    private readonly permissions = inject(PermissionActionsService);
    private readonly notification = inject(NotificationPort);
    private readonly i18n = inject(TranslationPort);
    private readonly excelExport = inject(EXCEL_EXPORT_PORT);

    protected readonly ns = T;
    protected readonly filterModel = this.store.model;
    protected readonly tableColumns = DOWNLOAD_REPORT_STATES_TABLE.cols;
    protected readonly tableActions = DOWNLOAD_REPORT_STATES_TABLE.actions;
    protected readonly exporting = signal(false);

    private readonly canDownload = this.permissions.can(
        REPORT_STATES_DOWNLOAD_ROUTE,
        'download'
    );
    private readonly canExport = this.permissions.can(
        REPORT_STATES_DOWNLOAD_ROUTE,
        'export'
    );

    private readonly presenter = new DownloadReportStatesPresenter((key) =>
        this.i18n.translate(key)
    );

    protected readonly itemsVM = computed<DownloadReportStatesVmProps[]>(() =>
        this.facade.items().map((item) => this.presenter.map(item))
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
            name: DOWNLOAD_REPORT_STATES_FILTER_KEYS.SEARCH,
            label: `${T}.FILTER.SEARCH`,
            placeholder: `${T}.FILTER.SEARCH_PLACEHOLDER`,
        },
        {
            type: 'select',
            name: DOWNLOAD_REPORT_STATES_FILTER_KEYS.STATUS,
            label: 'CONTENT_MANAGEMENT.HOME.FILTER.STATUS',
            placeholder: 'COMMON.SELECT_PLACEHOLDER',
            options: STATUS_OPTIONS.map((opt) => ({
                label: this.t(opt.label),
                value: opt.value,
            })),
        },
        {
            type: 'date',
            name: DOWNLOAD_REPORT_STATES_FILTER_KEYS.DATE,
            label: `${T}.FILTER.DATE`,
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
            volet: 'download',
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
        row: DownloadReportStatesVmProps;
        actionId: string;
    }): void {
        if (event.actionId !== 'download') {
            return;
        }
        if (!this.canDownload()) {
            this.notification.error(
                this.t(`${T}.TOOLTIP.NO_PERMISSION_DOWNLOAD`)
            );
            return;
        }
        if (event.row.disableButtonDownload) {
            this.notification.error(event.row.tooltipButtonDownload);
            return;
        }
        window.open(event.row.url, '_blank');
    }
}
