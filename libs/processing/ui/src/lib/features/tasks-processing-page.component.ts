import { Component, Signal, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { TasksProcessingFacade } from '@cmz/processing-application';
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
import { TasksProcessingVmProps } from '../adapters/tasks-processing-vm-props.interface';
import { TasksProcessingPresenter } from '../adapters/tasks-processing-vm.presenter';
import { PROCESSING_TASKS_ROUTE } from '../constants/processing-paths.constant';
import { TASKS_PROCESSING_FILTER_KEYS } from '../constants/tasks-processing-filter-keys.constant';
import { TASKS_PROCESSING_TABLE } from '../constants/tasks-processing-table.constant';
import { TasksProcessingFilterStore } from '../stores/tasks-processing-filter.store';
import {
    exportProcessingList,
    processingListExportDisabled,
    processingListExportTooltip,
} from '../utils/processing-list-export.util';

const T = 'PROCESSING.TASKS';

@Component({
    selector: 'cmz-tasks-processing-page',
    imports: [FilterComponent, TableComponent, PaginationComponent],
    providers: [TasksProcessingFilterStore],
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
export class TasksProcessingPageComponent {
    protected readonly facade = inject(TasksProcessingFacade);
    private readonly store = inject(TasksProcessingFilterStore);
    private readonly permissions = inject(PermissionActionsService);
    private readonly notification = inject(NotificationPort);
    private readonly i18n = inject(TranslationPort);
    private readonly excelExport = inject(EXCEL_EXPORT_PORT);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    protected readonly ns = T;
    protected readonly filterModel = this.store.model;
    protected readonly tableColumns = TASKS_PROCESSING_TABLE.cols;
    protected readonly tableActions = TASKS_PROCESSING_TABLE.actions;

    protected readonly exporting = signal(false);

    private readonly canTreat = this.permissions.can(
        PROCESSING_TASKS_ROUTE,
        'execute'
    );
    private readonly canExport = this.permissions.can(
        PROCESSING_TASKS_ROUTE,
        'export'
    );

    private readonly presenter = new TasksProcessingPresenter((key) =>
        this.i18n.translate(key)
    );

    protected readonly itemsVM = computed<TasksProcessingVmProps[]>(() =>
        this.facade
            .items()
            .map((item) =>
                this.presenter.map(item, { canTreat: this.canTreat() })
            )
    );

    protected readonly indexOffset = computed(() => {
        const page = this.facade.value();
        return page ? (page.currentPage - 1) * page.perPage : 0;
    });

    protected readonly exportTooltip = computed(() =>
        processingListExportTooltip(
            (key) => this.t(key),
            T,
            this.canExport(),
            this.facade.total()
        )
    );

    protected readonly exportDisabled = computed(() =>
        processingListExportDisabled(
            this.canExport(),
            this.facade.total(),
            this.facade.isLoading(),
            this.exporting()
        )
    );

    protected readonly filterFields: Signal<FilterField[]> = computed(() => [
        {
            type: 'text',
            name: TASKS_PROCESSING_FILTER_KEYS.INITIATOR_PHONE_NUMBER,
            label: `${T}.FILTER.INITIATOR`,
            placeholder: 'COMMON.PHONE_PLACEHOLDER',
        },
        {
            type: 'text',
            name: TASKS_PROCESSING_FILTER_KEYS.UNIQ_ID,
            label: `${T}.FILTER.UNIQ_ID`,
            placeholder: 'COMMON.REPORT_UNIQ_ID_PLACEHOLDER',
        },
        {
            type: 'select',
            name: TASKS_PROCESSING_FILTER_KEYS.REPORT_TYPE,
            label: `${T}.FILTER.REPORT_TYPE`,
            placeholder: 'COMMON.SELECT_PLACEHOLDER',
            options: REPORT_TYPE_OPTIONS,
        },
        {
            type: 'text',
            name: TASKS_PROCESSING_FILTER_KEYS.OPERATORS,
            label: `${T}.FILTER.OPERATORS`,
            placeholder: 'COMMON.SELECT_PLACEHOLDER',
        },
        {
            type: 'select',
            name: TASKS_PROCESSING_FILTER_KEYS.SOURCE,
            label: `${T}.FILTER.SOURCE`,
            placeholder: 'COMMON.SELECT_PLACEHOLDER',
            options: REPORT_SOURCE_OPTIONS,
        },
        {
            type: 'date',
            name: TASKS_PROCESSING_FILTER_KEYS.START_DATE,
            label: 'COMMON.START_DATE',
        },
        {
            type: 'date',
            name: TASKS_PROCESSING_FILTER_KEYS.END_DATE,
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
        void exportProcessingList({
            excelExport: this.excelExport,
            notification: this.notification,
            translate: (key) => this.t(key),
            ns: T,
            volet: 'tasks',
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
                    this.presenter.map(item, { canTreat: this.canTreat() })
                );
            },
        }).finally(() => this.exporting.set(false));
    }

    protected onChangePage(page: number): void {
        this.facade.changePage(String(page));
    }

    protected onAction(event: {
        row: TasksProcessingVmProps;
        actionId: string;
    }): void {
        if (event.actionId !== 'treat') {
            return;
        }
        if (!this.canTreat()) {
            this.notification.error(this.t(`${T}.TOOLTIP.NO_PERMISSION_TREAT`));
            return;
        }
        const item = this.facade
            .items()
            .find((row) => row.uniqId === event.row.uniqId);
        if (!item) {
            return;
        }
        void this.router.navigate(['actions'], {
            relativeTo: this.route.parent ?? this.route,
            queryParams: {
                uniqId: item.uniqId,
                reportType: event.row.reportTypeLabel,
                operators: item.operators.join(','),
                createdAt: item.reportedAt,
                source: event.row.sourceLabel,
                initiatorPhone: item.initiatorPhoneNumber,
            },
        });
    }
}
