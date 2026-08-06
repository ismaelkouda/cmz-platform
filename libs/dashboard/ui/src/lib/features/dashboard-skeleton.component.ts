import { Component } from '@angular/core';

/**
 * Squelette de chargement — reconstruit sans PrimeNG (`p-skeleton` côté
 * source) via `animate-pulse` (Tailwind) + tokens `--cmz-*`, même esprit
 * que le reste du design-system (aucune lib de composants tierce).
 * Un seul gabarit de section répété 3 fois (5/5/4 cartes), plutôt que
 * dupliquer le HTML section par section comme le source.
 */
@Component({
    selector: 'cmz-dashboard-skeleton',
    template: `
        <div class="flex flex-col gap-6">
            @for (section of sections; track section) {
                <div class="flex flex-col gap-3">
                    <div
                        class="h-8 w-40 animate-pulse rounded-full bg-surface-hover"
                    ></div>
                    <div
                        class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5"
                    >
                        @for (card of cardsFor(section); track card) {
                            <div
                                class="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4"
                            >
                                <div class="flex items-center justify-between">
                                    <div
                                        class="h-8 w-14 animate-pulse rounded bg-surface-hover"
                                    ></div>
                                    <div
                                        class="h-8 w-8 animate-pulse rounded-full bg-surface-hover"
                                    ></div>
                                </div>
                                <div
                                    class="h-4 w-24 animate-pulse rounded bg-surface-hover"
                                ></div>
                            </div>
                        }
                    </div>
                </div>
            }
        </div>
    `,
})
export class DashboardSkeletonComponent {
    protected readonly sections = [5, 5, 4];

    protected cardsFor(count: number): number[] {
        return Array.from({ length: count }, (_, i) => i);
    }
}
