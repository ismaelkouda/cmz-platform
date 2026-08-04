import {
    Injectable,
    computed,
    effect,
    inject,
    signal,
    untracked,
} from '@angular/core';
import { disabled, form, required, validate } from '@angular/forms/signals';
import { MobileNetworkFindOneFacade } from '@cmz/coverage-areas-application';
import { Operator, Technology } from '@cmz/coverage-areas-domain';
import { FormMode } from '@cmz/shared-ui';

interface MobileNetworkFormModel {
    siteId: string;
    siteName: string;
    infrastructureType: string;
    towerTypeId: string;
    towerSize: number | null;
    technology: Technology[];
    operator: Operator | '';
    radius: number | null;
}

/**
 * Store de formulaire `mobile-network` — **Signal Forms (Angular 22)**.
 * `technology` (multi-valeur) est validé par `validate()` (longueur > 0) car
 * `required()` seul ne rejette pas un tableau vide (vide reste un objet
 * "présent"). `infrastructureType` porte en réalité l'uniqId d'un
 * `site-group` sélectionné (cf. commentaire sur `MobileNetworkFindOneProps`
 * en domaine) — nom conservé pour fidélité au contrat wire.
 */
@Injectable()
export class MobileNetworkFormStore {
    private readonly findOne = inject(MobileNetworkFindOneFacade);

    readonly mode = signal<FormMode>('create');
    readonly isDetails = computed(() => this.mode() === 'details');
    readonly loading = this.findOne.isLoading;

    readonly model = signal<MobileNetworkFormModel>({
        siteId: '',
        siteName: '',
        infrastructureType: '',
        towerTypeId: '',
        towerSize: null,
        technology: [],
        operator: '',
        radius: null,
    });

    readonly form = form(this.model, (schema) => {
        required(schema.siteId, { message: 'COMMON.VALIDATION.REQUIRED' });
        required(schema.siteName, { message: 'COMMON.VALIDATION.REQUIRED' });
        required(schema.infrastructureType, {
            message: 'COMMON.VALIDATION.REQUIRED',
        });
        required(schema.towerTypeId, {
            message: 'COMMON.VALIDATION.REQUIRED',
        });
        required(schema.towerSize, { message: 'COMMON.VALIDATION.REQUIRED' });
        required(schema.operator, { message: 'COMMON.VALIDATION.REQUIRED' });
        validate(schema.technology, (ctx) =>
            ctx.value().length > 0
                ? undefined
                : { kind: 'required', message: 'COMMON.VALIDATION.REQUIRED' }
        );
        disabled(schema.siteId, () => this.isDetails());
        disabled(schema.siteName, () => this.isDetails());
        disabled(schema.infrastructureType, () => this.isDetails());
        disabled(schema.towerTypeId, () => this.isDetails());
        disabled(schema.towerSize, () => this.isDetails());
        disabled(schema.technology, () => this.isDetails());
        disabled(schema.operator, () => this.isDetails());
        disabled(schema.radius, () => this.isDetails());
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
                    siteId: item.siteId,
                    siteName: item.siteName,
                    infrastructureType: item.infrastructureType,
                    towerTypeId: item.towerTypeId,
                    towerSize: item.towerSize,
                    technology: item.technology,
                    operator: item.operator,
                    radius: item.radius ?? null,
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

    toggleTechnology(value: Technology): void {
        const current = this.model().technology;
        const next = current.includes(value)
            ? current.filter((t) => t !== value)
            : [...current, value];
        this.model.update((m) => ({ ...m, technology: next }));
    }

    reset(): void {
        this.model.set({
            siteId: '',
            siteName: '',
            infrastructureType: '',
            towerTypeId: '',
            towerSize: null,
            technology: [],
            operator: '',
            radius: null,
        });
        this.mode.set('create');
    }
}
