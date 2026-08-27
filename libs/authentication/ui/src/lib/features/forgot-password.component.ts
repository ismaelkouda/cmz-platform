import { Component, effect, inject, signal } from '@angular/core';
import { FormField } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { ForgotPasswordFacade } from '@cmz/authentication-application';
import { FieldComponent } from '@cmz/shared-ui';
import { LOGIN_ROUTE } from '../constants/authentication-paths.constant';
import { ForgotPasswordFormStore } from '../stores/forgot-password-form.store';
import { TranslocoService } from '@jsverse/transloco';

const T = 'AUTHENTICATION.FORGOT_PASSWORD';

@Component({
    selector: 'cmz-forgot-password',
    imports: [FormField, FieldComponent, RouterLink],
    providers: [ForgotPasswordFormStore],
    template: `
        <section class="mx-auto flex max-w-sm flex-col gap-6 py-16">
            @if (!isEmailSent()) {
                <h1 class="text-lg font-semibold text-text">
                    {{ t(ns + '.TITLE') }}
                </h1>

                <form
                    (submit)="onSubmit($event)"
                    class="flex flex-col gap-4"
                    novalidate
                >
                    <cmz-field
                        [label]="ns + '.FORM.EMAIL'"
                        [field]="store.form.email"
                        for="email"
                        [required]="true"
                    >
                        <input
                            id="email"
                            type="email"
                            autocomplete="email"
                            [formField]="store.form.email"
                            class="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus"
                        />
                    </cmz-field>

                    <button
                        type="submit"
                        [disabled]="!store.isValid() || facade.isLoading()"
                        class="rounded bg-primary px-4 py-2 text-sm font-medium text-on-primary disabled:opacity-50"
                    >
                        {{ t(ns + '.ACTION.SUBMIT') }}
                    </button>

                    <a
                        [routerLink]="['../', loginRoute]"
                        class="text-center text-sm text-primary hover:underline"
                    >
                        {{ t(ns + '.ACTION.BACK_TO_LOGIN') }}
                    </a>
                </form>
            } @else {
                <p class="text-sm text-text">
                    {{ t(ns + '.MESSAGE.EMAIL_SENT') }}
                </p>
                <a
                    [routerLink]="['../', loginRoute]"
                    class="text-center text-sm text-primary hover:underline"
                >
                    {{ t(ns + '.ACTION.BACK_TO_LOGIN') }}
                </a>
            }
        </section>
    `,
})
export class ForgotPasswordComponent {
    protected readonly store = inject(ForgotPasswordFormStore);
    protected readonly facade = inject(ForgotPasswordFacade);
    private readonly i18n = inject(TranslocoService);

    protected readonly ns = T;
    protected readonly loginRoute = LOGIN_ROUTE;
    protected readonly isEmailSent = signal(false);

    constructor() {
        effect(() => {
            if (this.facade.value()) {
                this.isEmailSent.set(true);
            }
        });
    }

    protected t(key: string): string {
        return this.i18n.translate(key);
    }

    protected onSubmit(event: Event): void {
        event.preventDefault();
        if (!this.store.isValid()) {
            return;
        }
        this.facade.requestPasswordReset(this.store.model());
    }
}
