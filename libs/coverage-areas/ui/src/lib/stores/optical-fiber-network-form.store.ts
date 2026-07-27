import {
    Injectable,
    computed,
    effect,
    inject,
    signal,
    untracked,
} from '@angular/core';
import { disabled, form, required, validate } from '@angular/forms/signals';
import { OpticalFiberNetworkFindOneFacade } from '@cmz/coverage-areas-application';
import { FiberType, Operator } from '@cmz/coverage-areas-domain';
import { FormMode } from './form-mode.type';

interface OpticalFiberNetworkFormModel {
    name: string;
    operator: Operator | '';
    fiberConstructorId: string;
    type: FiberType | '';
    geomFile: File | null;
}

/**
 * Store de formulaire `optical-fiber-network` — **Signal Forms (Angular 22)**.
 * `geomFile` (tracé GeoJSON de la fibre) est **requis seulement en création**
 * (fidèle au source : ré-uploader n'est pas obligatoire pour une simple
 * mise à jour) — validé via `validate()` conditionnel sur `mode()`, pas
 * `required()` seul qui ne saurait pas être conditionnel. Pas de champ
 * `[formField]` pour `geomFile` : un `<input type="file">` natif ne se
 * binde pas via Signal Forms, le composant appelle `setGeomFile()`
 * directement (même logique que `toggleTechnology()` côté `mobile-network`).
 *
 * **Hors périmètre (décision assumée)** : le source affiche un aperçu
 * cartographique interactif du tracé (`GeojsonLineMapComponent`, dépendance
 * Leaflet dédiée). Pas encore de brique carto dans ce socle — non construit
 * ici, remplacé par une simple mention textuelle du fichier existant en
 * mode édition/détails. À traiter comme un chantier `shared/map` à part
 * entière si le besoin redevient prioritaire (même logique que la tab
 * Historique, cf. plan `site-group`).
 */
@Injectable()
export class OpticalFiberNetworkFormStore {
    private readonly findOne = inject(OpticalFiberNetworkFindOneFacade);

    readonly mode = signal<FormMode>('create');
    readonly isDetails = computed(() => this.mode() === 'details');
    readonly isCreate = computed(() => this.mode() === 'create');
    readonly loading = this.findOne.isLoading;
    readonly existingGeomUrl = signal<string | null>(null);

    readonly model = signal<OpticalFiberNetworkFormModel>({
        name: '',
        operator: '',
        fiberConstructorId: '',
        type: '',
        geomFile: null,
    });

    readonly form = form(this.model, (schema) => {
        required(schema.name, { message: 'COMMON.VALIDATION.REQUIRED' });
        required(schema.operator, { message: 'COMMON.VALIDATION.REQUIRED' });
        required(schema.fiberConstructorId, {
            message: 'COMMON.VALIDATION.REQUIRED',
        });
        required(schema.type, { message: 'COMMON.VALIDATION.REQUIRED' });
        validate(schema.geomFile, (ctx) =>
            this.isCreate() && !ctx.value()
                ? { kind: 'required', message: 'COMMON.VALIDATION.REQUIRED' }
                : undefined
        );
        disabled(schema.name, () => this.isDetails());
        disabled(schema.operator, () => this.isDetails());
        disabled(schema.fiberConstructorId, () => this.isDetails());
        disabled(schema.type, () => this.isDetails());
        disabled(schema.geomFile, () => this.isDetails());
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
                    fiberConstructorId: item.fiberConstructorId,
                    type: item.type,
                    geomFile: null,
                })
            );
            this.existingGeomUrl.set(item.geomUrl ?? null);
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

    setGeomFile(file: File | null): void {
        this.model.update((m) => ({ ...m, geomFile: file }));
    }

    reset(): void {
        this.model.set({
            name: '',
            operator: '',
            fiberConstructorId: '',
            type: '',
            geomFile: null,
        });
        this.existingGeomUrl.set(null);
        this.mode.set('create');
    }
}
