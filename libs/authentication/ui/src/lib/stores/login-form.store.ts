import { Injectable, computed, signal } from '@angular/core';
import { email, form, required } from '@angular/forms/signals';

interface LoginFormModel {
    email: string;
    password: string;
}

/**
 * Pas de mode edit/details (contrairement aux stores CRUD) : `login` n'a
 * qu'un seul état de formulaire — pas de `disabled()`, pas de facade
 * `find-one` à injecter ici. Validateurs natifs Signal Forms
 * (`required`/`email`) plutôt que le pattern regex du source
 * (`Validators.pattern(FormValidators.EMAIL.PATTERN)`).
 */
@Injectable()
export class LoginFormStore {
    readonly model = signal<LoginFormModel>({ email: '', password: '' });

    readonly form = form(this.model, (schema) => {
        required(schema.email, { message: 'COMMON.VALIDATION.REQUIRED' });
        email(schema.email, { message: 'COMMON.EMAIL.INVALID_FORMAT' });
        required(schema.password, { message: 'COMMON.VALIDATION.REQUIRED' });
    });

    readonly isValid = computed(() => this.form().valid());

    /** Efface le mot de passe après un échec (garde l'email saisi). */
    clearPassword(): void {
        this.model.update((m) => ({ ...m, password: '' }));
    }
}
