import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    selector: 'cmz-interactive-map-page',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div
            class="p-6 bg-slate-900 rounded-xl border border-slate-800 text-white min-h-[500px] flex flex-col items-center justify-center"
        >
            <svg
                class="w-16 h-16 text-indigo-400 mb-4 animate-pulse"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.5"
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                />
            </svg>
            <h2 class="text-xl font-bold text-slate-100">
                Carte SIG Interactive
            </h2>
            <p class="text-sm text-slate-400 mt-2 text-center max-w-md">
                Visualisation des couches cartographiques et clusters
                d'équipements télécom en temps réel.
            </p>
        </div>
    `,
})
export class InteractiveMapPageComponent {}
