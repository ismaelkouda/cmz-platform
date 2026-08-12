import { Component, Signal, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { DepartmentsByRegionIdFacade } from '@cmz/administrative-boundary-application';
import { TRANSLATION_PORT } from '@cmz/shared-application';
import {
    FilterComponent,
    FilterField,
    PaginationComponent,
    TableComponent,
} from '@cmz/shared-ui';
import { DEPARTMENTS_BY_REGION_ID_FILTER_KEYS } from '../constants/departments-by-region-id-filter-keys.constant';
import { DEPARTMENTS_BY_REGION_ID_TABLE } from '../constants/departments-by-region-id-table.constant';
import { DepartmentsByRegionIdVmProps } from '../adapters/departments-by-region-id-vm-props.interface';
import { DepartmentsByRegionIdPresenter } from '../adapters/departments-by-region-id-vm.presenter';
import { DepartmentsByRegionIdFilterStore } from '../stores/departments-by-region-id-filter.store';

const T = 'ADMINISTRATIVE_BOUNDARY.DEPARTMENTS_BY_REGION_ID';

/**
 * Vue imbriquée en lecture seule (drill-down depuis la liste `region`) : pas
 * de mutation, pas de bouton créer, pas de colonne d'actions. `regionId`
 * (scope) vient du query param `uniqId` de la route.
 */
@Component({
    selector: 'cmz-departments-by-region-id',
    imports: [FilterComponent, TableComponent, PaginationComponent],
    providers: [DepartmentsByRegionIdFilterStore],
    template: `
        <section class="flex flex-col gap-4">
            <header class="flex items-center justify-between">
                <h1 class="text-lg font-semibold text-text">
                    {{ t(ns + '.TITLE') }} — {{ regionName() }}
                </h1>
                <button
                    type="button"
                    class="rounded border border-border px-3 py-2 text-sm hover:bg-surface-hover"
                    (click)="onBack()"
                >
                    {{ t('COMMON.BACK') }}
                </button>
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
export class DepartmentsByRegionIdComponent {
    protected readonly facade = inject(DepartmentsByRegionIdFacade);
    private readonly store = inject(DepartmentsByRegionIdFilterStore);
    private readonly i18n = inject(TRANSLATION_PORT);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    protected readonly ns = T;
    protected readonly filterModel = this.store.model;
    protected readonly tableColumns = DEPARTMENTS_BY_REGION_ID_TABLE.cols;

    private readonly params = toSignal(this.route.queryParamMap);
    protected readonly regionId = computed(
        () => this.params()?.get('uniqId') ?? ''
    );
    protected readonly regionName = computed(
        () => this.params()?.get('name') ?? ''
    );

    private readonly presenter = new DepartmentsByRegionIdPresenter((k) =>
        this.i18n.translate(k)
    );

    protected readonly itemsVM = computed<DepartmentsByRegionIdVmProps[]>(() =>
        this.facade.items().map((item) => this.presenter.map(item))
    );

    protected readonly indexOffset = computed(() => {
        const page = this.facade.value();
        return page ? (page.currentPage - 1) * page.perPage : 0;
    });

    protected readonly filterFields: Signal<FilterField[]> = computed(() => [
        {
            type: 'text',
            name: DEPARTMENTS_BY_REGION_ID_FILTER_KEYS.SEARCH,
            label: T + '.FILTER.SEARCH',
            placeholder: T + '.FILTER.SEARCH_PLACEHOLDER',
        },
        {
            type: 'date',
            name: DEPARTMENTS_BY_REGION_ID_FILTER_KEYS.START_DATE,
            label: T + '.FILTER.DATE.FROM',
        },
        {
            type: 'date',
            name: DEPARTMENTS_BY_REGION_ID_FILTER_KEYS.END_DATE,
            label: T + '.FILTER.DATE.TO',
        },
    ]);

    constructor() {
        this.facade.load(this.store.toContract(this.regionId()));
    }

    protected t(key: string): string {
        return this.i18n.translate(key);
    }

    protected onApply(): void {
        this.facade.load(this.store.toContract(this.regionId()), '1', {
            forceRefresh: true,
        });
    }

    protected onClear(): void {
        this.store.reset();
        this.facade.load(this.store.toContract(this.regionId()), '1', {
            forceRefresh: true,
        });
    }

    protected onChangePage(page: number): void {
        this.facade.changePage(String(page));
    }

    protected onBack(): void {
        void this.router.navigate(['../../', 'list'], {
            relativeTo: this.route,
        });
    }
}
