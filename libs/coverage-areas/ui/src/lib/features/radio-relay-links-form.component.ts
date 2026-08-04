import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormField } from '@angular/forms/signals';
import { ActivatedRoute, Router } from '@angular/router';
import { RadioRelayLinksFacade } from '@cmz/coverage-areas-application';
import {
    RadioRelayLinksFrequency,
    RadioRelayLinksOperator,
} from '@cmz/coverage-areas-domain';
import { TranslationPort } from '@cmz/shared-application';
import { FieldComponent, FormMode } from '@cmz/shared-ui';
import { RadioRelayLinksFormStore } from '../stores/radio-relay-links-form.store';

const T = 'COVERAGE_AREAS.RADIO_RELAY_LINKS';

/**
 * Formulaire `radio-relay-links` — **Signal Forms (Angular 22)**.
 * `startDate`/`endDate` sont modélisées en chaînes ISO (cf. store) et liées
 * via `<input type="date">` ; converties en `Date` uniquement au submit.
 */
@Component({
    selector: 'cmz-radio-relay-links-form',
    imports: [FormField, FieldComponent],
    providers: [RadioRelayLinksFormStore],
    template: `
        <form (submit)="onSubmit($event)" class="flex max-w-2xl flex-col gap-4">
            <h1 class="text-lg font-semibold text-text">
                {{ t(ns + '.FORM.TITLE.' + mode().toUpperCase()) }}
            </h1>

            <cmz-field
                [label]="ns + '.FORM.NAME'"
                [field]="store.form.name"
                for="name"
                [required]="true"
            >
                <input
                    id="name"
                    [formField]="store.form.name"
                    class="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
                />
            </cmz-field>

            <cmz-field
                [label]="ns + '.FORM.OPERATOR'"
                [field]="store.form.operator"
                for="operator"
                [required]="true"
            >
                <select
                    id="operator"
                    [formField]="store.form.operator"
                    class="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
                >
                    <option value="" disabled>
                        {{ t('COMMON.SELECT_PLACEHOLDER') }}
                    </option>
                    @for (option of operatorOptions(); track option) {
                        <option [value]="option">{{ option }}</option>
                    }
                </select>
            </cmz-field>

            <cmz-field
                [label]="ns + '.FORM.FREQUENCY'"
                [field]="store.form.frequency"
                for="frequency"
                [required]="true"
            >
                <select
                    id="frequency"
                    [formField]="store.form.frequency"
                    class="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
                >
                    <option value="" disabled>
                        {{ t('COMMON.SELECT_PLACEHOLDER') }}
                    </option>
                    @for (option of frequencyOptions(); track option) {
                        <option [value]="option">{{ option }}</option>
                    }
                </select>
            </cmz-field>

            <cmz-field
                [label]="ns + '.FORM.START_DATE'"
                [field]="store.form.startDate"
                for="startDate"
                [required]="true"
            >
                <input
                    id="startDate"
                    type="date"
                    [formField]="store.form.startDate"
                    class="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
                />
            </cmz-field>

            <cmz-field
                [label]="ns + '.FORM.END_DATE'"
                [field]="store.form.endDate"
                for="endDate"
                [required]="true"
            >
                <input
                    id="endDate"
                    type="date"
                    [formField]="store.form.endDate"
                    class="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
                />
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
export class RadioRelayLinksFormComponent {
    protected readonly store = inject(RadioRelayLinksFormStore);
    private readonly facade = inject(RadioRelayLinksFacade);
    private readonly i18n = inject(TranslationPort);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    protected readonly ns = T;
    protected readonly mode = this.store.mode;
    protected readonly isDetails = this.store.isDetails;
    protected readonly saving = computed(
        () => this.facade.actionState() === 'loading'
    );

    protected readonly operatorOptions = computed(() =>
        Object.values(RadioRelayLinksOperator)
    );
    protected readonly frequencyOptions = computed(() =>
        Object.values(RadioRelayLinksFrequency)
    );

    private readonly params = toSignal(this.route.queryParamMap);
    private lastSeenSuccess = this.facade.actionSuccess();

    constructor() {
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
        const { name, operator, frequency, startDate, endDate } =
            this.store.model();
        const payload = {
            name,
            operator: operator || undefined,
            frequency: frequency || undefined,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
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
