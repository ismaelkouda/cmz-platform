import {
    Injectable,
    computed,
    effect,
    inject,
    signal,
    untracked,
} from '@angular/core';
import { disabled, form, required } from '@angular/forms/signals';
import { InfrastructureTypeFindOneFacade } from '@cmz/administrative-infrastructure-application';

import { FormMode } from './form-mode.type';

interface InfrastructureTypeFormModel {
    name: string;
    description: string;
}

/**
 * Store de formulaire `infrastructure-type` — **Signal Forms (Angular 22)**.
 * Modèle en signal → `form()` avec validators `required` et désactivation
 * réactive en mode `details`. En edit/details, le modèle est hydraté depuis la
 * façade find-one (`rxResource`) via un `effect`. Remplace le
 * `FormBuilder`/`FormGroup` + `statusChanges` du source. Fourni au composant.
 */
@Injectable()
export class InfrastructureTypeFormStore {
    private readonly findOne = inject(InfrastructureTypeFindOneFacade);

    readonly mode = signal<FormMode>('create');
    readonly isDetails = computed(() => this.mode() === 'details');
    readonly loading = this.findOne.isLoading;

    readonly model = signal<InfrastructureTypeFormModel>({
        name: '',
        description: '',
    });

    readonly form = form(this.model, (schema) => {
        required(schema.name, { message: 'COMMON.VALIDATION.REQUIRED' });
        required(schema.description, { message: 'COMMON.VALIDATION.REQUIRED' });
        disabled(schema.name, () => this.isDetails());
        disabled(schema.description, () => this.isDetails());
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
                    description: item.description,
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
        this.model.set({ name: '', description: '' });
        this.mode.set('create');
    }
}
