import { Component, Signal, computed, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RadioRelayLinksFacade } from '@cmz/coverage-areas-application';
import { RadioRelayLinksOperator } from '@cmz/coverage-areas-domain';
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
import { RADIO_RELAY_LINKS_FILTER_KEYS } from '../constants/radio-relay-links-filter-keys.constant';
import { RADIO_RELAY_LINKS_FORM } from '../constants/radio-relay-links-paths.constant';
import { RADIO_RELAY_LINKS_TABLE } from '../constants/radio-relay-links-table.constant';
import { RadioRelayLinksVmProps } from '../adapters/radio-relay-links-vm-props.interface';
import { RadioRelayLinksPresenter } from '../adapters/radio-relay-links-vm.presenter';
import { RadioRelayLinksFilterStore } from '../stores/radio-relay-links-filter.store';

const ROUTE = '/coverage-areas/radio-relay-links';
const T = 'COVERAGE_AREAS.RADIO_RELAY_LINKS';

/**
 * Liste `radio-relay-links` — même tranche verticale que
 * `MobileNetworkListComponent` (`cmz-filter` + `cmz-table` +
 * `cmz-pagination` sur `rxResource`).
 */
@Component({
    selector: 'cmz-radio-relay-links-list',
    imports: [FilterComponent, TableComponent, PaginationComponent],
    providers: [RadioRelayLinksFilterStore],
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
export class RadioRelayLinksListComponent {
    protected readonly facade = inject(RadioRelayLinksFacade);
    private readonly store = inject(RadioRelayLinksFilterStore);
    private readonly permissions = inject(PermissionActionsService);
    private readonly confirm = inject(CONFIRM_DIALOG_PORT);
    private readonly notification = inject(NotificationPort);
    private readonly i18n = inject(TranslationPort);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    protected readonly ns = T;
    protected readonly filterModel = this.store.model;
    protected readonly tableColumns = RADIO_RELAY_LINKS_TABLE.cols;

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

    private readonly presenter = new RadioRelayLinksPresenter((k) =>
        this.i18n.translate(k)
    );

    protected readonly itemsVM = computed<RadioRelayLinksVmProps[]>(() => {
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
            name: RADIO_RELAY_LINKS_FILTER_KEYS.SEARCH,
            label: T + '.FILTER.SEARCH',
            placeholder: T + '.FILTER.SEARCH_PLACEHOLDER',
        },
        {
            type: 'select',
            name: RADIO_RELAY_LINKS_FILTER_KEYS.OPERATOR,
            label: T + '.FILTER.OPERATOR',
            placeholder: 'COMMON.SELECT_PLACEHOLDER',
            options: Object.values(RadioRelayLinksOperator).map((v) => ({
                label: v,
                value: v,
            })),
        },
        {
            type: 'date',
            name: RADIO_RELAY_LINKS_FILTER_KEYS.START_DATE,
            label: T + '.FILTER.DATE.FROM',
        },
        {
            type: 'date',
            name: RADIO_RELAY_LINKS_FILTER_KEYS.END_DATE,
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
        row: RadioRelayLinksVmProps;
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
        row: RadioRelayLinksVmProps,
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
        void this.router.navigate(['../', RADIO_RELAY_LINKS_FORM], {
            relativeTo: this.route,
            queryParams: uniqId ? { uniqId, ref } : { ref },
        });
    }
}
