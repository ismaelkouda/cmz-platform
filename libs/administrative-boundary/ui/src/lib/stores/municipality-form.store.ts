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
    MunicipalityFindOneFacade,
    RegionSelectFacade,
} from '@cmz/administrative-boundary-application';
import { DepartmentOption } from '@cmz/administrative-boundary-domain';
import { FormMode } from './form-mode.type';

interface MunicipalityFormModel {
    code: string;
    name: string;
    description: string;
    populationSize: number | null;
    infrastructureCount: number | null;
    regionId: string;
    departmentId: string;
}

/**
 * Store de formulaire `municipality` — select **dépendant** : la liste
 * d'options `departmentId` est `computed()` sur le `regionId` choisi (cascade
 * porté par `RegionOption.departments`, cf. variante « select dépendant »
 * instruite dans l'archétype).
 */
@Injectable()
export class MunicipalityFormStore {
    private readonly findOne = inject(MunicipalityFindOneFacade);
    private readonly regionSelect = inject(RegionSelectFacade);

    readonly mode = signal<FormMode>('create');
    readonly isDetails = computed(() => this.mode() === 'details');
    readonly loading = this.findOne.isLoading;

    readonly regionOptions = this.regionSelect.options;

    readonly model = signal<MunicipalityFormModel>({
        code: '',
        name: '',
        description: '',
        populationSize: null,
        infrastructureCount: null,
        regionId: '',
        departmentId: '',
    });

    /** Départements de la région sélectionnée (cascade, pas de rappel réseau). */
    readonly departmentOptions = computed<readonly DepartmentOption[]>(() => {
        const regionId = this.model().regionId;
        if (!regionId) {
            return [];
        }
        const region = this.regionOptions().find((r) => r.id === regionId);
        return region?.departments ?? [];
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
        required(schema.departmentId, {
            message: 'COMMON.VALIDATION.REQUIRED',
        });
        disabled(schema.code, () => this.isDetails());
        disabled(schema.name, () => this.isDetails());
        disabled(schema.description, () => this.isDetails());
        disabled(schema.populationSize, () => this.isDetails());
        disabled(schema.infrastructureCount, () => this.isDetails());
        disabled(schema.regionId, () => this.isDetails());
        disabled(schema.departmentId, () => this.isDetails());
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
                    departmentId: item.department.id,
                })
            );
        });
    }

    /** Réinitialise `departmentId` quand la région change (cascade). */
    onRegionChange(regionId: string): void {
        this.model.update((m) => ({ ...m, regionId, departmentId: '' }));
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
            departmentId: '',
        });
        this.mode.set('create');
    }
}
