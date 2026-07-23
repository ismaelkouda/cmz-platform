import {
    ChangeDetectionStrategy,
    Component,
    inject,
    input,
    model,
    output,
} from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { TranslationPort } from '@cmz/shared-application';
import { FilterField } from './filter.types';

/**
 * Barre de filtres — **design-system, Signal Forms (Angular 22)**. Dirigée par
 * la donnée : un modèle `Record` en signal deux-voies (`model()`) est enveloppé
 * par `form()` ; chaque champ (`text`/`number`/`select`/`date`) est lié par
 * `[formField]`. Émet `apply` à la soumission, `clear` à la réinitialisation.
 * Sans primeng, sans `ReactiveFormsModule`. Standalone, `OnPush`, a11y, i18n via
 * `TranslationPort`, mise en page Tailwind + tokens.
 *
 * **Contrat** : le `model` fourni doit contenir une clé par `field.name`
 * (Signal Forms construit l'arbre à partir des clés présentes) — sinon
 * `[formField]` pointe sur un champ inexistant. Les stores de filtre pré-seedent
 * ces clés.
 */
@Component({
    selector: 'cmz-filter',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormField],
    template: `
        <form (submit)="onSubmit($event)" class="flex flex-col gap-4">
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                @for (field of fields(); track field.name) {
                    <div
                        class="flex flex-col gap-1"
                        [class]="field.class ?? ''"
                    >
                        <label
                            [attr.for]="field.name"
                            class="text-sm font-medium text-muted"
                        >
                            {{ t(field.label) }}
                        </label>

                        @switch (field.type) {
                            @case ('select') {
                                <select
                                    [id]="field.name"
                                    [formField]="filterForm[field.name]"
                                    class="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus"
                                >
                                    <option value="">
                                        {{
                                            t(field.placeholder ?? 'COMMON.ALL')
                                        }}
                                    </option>
                                    @for (
                                        opt of field.options ?? [];
                                        track opt.value
                                    ) {
                                        <option [value]="opt.value">
                                            {{ t(opt.label) }}
                                        </option>
                                    }
                                </select>
                            }
                            @case ('date') {
                                <input
                                    type="date"
                                    [id]="field.name"
                                    [formField]="filterForm[field.name]"
                                    class="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus"
                                />
                            }
                            @default {
                                <input
                                    [type]="
                                        field.type === 'number'
                                            ? 'number'
                                            : 'text'
                                    "
                                    [id]="field.name"
                                    [formField]="filterForm[field.name]"
                                    [attr.placeholder]="
                                        field.placeholder
                                            ? t(field.placeholder)
                                            : null
                                    "
                                    class="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus"
                                />
                            }
                        }
                    </div>
                }
            </div>

            <div class="flex items-center justify-end gap-2">
                <button
                    type="button"
                    (click)="onClear()"
                    class="rounded border border-border px-4 py-2 text-sm hover:bg-surface-hover"
                >
                    {{ t('COMMON.RESET') }}
                </button>
                <button
                    type="submit"
                    [disabled]="loading()"
                    class="rounded bg-primary px-4 py-2 text-sm font-medium text-on-primary disabled:opacity-50"
                >
                    {{ t('COMMON.FILTER') }}
                </button>
            </div>
        </form>
    `,
})
export class FilterComponent {
    private readonly i18n = inject(TranslationPort);

    /** Modèle de filtre (deux-voies) : `{ [name]: valeur }`. */
    readonly model = model<Record<string, string>>({});
    readonly fields = input.required<FilterField[]>();
    readonly loading = input(false);

    /** Émis à la soumission (le parent lit le `model`). */
    readonly apply = output<void>();
    /** Émis après réinitialisation. */
    readonly clear = output<void>();

    protected readonly filterForm = form(this.model);

    protected t(key: string): string {
        return this.i18n.translate(key);
    }

    protected onSubmit(event: Event): void {
        event.preventDefault();
        this.apply.emit();
    }

    protected onClear(): void {
        const cleared = Object.fromEntries(
            this.fields().map((f) => [f.name, ''])
        );
        this.model.set(cleared);
        this.clear.emit();
    }
}
