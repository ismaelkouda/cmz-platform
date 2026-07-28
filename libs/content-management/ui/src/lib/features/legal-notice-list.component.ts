import {
    ChangeDetectionStrategy,
    Component,
    Signal,
    computed,
    inject,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LegalNoticeFacade } from '@cmz/content-management-application';
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
import { LEGAL_NOTICE_TABLE } from '../constants/legal-notice-table.constant';
import { LEGAL_NOTICE_FORM } from '../constants/legal-notice-paths.constant';
import { LEGAL_NOTICE_FILTER_KEYS } from '../constants/legal-notice-filter-keys.constant';
import { LEGAL_NOTICE_STATUS_LABEL } from '../constants/legal-notice-status-label.constant';
import { LegalNoticeVmProps } from '../adapters/legal-notice-vm-props.interface';
import { LegalNoticePresenter } from '../adapters/legal-notice-vm.presenter';
import { LegalNoticeFilterStore } from '../stores/legal-notice-filter.store';

const ROUTE = '/content-management/legal-notice';
const T = 'CONTENT_MANAGEMENT.LEGAL_NOTICE';

@Component({
    selector: 'cmz-legal-notice-list',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FilterComponent, TableComponent, PaginationComponent],
    providers: [LegalNoticeFilterStore],
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
export class LegalNoticeListComponent {
    protected readonly facade = inject(LegalNoticeFacade);
    private readonly store = inject(LegalNoticeFilterStore);
    private readonly permissions = inject(PermissionActionsService);
    private readonly confirm = inject(ConfirmDialogPort);
    private readonly notification = inject(NotificationPort);
    private readonly i18n = inject(TranslationPort);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    protected readonly ns = T;
    protected readonly filterModel = this.store.model;
    protected readonly tableColumns = LEGAL_NOTICE_TABLE.cols;

    protected readonly canCreate = this.permissions.can(ROUTE, 'create');
    private readonly canEdit = this.permissions.can(ROUTE, 'edit');
    private readonly canDelete = this.permissions.can(ROUTE, 'delete');
    private readonly canPublish = this.permissions.can(ROUTE, 'edit');
    private readonly canUnpublish = this.permissions.can(ROUTE, 'edit');
    private readonly canChoose = computed(
        () =>
            (this.canEdit() && this.canDelete()) ||
            this.canPublish() ||
            this.canUnpublish()
    );

    protected readonly createTooltip = computed(() =>
        this.canCreate()
            ? this.t(T + '.TOOLTIP.CREATE')
            : this.t(T + '.TOOLTIP.NO_PERMISSION_CREATE')
    );

    private readonly presenter = new LegalNoticePresenter((k) =>
        this.i18n.translate(k)
    );

    protected readonly itemsVM = computed<LegalNoticeVmProps[]>(() => {
        const authorization = {
            canEdit: this.canEdit(),
            canDelete: this.canDelete(),
            canPublish: this.canPublish(),
            canUnpublish: this.canUnpublish(),
            canChoose: this.canChoose(),
        };
        const tooltip = {
            edit: this.t(T + '.TOOLTIP.NO_PERMISSION_EDIT'),
            delete: this.t(T + '.TOOLTIP.NO_PERMISSION_DELETE'),
            publish: this.t(T + '.TOOLTIP.NO_PERMISSION_PUBLISH'),
            unpublish: this.t(T + '.TOOLTIP.NO_PERMISSION_UNPUBLISH'),
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
            name: LEGAL_NOTICE_FILTER_KEYS.SEARCH,
            label: T + '.FILTER.SEARCH',
            placeholder: T + '.FILTER.SEARCH_PLACEHOLDER',
        },
        {
            type: 'text',
            name: LEGAL_NOTICE_FILTER_KEYS.VERSION,
            label: T + '.FILTER.VERSION',
        },
        {
            type: 'select',
            name: LEGAL_NOTICE_FILTER_KEYS.STATUS,
            label: T + '.FILTER.STATUS',
            placeholder: 'COMMON.SELECT_PLACEHOLDER',
            options: labelsToFilterOptions(LEGAL_NOTICE_STATUS_LABEL, (k) =>
                this.i18n.translate(k)
            ),
        },
        {
            type: 'date',
            name: LEGAL_NOTICE_FILTER_KEYS.START_DATE,
            label: T + '.FILTER.DATE.FROM',
        },
        {
            type: 'date',
            name: LEGAL_NOTICE_FILTER_KEYS.END_DATE,
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

    protected onAction(event: {
        row: LegalNoticeVmProps;
        actionId: string;
    }): void {
        const { row, actionId } = event;
        switch (actionId) {
            case 'edit':
                this.navigateToForm(row.uniqId, 'edit');
                break;
            case 'delete':
                void this.confirmThen(row, 'DELETE', () =>
                    this.facade.delete({ uniqId: row.uniqId })
                );
                break;
            case 'enable':
                void this.confirmThen(row, 'PUBLISH', () =>
                    this.facade.publish({ uniqId: row.uniqId })
                );
                break;
            case 'disable':
                void this.confirmThen(row, 'UNPUBLISH', () =>
                    this.facade.unpublish({ uniqId: row.uniqId })
                );
                break;
        }
    }

    private async confirmThen(
        row: LegalNoticeVmProps,
        action: 'DELETE' | 'PUBLISH' | 'UNPUBLISH',
        run: () => void
    ): Promise<void> {
        const confirmed = await this.confirm.confirm(
            this.i18n.translate(`${T}.SWEET_ALERT.MESSAGE.${action}`, {
                uniqId: row.actionsRef,
            }),
            { title: this.t(`${T}.SWEET_ALERT.TITLE.${action}`) }
        );
        if (confirmed) {
            run();
        }
    }

    private navigateToForm(
        uniqId: string | undefined,
        ref: 'create' | 'edit'
    ): void {
        void this.router.navigate(['../', LEGAL_NOTICE_FORM], {
            relativeTo: this.route,
            queryParams: uniqId ? { uniqId, ref } : { ref },
        });
    }
}
