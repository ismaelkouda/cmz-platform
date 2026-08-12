import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormField } from '@angular/forms/signals';
import { ActivatedRoute, Router } from '@angular/router';
import {
    ProfilesPermissionsSelectFacade,
    UsersFacade,
} from '@cmz/settings-security-application';
import { TRANSLATION_PORT } from '@cmz/shared-application';
import { FieldComponent, FormMode, ROLE_LABEL } from '@cmz/shared-ui';
import { UsersFormStore } from '../stores/users-form.store';

const T = 'SETTINGS_SECURITY.USERS';

/**
 * Formulaire `users` — Signal Forms. Pas de champ `role` (mort en
 * écriture côté source) : affiché en lecture seule en mode détail/édition
 * uniquement, jamais soumis. `profileId` alimenté par
 * `ProfilesPermissionsSelectFacade` (uniqId en valeur).
 */
@Component({
    selector: 'cmz-users-form',
    imports: [FormField, FieldComponent],
    providers: [UsersFormStore],
    template: `
        <form (submit)="onSubmit($event)" class="flex max-w-xl flex-col gap-4">
            <h1 class="text-lg font-semibold text-text">
                {{ t(ns + '.FORM.TITLE.' + mode().toUpperCase()) }}
            </h1>

            <cmz-field
                [label]="ns + '.FORM.FIRST_NAME'"
                [field]="store.form.firstName"
                for="firstName"
                [required]="true"
            >
                <input
                    id="firstName"
                    [formField]="store.form.firstName"
                    class="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
                />
            </cmz-field>

            <cmz-field
                [label]="ns + '.FORM.LAST_NAME'"
                [field]="store.form.lastName"
                for="lastName"
                [required]="true"
            >
                <input
                    id="lastName"
                    [formField]="store.form.lastName"
                    class="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
                />
            </cmz-field>

            <cmz-field
                [label]="ns + '.FORM.EMAIL'"
                [field]="store.form.email"
                for="email"
                [required]="true"
            >
                <input
                    id="email"
                    type="email"
                    [formField]="store.form.email"
                    class="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
                />
            </cmz-field>

            <cmz-field
                [label]="ns + '.FORM.PHONE'"
                [field]="store.form.phone"
                for="phone"
                [required]="true"
            >
                <input
                    id="phone"
                    [formField]="store.form.phone"
                    class="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
                />
            </cmz-field>

            <cmz-field
                [label]="ns + '.FORM.PROFILE'"
                [field]="store.form.profileId"
                for="profileId"
                [required]="true"
            >
                <select
                    id="profileId"
                    [formField]="store.form.profileId"
                    class="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
                >
                    <option value="">
                        {{ t('COMMON.SELECT_PLACEHOLDER') }}
                    </option>
                    @for (option of profileOptions(); track option.value) {
                        <option [value]="option.value">
                            {{ option.label }}
                        </option>
                    }
                </select>
            </cmz-field>

            @if (isDetails() && roleLabel()) {
                <div class="flex flex-col gap-1">
                    <span class="text-sm font-medium text-text-muted">
                        {{ t(ns + '.FORM.ROLE') }}
                    </span>
                    <span class="text-sm text-text">{{ roleLabel() }}</span>
                </div>
            }

            <div class="flex items-center justify-end gap-2">
                <button
                    type="button"
                    (click)="onCancel()"
                    class="rounded border border-border px-4 py-2 text-sm hover:bg-surface-hover"
                >
                    {{ t('COMMON.CANCEL') }}
                </button>
                @if (!isDetails()) {
                    <button
                        type="submit"
                        [disabled]="store.form().invalid() || saving()"
                        class="rounded bg-primary px-4 py-2 text-sm font-medium text-on-primary disabled:opacity-50"
                    >
                        {{ t('COMMON.SAVE') }}
                    </button>
                }
            </div>
        </form>
    `,
})
export class UsersFormComponent {
    protected readonly store = inject(UsersFormStore);
    private readonly facade = inject(UsersFacade);
    private readonly profilesSelectFacade = inject(
        ProfilesPermissionsSelectFacade
    );
    private readonly i18n = inject(TRANSLATION_PORT);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    protected readonly ns = T;
    protected readonly mode = this.store.mode;
    protected readonly isDetails = this.store.isDetails;
    protected readonly saving = computed(
        () => this.facade.actionState() === 'loading'
    );

    protected readonly profileOptions = this.profilesSelectFacade.options;
    protected readonly roleLabel = computed(() => {
        const role = this.store.currentRole();
        return role ? this.i18n.translate(ROLE_LABEL[role]) : '';
    });

    private readonly params = toSignal(this.route.queryParamMap);
    private lastSeenSuccess = this.facade.actionSuccess();

    constructor() {
        this.profilesSelectFacade.load({ forceRefresh: true });

        const params = this.params();
        const uniqId = params?.get('uniqId') ?? null;
        const ref = (params?.get('ref') as FormMode) ?? 'create';
        this.store.setMode(uniqId, ref);

        effect(() => {
            const success = this.facade.actionSuccess();
            if (success > this.lastSeenSuccess) {
                this.lastSeenSuccess = success;
                this.onCancel();
            }
        });
    }

    protected t(key: string): string {
        return this.i18n.translate(key);
    }

    protected onSubmit(event: Event): void {
        event.preventDefault();
        if (this.store.form().invalid()) {
            return;
        }
        const { firstName, lastName, email, phone, profileId } =
            this.store.model();
        const payload = { firstName, lastName, email, phone, profileId };
        if (this.mode() === 'edit') {
            const uniqId = this.params()?.get('uniqId') ?? '';
            this.facade.update({ uniqId, ...payload });
        } else {
            this.facade.create(payload);
        }
    }

    protected onCancel(): void {
        void this.router.navigate(['../'], { relativeTo: this.route });
    }
}
