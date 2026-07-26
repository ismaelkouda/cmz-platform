import {
    Injectable,
    computed,
    effect,
    inject,
    signal,
    untracked,
} from '@angular/core';
import { disabled, form, required } from '@angular/forms/signals';
import {
    DepartmentFindOneFacade,
    RegionSelectFacade,
} from '@cmz/administrative-boundary-application';
import { FormMode } from './form-mode.type';

interface DepartmentFormModel {
    code: string;
    name: string;
    description: string;
    populationSize: number | null;
    infrastructureCount: number | null;
    regionId: string;
}

/**
 * Store de formulaire `department` — porte en plus le select `regionId`
 * (source du cascade region → département → commune, cf.
 * `RegionSelectFacade`).
 */
@Injectable()
export class DepartmentFormStore {
    private readonly findOne = inject(DepartmentFindOneFacade);
    private readonly regionSelect = inject(RegionSelectFacade);

    readonly mode = signal<FormMode>('create');
    readonly isDetails = computed(() => this.mode() === 'details');
    readonly loading = this.findOne.isLoading;

    /** Options du select région, dérivées du cascade (chargé une fois). */
    readonly regionOptions = this.regionSelect.options;

    readonly model = signal<DepartmentFormModel>({
        code: '',
        name: '',
        description: '',
        populationSize: null,
        infrastructureCount: null,
        regionId: '',
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
        required(schema.regionId, { message: 'COMMON.VALIDATION.REQUIRED' });
        disabled(schema.code, () => this.isDetails());
        disabled(schema.name, () => this.isDetails());
        disabled(schema.description, () => this.isDetails());
        disabled(schema.populationSize, () => this.isDetails());
        disabled(schema.infrastructureCount, () => this.isDetails());
        disabled(schema.regionId, () => this.isDetails());
    });

    readonly isValid = computed(() => this.form().valid());

    constructor() {
        this.regionSelect.load();

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
                    regionId: item.region.id,
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
            regionId: '',
        });
        this.mode.set('create');
    }
}
