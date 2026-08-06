import { Component, Signal, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { MunicipalitiesByDepartmentIdFacade } from '@cmz/administrative-boundary-application';
import { TranslationPort } from '@cmz/shared-application';
import {
    FilterComponent,
    FilterField,
    PaginationComponent,
    TableComponent,
} from '@cmz/shared-ui';
import { MUNICIPALITIES_BY_DEPARTMENT_ID_FILTER_KEYS } from '../constants/municipalities-by-department-id-filter-keys.constant';
import { MUNICIPALITIES_BY_DEPARTMENT_ID_TABLE } from '../constants/municipalities-by-department-id-table.constant';
import { MunicipalitiesByDepartmentIdVmProps } from '../adapters/municipalities-by-department-id-vm-props.interface';
import { MunicipalitiesByDepartmentIdPresenter } from '../adapters/municipalities-by-department-id-vm.presenter';
import { MunicipalitiesByDepartmentIdFilterStore } from '../stores/municipalities-by-department-id-filter.store';

const T = 'ADMINISTRATIVE_BOUNDARY.MUNICIPALITIES_BY_DEPARTMENT_ID';

/**
 * Vue imbriquée en lecture seule (drill-down depuis la liste `department`).
 * `departmentId` (scope) vient du query param `uniqId` de la route.
 */
@Component({
    selector: 'cmz-municipalities-by-department-id',
    imports: [FilterComponent, TableComponent, PaginationComponent],
    providers: [MunicipalitiesByDepartmentIdFilterStore],
    template: `
        <section class="flex flex-col gap-4">
            <header class="flex items-center justify-between">
                <h1 class="text-lg font-semibold text-text">
                    {{ t(ns + '.TITLE') }} — {{ departmentName() }}
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
export class MunicipalitiesByDepartmentIdComponent {
    protected readonly facade = inject(MunicipalitiesByDepartmentIdFacade);
    private readonly store = inject(MunicipalitiesByDepartmentIdFilterStore);
    private readonly i18n = inject(TranslationPort);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    protected readonly ns = T;
    protected readonly filterModel = this.store.model;
    protected readonly tableColumns =
        MUNICIPALITIES_BY_DEPARTMENT_ID_TABLE.cols;

    private readonly params = toSignal(this.route.queryParamMap);
    protected readonly departmentId = computed(
        () => this.params()?.get('uniqId') ?? ''
    );
    protected readonly departmentName = computed(
        () => this.params()?.get('name') ?? ''
    );

    private readonly presenter = new MunicipalitiesByDepartmentIdPresenter(
        (k) => this.i18n.translate(k)
    );

    protected readonly itemsVM = computed<
        MunicipalitiesByDepartmentIdVmProps[]
    >(() => this.facade.items().map((item) => this.presenter.map(item)));

    protected readonly indexOffset = computed(() => {
        const page = this.facade.value();
        return page ? (page.currentPage - 1) * page.perPage : 0;
    });

    protected readonly filterFields: Signal<FilterField[]> = computed(() => [
        {
            type: 'text',
            name: MUNICIPALITIES_BY_DEPARTMENT_ID_FILTER_KEYS.SEARCH,
            label: T + '.FILTER.SEARCH',
            placeholder: T + '.FILTER.SEARCH_PLACEHOLDER',
        },
        {
            type: 'date',
            name: MUNICIPALITIES_BY_DEPARTMENT_ID_FILTER_KEYS.START_DATE,
            label: T + '.FILTER.DATE.FROM',
        },
        {
            type: 'date',
            name: MUNICIPALITIES_BY_DEPARTMENT_ID_FILTER_KEYS.END_DATE,
            label: T + '.FILTER.DATE.TO',
        },
    ]);

    constructor() {
        this.facade.load(this.store.toContract(this.departmentId()));
    }

    protected t(key: string): string {
        return this.i18n.translate(key);
    }

    protected onApply(): void {
        this.facade.load(this.store.toContract(this.departmentId()), '1', {
            forceRefresh: true,
        });
    }

    protected onClear(): void {
        this.store.reset();
        this.facade.load(this.store.toContract(this.departmentId()), '1', {
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
