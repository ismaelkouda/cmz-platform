import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    inject,
    signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import {
    ProcessingDetailsFacade,
    TasksActionsProcessingFacade,
} from '@cmz/processing-application';
import {
    ProcessingDetailsState,
    TasksActionsProcessingEntity,
} from '@cmz/processing-domain';
import {
    ConfirmDialogPort,
    NotificationPort,
    PermissionActionsService,
    TranslationPort,
} from '@cmz/shared-application';
import { PaginationComponent, TableComponent } from '@cmz/shared-ui';
import { map } from 'rxjs';
import { TasksActionsProcessingPresenter } from '../adapters/tasks-actions-processing-vm.presenter';
import { TasksActionsProcessingVmProps } from '../adapters/tasks-actions-processing-vm-props.interface';
import { PROCESSING_TASKS_ROUTE } from '../constants/processing-paths.constant';
import { TASKS_ACTIONS_PROCESSING_TABLE } from '../constants/tasks-actions-processing-table.constant';
import {
    TasksActionsDialogMode,
    TasksActionsProcessingFormDialogComponent,
} from './tasks-actions-processing-form-dialog.component';

const T = 'PROCESSING.TASKS.ACTIONS';

@Component({
    selector: 'cmz-tasks-actions-processing-page',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        TableComponent,
        PaginationComponent,
        TasksActionsProcessingFormDialogComponent,
    ],
    template: `
        <section class="flex flex-col gap-4">
            <header class="flex flex-col gap-2">
                <div class="flex items-center justify-between">
                    <h1 class="text-lg font-semibold text-text">
                        {{ t(ns + '.TITLE') }}
                    </h1>
                    <div class="flex gap-2">
                        <button
                            type="button"
                            class="rounded border border-border px-3 py-2 text-sm hover:bg-surface-hover"
                            (click)="onBack()"
                        >
                            {{ t('COMMON.BACK') }}
                        </button>
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
                            [disabled]="!canMutate()"
                            (click)="onCreate()"
                        >
                            {{ t('COMMON.CREATE') }}
                        </button>
                        <button
                            type="button"
                            class="rounded border border-border px-3 py-2 text-sm hover:bg-surface-hover disabled:opacity-50"
                            [disabled]="!canMutate()"
                            (click)="onCloseReport()"
                        >
                            {{ t('PROCESSING.TASKS.TABLE.CLOSURE') }}
                        </button>
                    </div>
                </div>

                @if (reportUniqId(); as id) {
                    <p class="text-sm text-muted">
                        {{ t('COMMON.REPORT') }}: {{ id }}
                        @if (reportContext().reportType) {
                            — {{ reportContext().reportType }}
                        }
                    </p>
                }
            </header>

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

        <cmz-tasks-actions-processing-form-dialog
            [visible]="dialogVisible()"
            [mode]="dialogMode()"
            [reportUniqId]="reportUniqId() ?? ''"
            [editingItem]="editingItem()"
            (closed)="onDialogClosed()"
        />
    `,
})
export class TasksActionsProcessingPageComponent {
    protected readonly facade = inject(TasksActionsProcessingFacade);
    private readonly detailsFacade = inject(ProcessingDetailsFacade);
    private readonly permissions = inject(PermissionActionsService);
    private readonly confirm = inject(ConfirmDialogPort);
    private readonly notification = inject(NotificationPort);
    private readonly i18n = inject(TranslationPort);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    protected readonly ns = T;
    protected readonly tableColumns = TASKS_ACTIONS_PROCESSING_TABLE.cols;
    protected readonly tableActions = TASKS_ACTIONS_PROCESSING_TABLE.actions;

    private readonly queryParams = toSignal(
        this.route.queryParamMap.pipe(
            map((params) => ({
                uniqId: params.get('uniqId') ?? '',
                reportType: params.get('reportType') ?? '',
                operators: params.get('operators') ?? '',
                createdAt: params.get('createdAt') ?? '',
                source: params.get('source') ?? '',
                initiatorPhone: params.get('initiatorPhone') ?? '',
            }))
        ),
        {
            initialValue: {
                uniqId: '',
                reportType: '',
                operators: '',
                createdAt: '',
                source: '',
                initiatorPhone: '',
            },
        }
    );

    protected readonly reportContext = computed(
        () =>
            this.queryParams() ?? {
                uniqId: '',
                reportType: '',
                operators: '',
                createdAt: '',
                source: '',
                initiatorPhone: '',
            }
    );

    protected readonly reportUniqId = computed(
        () => this.reportContext().uniqId || null
    );

    private readonly canTreat = this.permissions.can(
        PROCESSING_TASKS_ROUTE,
        'execute'
    );

    protected readonly isOpenForTreatment = computed(() => {
        const details = this.detailsFacade.value();
        return details?.state === ProcessingDetailsState.IN_PROGRESS;
    });

    protected readonly canMutate = computed(
        () => this.canTreat() && this.isOpenForTreatment()
    );

    protected readonly dialogVisible = signal(false);
    protected readonly dialogMode = signal<TasksActionsDialogMode>('create');
    protected readonly editingItem =
        signal<TasksActionsProcessingEntity | null>(null);

    private readonly presenter = new TasksActionsProcessingPresenter((key) =>
        this.i18n.translate(key)
    );

    protected readonly itemsVM = computed<TasksActionsProcessingVmProps[]>(
        () => {
            const tooltip = {
                edit: this.t(`${T}.TOOLTIP.NOT_EDIT`),
                delete: this.t(`${T}.TOOLTIP.NOT_DELETE`),
            };
            return this.facade.items().map((item) =>
                this.presenter.map(item, {
                    canTreat: this.canTreat(),
                    isOpenForTreatment: this.isOpenForTreatment(),
                    tooltip,
                })
            );
        }
    );

    protected readonly indexOffset = computed(() => {
        const page = this.facade.value();
        return page ? (page.currentPage - 1) * page.perPage : 0;
    });

    constructor() {
        effect(() => {
            const id = this.reportUniqId();
            if (id) {
                this.facade.load({ reportUniqId: id });
                this.detailsFacade.loadDetails(id);
            }
        });
    }

    protected t(key: string): string {
        return this.i18n.translate(key);
    }

    protected onRefresh(): void {
        this.facade.reload();
        const id = this.reportUniqId();
        if (id) {
            this.detailsFacade.loadDetails(id, { forceRefresh: true });
        }
    }

    protected onChangePage(page: number): void {
        this.facade.changePage(String(page));
    }

    protected onBack(): void {
        void this.router.navigate(['..'], { relativeTo: this.route });
    }

    protected onCreate(): void {
        if (!this.canMutate()) {
            this.notification.error(
                this.t(`${T}.TOOLTIP.NO_PERMISSION_CREATE`)
            );
            return;
        }
        this.editingItem.set(null);
        this.dialogMode.set('create');
        this.dialogVisible.set(true);
    }

    protected onAction(event: {
        row: TasksActionsProcessingVmProps;
        actionId: string;
    }): void {
        const entity = this.facade
            .items()
            .find((item) => item.uniqId === event.row.uniqId);
        if (!entity) {
            return;
        }

        if (event.actionId === 'view') {
            this.editingItem.set(entity);
            this.dialogMode.set('view');
            this.dialogVisible.set(true);
            return;
        }

        if (event.actionId === 'edit') {
            if (!this.canMutate() || entity.shouldNotifyUser) {
                this.notification.error(this.t(`${T}.TOOLTIP.NOT_EDIT`));
                return;
            }
            this.editingItem.set(entity);
            this.dialogMode.set('edit');
            this.dialogVisible.set(true);
            return;
        }

        if (event.actionId === 'delete') {
            if (!this.canMutate() || entity.shouldNotifyUser) {
                this.notification.error(this.t(`${T}.TOOLTIP.NOT_DELETE`));
                return;
            }
            void this.confirmDelete(entity.uniqId);
        }
    }

    protected onDialogClosed(): void {
        this.dialogVisible.set(false);
        this.editingItem.set(null);
    }

    protected async onCloseReport(): Promise<void> {
        const id = this.reportUniqId();
        if (!id) {
            return;
        }
        if (!this.canMutate()) {
            this.notification.error(this.t(`${T}.TOOLTIP.NO_PERMISSION_CLOSE`));
            return;
        }
        const confirmed = await this.confirm.confirm(
            this.t(`${T}.SWEET_ALERT.MESSAGE.CLOSE`),
            { title: this.t(`${T}.SWEET_ALERT.TITLE.CLOSE`) }
        );
        if (!confirmed) {
            return;
        }
        this.detailsFacade.treat({ uniqId: id });
        void this.router.navigate(['..'], { relativeTo: this.route });
    }

    private async confirmDelete(uniqId: string): Promise<void> {
        const confirmed = await this.confirm.confirm(
            this.t(`${T}.SWEET_ALERT.MESSAGE.DELETE`),
            { title: this.t(`${T}.SWEET_ALERT.TITLE.DELETE`) }
        );
        if (confirmed) {
            this.facade.delete({ uniqId });
        }
    }
}
