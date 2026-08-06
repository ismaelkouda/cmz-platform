import {
    Injectable,
    computed,
    effect,
    inject,
    signal,
    untracked,
} from '@angular/core';
import { disabled, form, required, validate } from '@angular/forms/signals';
import { ReportType, TelecomOperator } from '@cmz/shared-domain';
import { TeamsFindOneFacade } from '@cmz/team-organization-application';
import { FormMode } from '@cmz/shared-ui';

interface TeamsFormModel {
    name: string;
    description: string;
    reportTypes: ReportType[];
    operators: TelecomOperator[];
    /** Valeurs (`value`) des permissions cochées. */
    permissions: string[];
}

/**
 * Store de formulaire `teams` — Signal Forms. `reportTypes`/`operators`
 * validés via `validate()` (longueur > 0, même précédent que `technology`
 * sur `mobile-network` : `required()` seul ne rejette pas un tableau
 * vide). `permissions` reste optionnel (une équipe sans permission cochée
 * est valide). Les options de permission affichables (arbre aplati) ne
 * sont PAS gérées ici — elles dépendent du mode (création vs édition,
 * deux facades différentes) et sont résolues par le composant.
 */
@Injectable()
export class TeamsFormStore {
    private readonly findOne = inject(TeamsFindOneFacade);

    readonly mode = signal<FormMode>('create');
    readonly isDetails = computed(() => this.mode() === 'details');
    readonly loading = this.findOne.isLoading;
    readonly findOneItem = this.findOne.value;

    readonly model = signal<TeamsFormModel>({
        name: '',
        description: '',
        reportTypes: [],
        operators: [],
        permissions: [],
    });

    readonly form = form(this.model, (schema) => {
        required(schema.name, { message: 'COMMON.VALIDATION.REQUIRED' });
        required(schema.description, {
            message: 'COMMON.VALIDATION.REQUIRED',
        });
        validate(schema.reportTypes, (ctx) =>
            ctx.value().length > 0
                ? undefined
                : { kind: 'required', message: 'COMMON.VALIDATION.REQUIRED' }
        );
        validate(schema.operators, (ctx) =>
            ctx.value().length > 0
                ? undefined
                : { kind: 'required', message: 'COMMON.VALIDATION.REQUIRED' }
        );
        disabled(schema.name, () => this.isDetails());
        disabled(schema.description, () => this.isDetails());
        disabled(schema.reportTypes, () => this.isDetails());
        disabled(schema.operators, () => this.isDetails());
        disabled(schema.permissions, () => this.isDetails());
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
                    name: item.name ?? '',
                    description: item.description ?? '',
                    reportTypes: item.reportTypes,
                    operators: item.operators,
                    permissions: item.permissions
                        .filter((p) => p.checked)
                        .map((p) => p.value),
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

    toggleReportType(value: ReportType): void {
        const current = this.model().reportTypes;
        const next = current.includes(value)
            ? current.filter((v) => v !== value)
            : [...current, value];
        this.model.update((m) => ({ ...m, reportTypes: next }));
    }

    toggleOperator(value: TelecomOperator): void {
        const current = this.model().operators;
        const next = current.includes(value)
            ? current.filter((v) => v !== value)
            : [...current, value];
        this.model.update((m) => ({ ...m, operators: next }));
    }

    togglePermission(value: string): void {
        const current = this.model().permissions;
        const next = current.includes(value)
            ? current.filter((v) => v !== value)
            : [...current, value];
        this.model.update((m) => ({ ...m, permissions: next }));
    }

    reset(): void {
        this.model.set({
            name: '',
            description: '',
            reportTypes: [],
            operators: [],
            permissions: [],
        });
        this.mode.set('create');
    }
}
