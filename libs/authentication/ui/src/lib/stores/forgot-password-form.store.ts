import { Injectable, computed, signal } from '@angular/core';
import { email, form, required } from '@angular/forms/signals';

interface ForgotPasswordFormModel {
    email: string;
}

@Injectable()
export class ForgotPasswordFormStore {
    readonly model = signal<ForgotPasswordFormModel>({ email: '' });

    readonly form = form(this.model, (schema) => {
        required(schema.email, { message: 'COMMON.VALIDATION.REQUIRED' });
        email(schema.email, { message: 'COMMON.EMAIL.INVALID_FORMAT' });
    });

    readonly isValid = computed(() => this.form().valid());

    reset(): void {
        this.model.set({ email: '' });
    }
}
