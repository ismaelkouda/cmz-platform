import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
} from '@angular/core';
import { CloseFacade } from '@cmz/report-states-application';

@Component({
    selector: 'cmz-close-page',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div
            class="p-6 bg-slate-900 rounded-xl border border-slate-800 text-white min-h-[400px]"
        >
            <div class="flex items-center justify-between mb-6">
                <div>
                    <h2 class="text-xl font-bold text-slate-100">
                        Signalements Clôturés
                    </h2>
                    <p class="text-sm text-slate-400 mt-1">
                        Liste des signalements entièrement traités et clôturés.
                    </p>
                </div>
                <button
                    (click)="facade.reload()"
                    class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
                >
                    Actualiser
                </button>
            </div>
            @if (facade.isLoading()) {
                <div
                    class="flex justify-center items-center py-12 text-slate-400 text-sm"
                >
                    Chargement des signalements clôturés…
                </div>
            } @else if (hasError()) {
                <div
                    class="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-lg"
                >
                    Erreur de chargement.
                </div>
            } @else {
                <div class="divide-y divide-slate-800">
                    @for (item of facade.items(); track item.id) {
                        <div
                            class="py-3 flex items-center justify-between text-sm"
                        >
                            <span class="font-mono text-indigo-400">{{
                                item.uniqId
                            }}</span>
                            <span class="text-slate-300">{{
                                item.reportType
                            }}</span>
                            <span class="text-slate-400">{{
                                item.operator
                            }}</span>
                        </div>
                    } @empty {
                        <div class="py-12 text-center text-slate-500 text-sm">
                            Aucun signalement clôturé.
                        </div>
                    }
                </div>
            }
        </div>
    `,
})
export class ClosePageComponent {
    protected readonly facade = inject(CloseFacade);
    protected readonly hasError = computed(() => !!this.facade.error());

    constructor() {
        this.facade.load(null);
    }
}
