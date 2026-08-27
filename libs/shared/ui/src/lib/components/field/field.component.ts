import { Component, inject, input } from '@angular/core';
import { Field } from '@angular/forms/signals';
import { TranslocoService } from '@jsverse/transloco';

/**
 * Champ de formulaire — **design-system, Signal Forms (Angular 22)**. Enveloppe
 * un `Field` : libellé, marqueur requis, et messages d'erreur issus du champ
 * (`field()().errors()`), affichés seulement après interaction (`touched()`).
 * Le contrôle natif est projeté (`<ng-content>`) et lié par `[formField]` côté
 * consommateur. Standalone, `OnPush`, a11y (`label for`, `role="alert"`).
 */
@Component({
    selector: 'cmz-field',
    template: `
        <div class="flex flex-col gap-1">
            <label [attr.for]="for()" class="text-sm font-medium text-text">
                {{ t(label()) }}
                @if (required()) {
                    <span class="text-danger" aria-hidden="true">*</span>
                }
            </label>

            <ng-content />

            @if (field()().touched()) {
                @for (error of field()().errors(); track error.kind) {
                    <p class="text-sm text-danger" role="alert">
                        {{ error.message ? t(asText(error.message)) : '' }}
                    </p>
                }
            }
        </div>
    `,
})
export class FieldComponent {
    private readonly i18n = inject(TranslocoService);

    readonly for = input('');
    readonly label = input.required<string>();
    readonly required = input(false);
    readonly field = input.required<Field<unknown>>();

    protected t(key: string): string {
        return this.i18n.translate(key);
    }

    protected asText(v: unknown): string {
        return typeof v === 'string' ? v : '';
    }
}
