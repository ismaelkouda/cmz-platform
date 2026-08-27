import { Component, effect, inject } from '@angular/core';
import { FormField } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { LoginFacade } from '@cmz/authentication-application';
import { FieldComponent } from '@cmz/shared-ui';
import { FORGOT_PASSWORD_ROUTE } from '../constants/authentication-paths.constant';
import { LoginFormStore } from '../stores/login-form.store';
import { TranslocoService } from '@jsverse/transloco';

const T = 'AUTHENTICATION.LOGIN';

@Component({
    selector: 'cmz-login',
    imports: [FormField, FieldComponent, RouterLink],
    providers: [LoginFormStore],
    template: `
        <section class="mx-auto flex max-w-sm flex-col gap-6 py-16">
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

                <cmz-field
                    [label]="ns + '.FORM.PASSWORD'"
                    [field]="store.form.password"
                    for="password"
                    [required]="true"
                >
                    <input
                        id="password"
                        type="password"
                        autocomplete="current-password"
                        [formField]="store.form.password"
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
                    [routerLink]="['../', forgotPasswordRoute]"
                    class="text-center text-sm text-primary hover:underline"
                >
                    {{ t(ns + '.ACTION.FORGOT_PASSWORD') }}
                </a>
            </form>
        </section>
    `,
})
export class LoginComponent {
    protected readonly store = inject(LoginFormStore);
    protected readonly facade = inject(LoginFacade);
    private readonly i18n = inject(TranslocoService);
    private readonly router = inject(Router);

    protected readonly ns = T;
    protected readonly forgotPasswordRoute = FORGOT_PASSWORD_ROUTE;

    private hasRedirected = false;

    constructor() {
        effect(() => {
            const session = this.facade.value();
            if (!session || this.hasRedirected) {
                return;
            }
            this.hasRedirected = true;
            void this.router.navigate(['/']);
        });
        effect(() => {
            if (this.facade.error()) {
                this.store.clearPassword();
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
        this.facade.login(this.store.model());
    }
}
