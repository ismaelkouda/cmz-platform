import {
    ChangeDetectionStrategy,
    Component,
    Signal,
    computed,
    inject,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SiteGroupFacade } from '@cmz/coverage-areas-application';
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
import { SITE_GROUP_FILTER_KEYS } from '../constants/site-group-filter-keys.constant';
import { STATUS_LABEL } from '../constants/site-group-status-label.constant';
import { SITE_GROUP_FORM } from '../constants/site-group-paths.constant';
import { SITE_GROUP_TABLE } from '../constants/site-group-table.constant';
import { SiteGroupVmProps } from '../adapters/site-group-vm-props.interface';
import { SiteGroupPresenter } from '../adapters/site-group-vm.presenter';
import { SiteGroupFilterStore } from '../stores/site-group-filter.store';

const ROUTE = '/coverage-areas/site-groups';
const T = 'COVERAGE_AREAS.SITE_GROUP';

/**
 * Liste `site-group` — **tranche verticale Angular 22** : compose
 * `cmz-filter` (Signal Forms) + `cmz-table` + `cmz-pagination` sur la façade
 * `rxResource` (signaux `items`/`isLoading`/`value`). Permissions via
 * `PermissionActionsService`, confirmations via `ConfirmDialogPort`, i18n via
 * `TranslationPort` — aucune dépendance ngx-translate/toastr/primeng.
 */
@Component({
    selector: 'cmz-site-group-list',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FilterComponent, TableComponent, PaginationComponent],
    providers: [SiteGroupFilterStore],
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
export class SiteGroupListComponent {
    protected readonly facade = inject(SiteGroupFacade);
    private readonly store = inject(SiteGroupFilterStore);
    private readonly permissions = inject(PermissionActionsService);
    private readonly confirm = inject(ConfirmDialogPort);
    private readonly notification = inject(NotificationPort);
    private readonly i18n = inject(TranslationPort);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    protected readonly ns = T;
    protected readonly filterModel = this.store.model;
    protected readonly tableColumns = SITE_GROUP_TABLE.cols;

    protected readonly canCreate = this.permissions.can(ROUTE, 'create');
    private readonly canEdit = this.permissions.can(ROUTE, 'edit');
    private readonly canDelete = this.permissions.can(ROUTE, 'delete');
    private readonly canEnable = this.permissions.can(ROUTE, 'edit');
    private readonly canDisable = this.permissions.can(ROUTE, 'edit');
    private readonly canChoose = computed(
        () =>
            (this.canEdit() && this.canDelete()) ||
            this.canEnable() ||
            this.canDisable()
    );

    protected readonly createTooltip = computed(() =>
        this.canCreate()
            ? this.t(T + '.TOOLTIP.CREATE')
            : this.t(T + '.TOOLTIP.NO_PERMISSION_CREATE')
    );

    private readonly presenter = new SiteGroupPresenter((k) =>
        this.i18n.translate(k)
    );

    protected readonly itemsVM = computed<SiteGroupVmProps[]>(() => {
        const authorization = {
            canEdit: this.canEdit(),
            canDelete: this.canDelete(),
            canEnable: this.canEnable(),
            canDisable: this.canDisable(),
            canChoose: this.canChoose(),
        };
        const tooltip = {
            edit: this.t(T + '.TOOLTIP.NO_PERMISSION_EDIT'),
            delete: this.t(T + '.TOOLTIP.NO_PERMISSION_DELETE'),
            enable: this.t(T + '.TOOLTIP.NO_PERMISSION_ACTIVE'),
            disable: this.t(T + '.TOOLTIP.NO_PERMISSION_DISABLE'),
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
            name: SITE_GROUP_FILTER_KEYS.SEARCH,
            label: T + '.FILTER.SEARCH',
            placeholder: T + '.FILTER.SEARCH_PLACEHOLDER',
        },
        {
            type: 'select',
            name: SITE_GROUP_FILTER_KEYS.STATUS,
            label: T + '.FILTER.STATUS',
            placeholder: 'COMMON.SELECT_PLACEHOLDER',
            options: labelsToFilterOptions(STATUS_LABEL, (k) =>
                this.i18n.translate(k)
            ),
        },
        {
            type: 'date',
            name: SITE_GROUP_FILTER_KEYS.START_DATE,
            label: T + '.FILTER.DATE.FROM',
        },
        {
            type: 'date',
            name: SITE_GROUP_FILTER_KEYS.END_DATE,
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
        row: SiteGroupVmProps;
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
                void this.confirmThen(row, 'ENABLE', () =>
                    this.facade.enable({ uniqId: row.uniqId })
                );
                break;
            case 'disable':
                void this.confirmThen(row, 'DISABLE', () =>
                    this.facade.disable({ uniqId: row.uniqId })
                );
                break;
        }
    }

    private async confirmThen(
        row: SiteGroupVmProps,
        action: 'DELETE' | 'ENABLE' | 'DISABLE',
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
        void this.router.navigate(['../', SITE_GROUP_FORM], {
            relativeTo: this.route,
            queryParams: uniqId ? { uniqId, ref } : { ref },
        });
    }
}
