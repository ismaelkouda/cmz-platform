import { Component, Signal, computed, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
    InfrastructureFacade,
    InfrastructureTypeSelectFacade,
} from '@cmz/administrative-infrastructure-application';
import {
    PermissionActionsService,
    TranslationPort,
    NOTIFICATION_PORT,
} from '@cmz/shared-application';
import {
    FilterComponent,
    FilterField,
    PaginationComponent,
    TableComponent,
    CONFIRM_DIALOG_PORT,
} from '@cmz/shared-ui';
import { INFRASTRUCTURE_FILTER_KEYS } from '../constants/infrastructure-filter-keys.constant';
import { INFRASTRUCTURE_FORM } from '../constants/infrastructure-paths.constant';
import { INFRASTRUCTURE_TABLE } from '../constants/infrastructure-table.constant';
import { InfrastructureVmProps } from '../adapters/infrastructure-vm-props.interface';
import { InfrastructurePresenter } from '../adapters/infrastructure-vm.presenter';
import { InfrastructureFilterStore } from '../stores/infrastructure-filter.store';

const ROUTE = '/equipments/list';
const T = 'ADMINISTRATIVE_INFRASTRUCTURE.INFRASTRUCTURE';

/**
 * Liste `infrastructure` — tranche verticale Angular 22 (symétrique à
 * `infrastructure-type`, sans statut/enable/disable). Filtre : recherche, type
 * (select via `InfrastructureTypeSelectFacade`), region/dept/commune (texte),
 * dates. `rxResource` + `cmz-*`.
 */
@Component({
    selector: 'cmz-infrastructure-list',
    imports: [FilterComponent, TableComponent, PaginationComponent],
    providers: [InfrastructureFilterStore],
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
export class InfrastructureListComponent {
    protected readonly facade = inject(InfrastructureFacade);
    private readonly typeSelect = inject(InfrastructureTypeSelectFacade);
    private readonly store = inject(InfrastructureFilterStore);
    private readonly permissions = inject(PermissionActionsService);
    private readonly confirm = inject(CONFIRM_DIALOG_PORT);
    private readonly notification = inject(NOTIFICATION_PORT);
    private readonly i18n = inject(TranslationPort);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    protected readonly ns = T;
    protected readonly filterModel = this.store.model;
    protected readonly tableColumns = INFRASTRUCTURE_TABLE.cols;

    protected readonly canCreate = this.permissions.can(ROUTE, 'create');
    private readonly canEdit = this.permissions.can(ROUTE, 'edit');
    private readonly canDelete = this.permissions.can(ROUTE, 'delete');
    private readonly canChoose = computed(
        () => this.canEdit() && this.canDelete()
    );

    private readonly presenter = new InfrastructurePresenter((k) =>
        this.i18n.translate(k)
    );

    protected readonly itemsVM = computed<InfrastructureVmProps[]>(() => {
        const authorization = {
            canEdit: this.canEdit(),
            canDelete: this.canDelete(),
            canChoose: this.canChoose(),
        };
        const tooltip = {
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
            name: INFRASTRUCTURE_FILTER_KEYS.SEARCH,
            label: T + '.FILTER.SEARCH',
            placeholder: T + '.FILTER.SEARCH_PLACEHOLDER',
        },
        {
            type: 'select',
            name: INFRASTRUCTURE_FILTER_KEYS.TYPE,
            label: T + '.FILTER.TYPE',
            placeholder: 'COMMON.SELECT_PLACEHOLDER',
            options: this.typeSelect.options(),
        },
        {
            type: 'text',
            name: INFRASTRUCTURE_FILTER_KEYS.REGION,
            label: T + '.FILTER.REGION',
        },
        {
            type: 'text',
            name: INFRASTRUCTURE_FILTER_KEYS.DEPARTMENT,
            label: T + '.FILTER.DEPARTMENT',
        },
        {
            type: 'text',
            name: INFRASTRUCTURE_FILTER_KEYS.MUNICIPALITY,
            label: T + '.FILTER.MUNICIPALITY',
        },
        {
            type: 'date',
            name: INFRASTRUCTURE_FILTER_KEYS.START_DATE,
            label: T + '.FILTER.DATE.FROM',
        },
        {
            type: 'date',
            name: INFRASTRUCTURE_FILTER_KEYS.END_DATE,
            label: T + '.FILTER.DATE.TO',
        },
    ]);

    constructor() {
        this.facade.load(this.store.toContract());
        this.typeSelect.load();
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
            this.notification.error(
                this.t(T + '.TOOLTIP.NO_PERMISSION_CREATE')
            );
            return;
        }
        this.navigateToForm(undefined, 'create');
    }

    protected onAction(event: {
        row: InfrastructureVmProps;
        actionId: string;
    }): void {
        const { row, actionId } = event;
        if (actionId === 'edit') {
            this.navigateToForm(row.uniqId, 'edit');
        } else if (actionId === 'delete') {
            void this.confirmDelete(row);
        }
    }

    private async confirmDelete(row: InfrastructureVmProps): Promise<void> {
        const confirmed = await this.confirm.confirm(
            this.i18n.translate(`${T}.SWEET_ALERT.MESSAGE.DELETE`, {
                uniqId: row.actionsRef,
            }),
            { title: this.t(`${T}.SWEET_ALERT.TITLE.DELETE`) }
        );
        if (confirmed) {
            this.facade.delete({ uniqId: row.uniqId });
        }
    }

    private navigateToForm(
        uniqId: string | undefined,
        ref: 'create' | 'edit'
    ): void {
        void this.router.navigate(['../', INFRASTRUCTURE_FORM], {
            relativeTo: this.route,
            queryParams: uniqId ? { uniqId, ref } : { ref },
        });
    }
}
