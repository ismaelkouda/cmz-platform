import {
    ChangeDetectionStrategy,
    Component,
    effect,
    inject,
} from '@angular/core';
import { FormField } from '@angular/forms/signals';
import { ActivatedRoute, Router } from '@angular/router';
import { ResetPasswordFacade } from '@cmz/authentication-application';
import { TranslationPort } from '@cmz/shared-application';
import { FieldComponent } from '@cmz/shared-ui';
import { LOGIN_ROUTE } from '../constants/authentication-paths.constant';
import { ResetPasswordFormStore } from '../stores/reset-password-form.store';

const T = 'AUTHENTICATION.RESET_PASSWORD';

/**
 * `token`/`email` viennent du lien reçu par email (query params), lus une
 * seule fois via `snapshot` : cette page n'est jamais navigée "en place"
 * avec des query params qui changent, elle est toujours ouverte fraîche
 * depuis le lien — pas besoin de s'abonner à `queryParamMap`.
 */
@Component({
    selector: 'cmz-reset-password',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormField, FieldComponent],
    providers: [ResetPasswordFormStore],
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
                    [label]="ns + '.FORM.PASSWORD'"
                    [field]="store.form.password"
                    for="password"
                    [required]="true"
                >
                    <input
                        id="password"
                        type="password"
                        autocomplete="new-password"
                        [formField]="store.form.password"
                        class="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus"
                    />
                </cmz-field>

                <cmz-field
                    [label]="ns + '.FORM.CONFIRM_PASSWORD'"
                    [field]="store.form.confirmPassword"
                    for="confirmPassword"
                    [required]="true"
                >
                    <input
                        id="confirmPassword"
                        type="password"
                        autocomplete="new-password"
                        [formField]="store.form.confirmPassword"
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
            </form>
        </section>
    `,
})
export class ResetPasswordComponent {
    protected readonly store = inject(ResetPasswordFormStore);
    protected readonly facade = inject(ResetPasswordFacade);
    private readonly i18n = inject(TranslationPort);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    protected readonly ns = T;

    private readonly token =
        this.route.snapshot.queryParamMap.get('token') ?? undefined;
    private readonly email =
        this.route.snapshot.queryParamMap.get('email') ?? undefined;
    private hasRedirected = false;

    constructor() {
        effect(() => {
            if (!this.facade.value() || this.hasRedirected) {
                return;
            }
            this.hasRedirected = true;
            void this.router.navigate(['../', LOGIN_ROUTE], {
                relativeTo: this.route,
            });
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
        this.facade.resetPassword({
            ...this.store.model(),
            token: this.token,
            email: this.email,
        });
    }
}
