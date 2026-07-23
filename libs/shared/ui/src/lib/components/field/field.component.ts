import {
    ChangeDetectionStrategy,
    Component,
    inject,
    input,
} from '@angular/core';
import { FormControl } from '@angular/forms';
import { TranslationPort } from '@cmz/shared-application';
import { getControlError } from '../../helpers/form-errors.helper';

/**
 * Champ de formulaire — **design-system**. Enveloppe présentation d'un contrôle
 * Reactive Forms projeté (`<ng-content>`) : libellé associé, marqueur requis, et
 * message d'erreur résolu via `getControlError` (table de messages i18n).
 * Standalone, `OnPush`, accessible (`<label for>`, `role="alert"`), libellés via
 * `TranslationPort`, mise en page Tailwind + tokens.
 */
@Component({
    selector: 'cmz-field',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="flex flex-col gap-1">
            <label [attr.for]="for()" class="text-sm font-medium text-text">
                {{ t(label()) }}
                @if (required()) {
                    <span class="text-danger" aria-hidden="true">*</span>
                }
            </label>

            <ng-content />

            @if (errorMessage(); as msg) {
                <p class="text-sm text-danger" role="alert">{{ t(msg) }}</p>
            }
        </div>
    `,
})
export class FieldComponent {
    private readonly i18n = inject(TranslationPort);

    /** id du contrôle projeté (associé au `<label for>`). */
    readonly for = input('');
    /** Clé i18n du libellé. */
    readonly label = input.required<string>();
    readonly required = input(false);
    /** Contrôle Reactive Forms inspecté pour l'erreur. */
    readonly control = input.required<FormControl>();
    /** Table message par clé d'erreur Angular (`required`, `email`, …). */
    readonly errors = input<Record<string, string>>({});

    protected t(key: string): string {
        return this.i18n.translate(key);
    }

    /** Message d'erreur courant (méthode : réévaluée à chaque détection). */
    protected errorMessage(): string | null {
        return getControlError(this.control(), this.errors());
    }
}
