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
    InfrastructureFindOneFacade,
    InfrastructureTypeSelectFacade,
} from '@cmz/administrative-infrastructure-application';

import { FormMode } from './form-mode.type';

interface InfrastructureFormModel {
    name: string;
    type: string;
    description: string;
    latitude: string;
    longitude: string;
}

const REQUIRED = { message: 'COMMON.VALIDATION.REQUIRED' };

/**
 * Store de formulaire `infrastructure` — **Signal Forms**. Position saisie en
 * latitude/longitude (le sélecteur cartographique du source est un enhancement
 * futur, hors périmètre). Le select de types vient de
 * `InfrastructureTypeSelectFacade`. Hydratation edit/details via `effect` sur la
 * façade find-one (position `CoordinatesProps` → lat/long).
 */
@Injectable()
export class InfrastructureFormStore {
    private readonly findOne = inject(InfrastructureFindOneFacade);
    readonly typeSelect = inject(InfrastructureTypeSelectFacade);

    readonly mode = signal<FormMode>('create');
    readonly isDetails = computed(() => this.mode() === 'details');
    readonly loading = this.findOne.isLoading;

    readonly model = signal<InfrastructureFormModel>({
        name: '',
        type: '',
        description: '',
        latitude: '',
        longitude: '',
    });

    readonly form = form(this.model, (schema) => {
        required(schema.name, REQUIRED);
        required(schema.type, REQUIRED);
        required(schema.description, REQUIRED);
        required(schema.latitude, REQUIRED);
        required(schema.longitude, REQUIRED);
        disabled(schema.name, () => this.isDetails());
        disabled(schema.type, () => this.isDetails());
        disabled(schema.description, () => this.isDetails());
        disabled(schema.latitude, () => this.isDetails());
        disabled(schema.longitude, () => this.isDetails());
    });

    readonly isValid = computed(() => this.form().valid());

    constructor() {
        this.typeSelect.load();
        effect(() => {
            const item = this.findOne.value();
            if (this.mode() === 'create' || !item) {
                return;
            }
            untracked(() =>
                this.model.set({
                    name: item.name,
                    type: item.type,
                    description: item.description,
                    latitude: String(item.position.latitude),
                    longitude: String(item.position.longitude),
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
            type: '',
            description: '',
            latitude: '',
            longitude: '',
        });
        this.mode.set('create');
    }
}
