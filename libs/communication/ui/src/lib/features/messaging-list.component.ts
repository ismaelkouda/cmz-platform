import {
    ChangeDetectionStrategy,
    Component,
    Signal,
    computed,
    inject,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessagingFacade } from '@cmz/communication-application';
import {
    ConfirmDialogPort,
    NotificationPort,
    PermissionActionsService,
    TranslationPort,
} from '@cmz/shared-application';
import {
    FilterComponent,
    FilterField,
    PaginationComponent,
    TableComponent,
    labelsToFilterOptions,
} from '@cmz/shared-ui';
import { MESSAGING_TABLE } from '../constants/messaging-table.constant';
import { MESSAGING_FORM } from '../constants/messaging-paths.constant';
import { MESSAGING_FILTER_KEYS } from '../constants/messaging-filter-keys.constant';
import { MESSAGING_TARGET_LABEL } from '../constants/messaging-target-label.constant';
import { MessagingVmProps } from '../adapters/messaging-vm-props.interface';
import { MessagingPresenter } from '../adapters/messaging-vm.presenter';
import { MessagingFilterStore } from '../stores/messaging-filter.store';
import { FormMode } from '../stores/form-mode.type';

const ROUTE = '/communication/messaging';
const T = 'COMMUNICATION.MESSAGING';

@Component({
    selector: 'cmz-messaging-list',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FilterComponent, TableComponent, PaginationComponent],
    providers: [MessagingFilterStore],
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
export class MessagingListComponent {
    protected readonly facade = inject(MessagingFacade);
    private readonly store = inject(MessagingFilterStore);
    private readonly permissions = inject(PermissionActionsService);
    private readonly confirm = inject(ConfirmDialogPort);
    private readonly notification = inject(NotificationPort);
    private readonly i18n = inject(TranslationPort);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    protected readonly ns = T;
    protected readonly filterModel = this.store.model;
    protected readonly tableColumns = MESSAGING_TABLE.cols;

    protected readonly canCreate = this.permissions.can(ROUTE, 'create');
    private readonly canView = this.permissions.can(ROUTE, 'view');
    private readonly canEdit = this.permissions.can(ROUTE, 'edit');
    private readonly canDelete = this.permissions.can(ROUTE, 'delete');
    private readonly canChoose = computed(
        () => this.canView() || this.canEdit() || this.canDelete()
    );

    protected readonly createTooltip = computed(() =>
        this.canCreate()
            ? this.t(T + '.TOOLTIP.CREATE')
            : this.t(T + '.TOOLTIP.NO_PERMISSION_CREATE')
    );

    private readonly presenter = new MessagingPresenter((k) =>
        this.i18n.translate(k)
    );

    protected readonly itemsVM = computed<MessagingVmProps[]>(() => {
        const authorization = {
            canView: this.canView(),
            canEdit: this.canEdit(),
            canDelete: this.canDelete(),
            canChoose: this.canChoose(),
        };
        const tooltip = {
            view: this.t(T + '.TOOLTIP.NO_PERMISSION_VIEW'),
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
            name: MESSAGING_FILTER_KEYS.SEARCH,
            label: T + '.FILTER.SEARCH',
            placeholder: T + '.FILTER.SEARCH_PLACEHOLDER',
        },
        {
            type: 'select',
            name: MESSAGING_FILTER_KEYS.TARGET_TYPE,
            label: T + '.FILTER.TARGET_TYPE',
            placeholder: 'COMMON.SELECT_PLACEHOLDER',
            options: labelsToFilterOptions(MESSAGING_TARGET_LABEL, (k) =>
                this.i18n.translate(k)
            ),
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

    protected onAction(event: {
        row: MessagingVmProps;
        actionId: string;
    }): void {
        const { row, actionId } = event;
        switch (actionId) {
            case 'view':
                this.navigateToForm(row.uniqId, 'details');
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
        row: MessagingVmProps,
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

    private navigateToForm(uniqId: string | undefined, ref: FormMode): void {
        void this.router.navigate(['../', MESSAGING_FORM], {
            relativeTo: this.route,
            queryParams: uniqId ? { uniqId, ref } : { ref },
        });
    }
}
