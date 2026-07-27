import { Injectable, computed, signal } from '@angular/core';
import { form, minLength, required, validate } from '@angular/forms/signals';

interface ResetPasswordFormModel {
    password: string;
    confirmPassword: string;
}

/**
 * `token`/`email` viennent de la route (query params), pas du formulaire —
 * fidèle au source (`ResetPasswordComponent` ne les affiche pas en champs
 * éditables). Concordance mot de passe/confirmation vérifiée **côté client**
 * via `validate()` (le source ne le faisait qu'après soumission, côté
 * domaine — un vrai trou d'UX du source, corrigé ici) ; même clé i18n
 * (`COMMON.CONFIRM_PASSWORD.NO_MATCH`) que `ConfirmPasswordNoMatchError`
 * côté domaine, gardé en défense en profondeur.
 */
@Injectable()
export class ResetPasswordFormStore {
    readonly model = signal<ResetPasswordFormModel>({
        password: '',
        confirmPassword: '',
    });

    readonly form = form(this.model, (schema) => {
        required(schema.password, { message: 'COMMON.VALIDATION.REQUIRED' });
        minLength(schema.password, 8, {
            message: 'COMMON.PASSWORD.MIN_LENGTH',
        });
        required(schema.confirmPassword, {
            message: 'COMMON.VALIDATION.REQUIRED',
        });
        validate(schema.confirmPassword, (ctx) =>
            ctx.value() === ctx.valueOf(schema.password)
                ? undefined
                : {
                      kind: 'confirmPasswordMismatch',
                      message: 'COMMON.CONFIRM_PASSWORD.NO_MATCH',
                  }
        );
    });

    readonly isValid = computed(() => this.form().valid());
}
