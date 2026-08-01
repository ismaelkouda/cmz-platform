import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
} from '@angular/core';
import { InteractiveMapSigFacade } from '@cmz/interactive-map-application';
import { TranslationPort } from '@cmz/shared-application';
import { InteractiveMapOlViewComponent } from './interactive-map-ol-view.component';

const T = 'INTERACTIVE_MAP.MAP';

@Component({
    selector: 'cmz-interactive-map-page',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [InteractiveMapOlViewComponent],
    template: `
        <section class="flex flex-col gap-4">
            <header class="flex flex-wrap items-center justify-between gap-3">
                <h2 class="text-lg font-semibold text-text">
                    {{ t('${T}.TITLE') }}
                </h2>
                <div class="flex items-center gap-3 text-sm text-text-muted">
                    @if (reportCount() > 0) {
                        <span>
                            {{ reportCount() }}
                            {{ t('${T}.REPORTS_ON_MAP') }}
                        </span>
                    }
                    <button
                        type="button"
                        class="rounded border border-border p-2 hover:bg-surface-hover disabled:opacity-50"
                        [disabled]="loading()"
                        [attr.aria-label]="t('${T}.REFRESH')"
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
                <div
                    class="flex min-h-[500px] items-center justify-center rounded-xl border border-border bg-surface text-text-muted"
                >
                    {{ t('${T}.LOADING_DESCRIPTION') }}
                </div>
            } @else if (hasError()) {
                <div
                    class="flex min-h-[500px] items-center justify-center rounded-xl border border-danger/30 bg-surface p-6 text-danger"
                >
                    {{ t('${T}.ERROR_DESCRIPTION') }}
                </div>
            } @else {
                <cmz-interactive-map-ol-view [reports]="reports()" />
            }
        </section>
    `,
})
export class InteractiveMapPageComponent {
    private readonly facade = inject(InteractiveMapSigFacade);
    private readonly i18n = inject(TranslationPort);

    protected readonly loading = this.facade.isLoading;
    protected readonly hasError = computed(() => !!this.facade.error());
    protected readonly reports = computed(() => this.facade.value() ?? []);
    protected readonly reportCount = computed(() => this.reports().length);

    constructor() {
        this.facade.load();
    }

    protected t(key: string): string {
        return this.i18n.translate(key);
    }

    protected onRefresh(): void {
        this.facade.reload();
    }
}
