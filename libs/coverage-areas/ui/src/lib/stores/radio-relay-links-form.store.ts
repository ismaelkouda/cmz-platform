import {
    Injectable,
    computed,
    effect,
    inject,
    signal,
    untracked,
} from '@angular/core';
import { disabled, form, required } from '@angular/forms/signals';
import { RadioRelayLinksFindOneFacade } from '@cmz/coverage-areas-application';
import {
    RadioRelayLinksFrequency,
    RadioRelayLinksOperator,
} from '@cmz/coverage-areas-domain';
import { FormMode } from './form-mode.type';

interface RadioRelayLinksFormModel {
    name: string;
    operator: RadioRelayLinksOperator | '';
    frequency: RadioRelayLinksFrequency | '';
    /** Dates modélisées en chaînes ISO (`YYYY-MM-DD`) pour se lier
     * nativement à `<input type="date">` via `[formField]` — évite de
     * reproduire le bug de binding `Operator | null` déjà corrigé sur
     * `mobile-network` (`ngc --strictTemplates` rejette `string | null` sur
     * un type non nullable). Converties en `Date` au submit uniquement. */
    startDate: string;
    endDate: string;
}

function toDateInputValue(date: Date): string {
    return date.toISOString().slice(0, 10);
}

/**
 * Store de formulaire `radio-relay-links` — **Signal Forms (Angular 22)**.
 */
@Injectable()
export class RadioRelayLinksFormStore {
    private readonly findOne = inject(RadioRelayLinksFindOneFacade);

    readonly mode = signal<FormMode>('create');
    readonly isDetails = computed(() => this.mode() === 'details');
    readonly loading = this.findOne.isLoading;

    readonly model = signal<RadioRelayLinksFormModel>({
        name: '',
        operator: '',
        frequency: '',
        startDate: '',
        endDate: '',
    });

    readonly form = form(this.model, (schema) => {
        required(schema.name, { message: 'COMMON.VALIDATION.REQUIRED' });
        required(schema.operator, { message: 'COMMON.VALIDATION.REQUIRED' });
        required(schema.frequency, { message: 'COMMON.VALIDATION.REQUIRED' });
        required(schema.startDate, { message: 'COMMON.VALIDATION.REQUIRED' });
        required(schema.endDate, { message: 'COMMON.VALIDATION.REQUIRED' });
        disabled(schema.name, () => this.isDetails());
        disabled(schema.operator, () => this.isDetails());
        disabled(schema.frequency, () => this.isDetails());
        disabled(schema.startDate, () => this.isDetails());
        disabled(schema.endDate, () => this.isDetails());
    });

    readonly isValid = computed(() => this.form().valid());

    constructor() {
        effect(() => {
            const item = this.findOne.value();
            if (this.mode() === 'create' || !item) {
                return;
            }
            untracked(() =>
                this.model.set({
                    name: item.name,
                    operator: item.operator,
                    frequency: item.frequency,
                    startDate: toDateInputValue(item.startDate),
                    endDate: toDateInputValue(item.endDate),
                })
            );
        });
    }

    setMode(uniqId: string | null, mode: FormMode): void {
        this.mode.set(mode);
        if (mode === 'create') {
            this.reset();
            return;
        }
        if (uniqId) {
            this.findOne.read({ uniqId }, { forceRefresh: true });
        }
    }

    reset(): void {
        this.model.set({
            name: '',
            operator: '',
            frequency: '',
            startDate: '',
            endDate: '',
        });
        this.mode.set('create');
    }
}
