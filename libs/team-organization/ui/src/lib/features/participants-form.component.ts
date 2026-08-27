import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormField } from '@angular/forms/signals';
import { ActivatedRoute, Router } from '@angular/router';
import {
    ParticipantsFacade,
    TeamsSelectFacade,
} from '@cmz/team-organization-application';
import { Role } from '@cmz/shared-domain';
import { FieldComponent, FormMode, ROLE_OPTIONS } from '@cmz/shared-ui';
import { ParticipantsFormStore } from '../stores/participants-form.store';
import { TranslocoService } from '@jsverse/transloco';

const T = 'TEAM_ORGANIZATION.PARTICIPANTS';

/**
 * Formulaire `participants` — Signal Forms. `role`/`team` optionnels (pas
 * de `required()`) ; `team` alimenté par `TeamsSelectFacade` (uniqId en
 * valeur). Le statut n'est pas éditable ici (actions dédiées en liste).
 */
@Component({
    selector: 'cmz-participants-form',
    imports: [FormField, FieldComponent],
    providers: [ParticipantsFormStore],
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
                [label]="ns + '.FORM.ROLE'"
                [field]="store.form.role"
                for="role"
            >
                <select
                    id="role"
                    [formField]="store.form.role"
                    class="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
                >
                    <option value="">
                        {{ t('COMMON.SELECT_PLACEHOLDER') }}
                    </option>
                    @for (option of roleOptions; track option.value) {
                        <option [value]="option.value">
                            {{ t(option.label) }}
                        </option>
                    }
                </select>
            </cmz-field>

            <cmz-field
                [label]="ns + '.FORM.TEAM'"
                [field]="store.form.team"
                for="team"
            >
                <select
                    id="team"
                    [formField]="store.form.team"
                    class="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
                >
                    <option value="">
                        {{ t('COMMON.SELECT_PLACEHOLDER') }}
                    </option>
                    @for (option of teamOptions(); track option.value) {
                        <option [value]="option.value">
                            {{ option.label }}
                        </option>
                    }
                </select>
            </cmz-field>

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
export class ParticipantsFormComponent {
    protected readonly store = inject(ParticipantsFormStore);
    private readonly facade = inject(ParticipantsFacade);
    private readonly teamsSelectFacade = inject(TeamsSelectFacade);
    private readonly i18n = inject(TranslocoService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    protected readonly ns = T;
    protected readonly mode = this.store.mode;
    protected readonly isDetails = this.store.isDetails;
    protected readonly saving = computed(
        () => this.facade.actionState() === 'loading'
    );

    protected readonly roleOptions = ROLE_OPTIONS;
    protected readonly teamOptions = this.teamsSelectFacade.options;

    private readonly params = toSignal(this.route.queryParamMap);
    private lastSeenSuccess = this.facade.actionSuccess();

    constructor() {
        this.teamsSelectFacade.load({ forceRefresh: true });

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
        const { firstName, lastName, email, phone, role, team } =
            this.store.model();
        const payload = {
            firstName,
            lastName,
            email,
            phone,
            role: (role || undefined) as Role | undefined,
            team: team || undefined,
        };
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
