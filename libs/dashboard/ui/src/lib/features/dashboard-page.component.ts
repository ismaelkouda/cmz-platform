import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DashboardFacade } from '@cmz/dashboard-application';
import { Period } from '@cmz/dashboard-domain';
import { TranslationPort } from '@cmz/shared-application';
import { PERIOD_OPTIONS } from '../constants/period-label.constant';
import { DashboardPresenter } from '../adapters/dashboard-vm.presenter';
import { DashboardFilterStore } from '../stores/dashboard-filter.store';
import { DashboardSkeletonComponent } from './dashboard-skeleton.component';

const T = 'DASHBOARD';

/**
 * Page `dashboard` — lecture seule, pas de garde de permission (le source
 * n'en avait aucune sur cette page). Les cartes du source étaient
 * cliquables vers des routes absolues (`/report/queue`, `/report/
 * approval`, …) appartenant aux modules `requests`/`processing`/
 * `finalization`, non encore reconstruits dans ce monorepo — le clic est
 * omis pour l'instant plutôt que de pointer vers des routes inexistantes ;
 * à rebrancher quand ces modules existeront (cf. doc module).
 */
@Component({
    selector: 'cmz-dashboard-page',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [DashboardSkeletonComponent],
    providers: [DashboardFilterStore],
    template: `
        <section class="flex flex-col gap-6">
            <header
                class="flex flex-wrap items-center justify-between gap-4"
            >
                <h1 class="text-lg font-semibold text-text">
                    {{ t(ns + '.TITLE') }}
                </h1>

                <div class="flex flex-wrap items-center gap-3">
                    <div class="flex items-center gap-2">
                        <span class="text-sm text-text-muted">
                            {{ t(ns + '.FILTER.PERIOD_LABEL') }}
                        </span>
                        <div class="flex overflow-hidden rounded border border-border">
                            @for (option of periodOptions; track option.value) {
                                <button
                                    type="button"
                                    [disabled]="loading()"
                                    [class.bg-primary]="isSelected(option.value)"
                                    [class.text-on-primary]="
                                        isSelected(option.value)
                                    "
                                    class="px-3 py-1.5 text-sm hover:bg-surface-hover disabled:opacity-50"
                                    (click)="onPeriodChange(option.value)"
                                >
                                    {{ t(option.label) }}
                                </button>
                            }
                        </div>
                    </div>

                    <div class="text-sm text-text-muted">
                        {{ t(ns + '.UPDATED_DATE') }}:
                        {{ vm()?.lastRefreshAt || t(ns + '.NO_DATE') }}
                    </div>

                    <button
                        type="button"
                        [disabled]="loading()"
                        [attr.aria-label]="t(ns + '.REFRESH')"
                        class="rounded border border-border p-2 hover:bg-surface-hover disabled:opacity-50"
                        (click)="onRefresh()"
                    >
                        <i
                            class="pi pi-refresh"
                            [class.pi-spin]="loading()"
                        ></i>
                    </button>
                </div>
            </header>

            @if (loading()) {
                <cmz-dashboard-skeleton />
            } @else if (vm(); as data) {
                <div class="flex flex-col gap-6">
                    <div class="flex flex-col gap-3">
                        <div
                            class="w-fit rounded-full bg-surface-hover px-4 py-1.5 text-sm font-medium text-text"
                        >
                            {{ t(ns + '.SECTIONS.TYPE.TITLE') }}
                        </div>
                        <div
                            class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5"
                        >
                            @for (card of data.typeCards; track card.key) {
                                <div
                                    class="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4"
                                >
                                    <div
                                        class="flex items-center justify-between"
                                    >
                                        <div
                                            class="text-2xl font-semibold text-text"
                                        >
                                            {{ card.value }}
                                        </div>
                                        <i
                                            class="pi {{ card.icon }} text-lg"
                                            [class.text-primary]="
                                                card.color === 'primary'
                                            "
                                            [class.text-success]="
                                                card.color === 'success'
                                            "
                                            [class.text-warning]="
                                                card.color === 'warning'
                                            "
                                            [class.text-danger]="
                                                card.color === 'danger'
                                            "
                                            [class.text-info]="
                                                card.color === 'info'
                                            "
                                        ></i>
                                    </div>
                                    <div class="text-sm text-text-muted">
                                        {{ card.label }}
                                    </div>
                                </div>
                            }
                        </div>
                    </div>

                    <div class="flex flex-col gap-3">
                        <div
                            class="w-fit rounded-full bg-surface-hover px-4 py-1.5 text-sm font-medium text-text"
                        >
                            {{ t(ns + '.SECTIONS.TASK_STATUS.TITLE') }}
                        </div>
                        <div
                            class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5"
                        >
                            @for (
                                card of data.taskStatusCards;
                                track card.key
                            ) {
                                <div
                                    class="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4"
                                >
                                    <div
                                        class="flex items-center justify-between"
                                    >
                                        <div
                                            class="text-2xl font-semibold text-text"
                                        >
                                            {{ card.value }}
                                        </div>
                                        <i
                                            class="pi {{ card.icon }} text-lg"
                                            [class.text-primary]="
                                                card.color === 'primary'
                                            "
                                            [class.text-success]="
                                                card.color === 'success'
                                            "
                                            [class.text-warning]="
                                                card.color === 'warning'
                                            "
                                            [class.text-danger]="
                                                card.color === 'danger'
                                            "
                                            [class.text-info]="
                                                card.color === 'info'
                                            "
                                        ></i>
                                    </div>
                                    <div class="text-sm text-text-muted">
                                        {{ card.label }}
                                    </div>
                                </div>
                            }
                        </div>
                    </div>

                    <div class="flex flex-col gap-3">
                        <div
                            class="w-fit rounded-full bg-surface-hover px-4 py-1.5 text-sm font-medium text-text"
                        >
                            {{ t(ns + '.SECTIONS.PERFORMANCE.TITLE') }}
                        </div>
                        <div
                            class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
                        >
                            @for (
                                card of data.performanceCards;
                                track card.key
                            ) {
                                <div
                                    class="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4"
                                >
                                    <div
                                        class="flex items-center justify-between"
                                    >
                                        <div
                                            class="text-2xl font-semibold text-text"
                                        >
                                            {{ card.value }}
                                        </div>
                                        <i
                                            class="pi {{ card.icon }} text-lg"
                                            [class.text-primary]="
                                                card.color === 'primary'
                                            "
                                            [class.text-success]="
                                                card.color === 'success'
                                            "
                                            [class.text-warning]="
                                                card.color === 'warning'
                                            "
                                            [class.text-danger]="
                                                card.color === 'danger'
                                            "
                                            [class.text-info]="
                                                card.color === 'info'
                                            "
                                        ></i>
                                    </div>
                                    <div class="text-sm text-text-muted">
                                        {{ card.label }}
                                    </div>
                                </div>
                            }
                        </div>
                    </div>
                </div>
            } @else {
                <div
                    class="flex flex-col items-center gap-2 py-12 text-text-muted"
                >
                    <i class="pi pi-info-circle text-2xl"></i>
                    <p>{{ t(ns + '.NO_DATA') }}</p>
                </div>
            }
        </section>
    `,
})
export class DashboardPageComponent {
    private readonly facade = inject(DashboardFacade);
    private readonly store = inject(DashboardFilterStore);
    private readonly i18n = inject(TranslationPort);

    protected readonly ns = T;
    protected readonly periodOptions = PERIOD_OPTIONS;
    protected readonly loading = this.facade.isLoading;

    private readonly presenter = new DashboardPresenter((k) =>
        this.i18n.translate(k)
    );

    protected readonly vm = computed(() => {
        const entity = this.facade.value();
        return entity ? this.presenter.map(entity) : undefined;
    });

    constructor() {
        this.facade.load(this.store.toContract());
    }

    protected t(key: string): string {
        return this.i18n.translate(key);
    }

    protected isSelected(period: Period): boolean {
        return this.store.period() === period;
    }

    protected onPeriodChange(period: Period): void {
        if (period === this.store.period()) {
            return;
        }
        this.store.setPeriod(period);
        this.facade.load(this.store.toContract(), { forceRefresh: true });
    }

    protected onRefresh(): void {
        this.facade.reload();
    }
}
