import {
    ChangeDetectionStrategy,
    Component,
    inject,
    input,
    output,
} from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TranslationPort } from '@cmz/shared-application';
import { FilterField } from './filter.types';

/**
 * Barre de filtres — **design-system**, dirigée par la donnée : rend des champs
 * (`text`/`number`/`select`/`date`) liés à un `FormGroup` fourni, émet `apply`
 * à la soumission et `clear` à la réinitialisation. Reconstruite sans primeng
 * ni `any` (le source enveloppait primeng). Reactive Forms, standalone, `OnPush`,
 * accessible (`<label for>`), libellés via `TranslationPort`. Mise en page en
 * **utilitaires Tailwind** ; couleurs via les tokens `@theme` (`border-border`,
 * `bg-primary`, …).
 */
@Component({
    selector: 'cmz-filter',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ReactiveFormsModule],
    template: `
        <form
            [formGroup]="form()"
            (ngSubmit)="apply.emit()"
            class="flex flex-col gap-4"
        >
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
                                    [formControlName]="field.name"
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
                                    [formControlName]="field.name"
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
                                    [formControlName]="field.name"
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

    readonly form = input.required<FormGroup>();
    readonly fields = input.required<FilterField[]>();
    readonly loading = input(false);

    /** Émis à la soumission (le parent lit `form.value`). */
    readonly apply = output<void>();
    /** Émis après réinitialisation du formulaire. */
    readonly clear = output<void>();

    protected t(key: string): string {
        return this.i18n.translate(key);
    }

    protected onClear(): void {
        this.form().reset();
        this.clear.emit();
    }
}
