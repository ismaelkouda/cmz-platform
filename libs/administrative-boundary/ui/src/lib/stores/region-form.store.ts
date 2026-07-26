import {
    Injectable,
    computed,
    effect,
    inject,
    signal,
    untracked,
} from '@angular/core';
import { disabled, form, required } from '@angular/forms/signals';
import { RegionFindOneFacade } from '@cmz/administrative-boundary-application';
import { FormMode } from './form-mode.type';

interface RegionFormModel {
    code: string;
    name: string;
    description: string;
    populationSize: number | null;
    infrastructureCount: number | null;
}

@Injectable()
export class RegionFormStore {
    private readonly findOne = inject(RegionFindOneFacade);

    readonly mode = signal<FormMode>('create');
    readonly isDetails = computed(() => this.mode() === 'details');
    readonly loading = this.findOne.isLoading;

    readonly model = signal<RegionFormModel>({
        code: '',
        name: '',
        description: '',
        populationSize: null,
        infrastructureCount: null,
    });

    readonly form = form(this.model, (schema) => {
        required(schema.code, { message: 'COMMON.VALIDATION.REQUIRED' });
        required(schema.name, { message: 'COMMON.VALIDATION.REQUIRED' });
        required(schema.populationSize, {
            message: 'COMMON.VALIDATION.REQUIRED',
        });
        required(schema.infrastructureCount, {
            message: 'COMMON.VALIDATION.REQUIRED',
        });
        disabled(schema.code, () => this.isDetails());
        disabled(schema.name, () => this.isDetails());
        disabled(schema.description, () => this.isDetails());
        disabled(schema.populationSize, () => this.isDetails());
        disabled(schema.infrastructureCount, () => this.isDetails());
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
                    code: item.code,
                    name: item.name,
                    description: item.description,
                    populationSize: item.populationSize,
                    infrastructureCount: item.infrastructureCount,
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
            code: '',
            name: '',
            description: '',
            populationSize: null,
            infrastructureCount: null,
        });
        this.mode.set('create');
    }
}
