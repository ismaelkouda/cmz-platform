import { Injectable, computed, inject, signal } from '@angular/core';
import { disabled, form, required, validate } from '@angular/forms/signals';
import {
    TasksActionsProcessingFacade,
    TasksActionsTypeProcessingFacade,
} from '@cmz/processing-application';
import {
    TasksActionsProcessingConformity,
    TasksActionsProcessingEntity,
} from '@cmz/processing-domain';
import { TelecomOperator } from '@cmz/shared-domain';
import { TELECOM_OPERATOR_OPTIONS } from '@cmz/shared-ui';
import type { TasksActionsDialogMode } from '../features/tasks-actions-processing-form-dialog.component';

interface TasksActionsProcessingFormModel {
    type: string;
    operator: string;
    date: string;
    description: string;
    shouldNotifyUser: boolean;
    isConform: TasksActionsProcessingConformity | '';
}

function empty(date = ''): TasksActionsProcessingFormModel {
    return {
        type: '',
        operator: '',
        date,
        description: '',
        shouldNotifyUser: false,
        isConform: '',
    };
}

/**
 * Mirror du `maxlength="255"` du template original (`ReactiveFormsModule`
 * autorisait l'attribut natif directement sur `formControlName`). En Signal
 * Forms, `[formField]` interdit l'attribut `maxlength` natif (NG8022 —
 * "Setting the 'maxlength' attribute is not allowed on nodes using the
 * '[formField]' directive"), donc la même contrainte est réexprimée en
 * `validate()` déclaratif (aucun validateur domaine n'impose cette limite ;
 * c'est une garde UX pure, préservée telle quelle).
 */
const DESCRIPTION_MAX_LENGTH = 255;

function toLocalInput(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Store de formulaire `tasks-actions-processing` — Signal Forms (P2-1).
 * Migré depuis `ReactiveFormsModule`/`FormGroup` : mêmes règles (tous les
 * champs requis sauf `shouldNotifyUser`, formulaire désactivé en mode
 * `view` ou pendant une action en cours), même cascade `type` → `operator`
 * (change de type = reset de l'opérateur, options filtrées par le type
 * sélectionné — pattern déjà établi par `messaging-form.store.ts` pour la
 * cascade région → département → commune).
 */
@Injectable()
export class TasksActionsProcessingFormStore {
    readonly actionsFacade = inject(TasksActionsProcessingFacade);
    private readonly typesFacade = inject(TasksActionsTypeProcessingFacade);

    readonly mode = signal<TasksActionsDialogMode>('create');
    readonly isView = computed(() => this.mode() === 'view');
    readonly isLoading = computed(
        () => this.actionsFacade.actionState() === 'loading'
    );

    readonly model = signal<TasksActionsProcessingFormModel>(empty());

    readonly typeOptions = computed(() =>
        this.typesFacade.options().map((item) => ({
            value: item.value,
            label: item.label,
        }))
    );

    readonly operatorOptions = computed(() => {
        const selected = this.typesFacade
            .options()
            .find((item) => item.value === this.model().type);
        const allowed = selected?.operators ?? [];
        return TELECOM_OPERATOR_OPTIONS.filter((opt) =>
            allowed.length > 0
                ? allowed.includes(opt.value as TelecomOperator)
                : true
        );
    });

    readonly form = form(this.model, (schema) => {
        required(schema.type, { message: 'COMMON.VALIDATION.REQUIRED' });
        required(schema.operator, { message: 'COMMON.VALIDATION.REQUIRED' });
        required(schema.date, { message: 'COMMON.VALIDATION.REQUIRED' });
        required(schema.description, {
            message: 'COMMON.VALIDATION.REQUIRED',
        });
        validate(schema.description, (ctx) =>
            ctx.value().length > DESCRIPTION_MAX_LENGTH
                ? {
                      kind: 'maxLength',
                      message: 'COMMON.VALIDATION.MAX_LENGTH',
                  }
                : undefined
        );
        required(schema.isConform, { message: 'COMMON.VALIDATION.REQUIRED' });

        disabled(schema.type, () => this.isView() || this.isLoading());
        disabled(schema.operator, () => this.isView() || this.isLoading());
        disabled(schema.date, () => this.isView() || this.isLoading());
        disabled(schema.description, () => this.isView() || this.isLoading());
        disabled(
            schema.shouldNotifyUser,
            () => this.isView() || this.isLoading()
        );
        disabled(schema.isConform, () => this.isView() || this.isLoading());
    });

    readonly isValid = computed(() => this.form().valid());

    /** Bascule `type` : réinitialise `operator` (cascade, pas de rappel réseau). */
    onTypeChange(type: string): void {
        this.model.update((m) => ({ ...m, type, operator: '' }));
    }

    /** Recharge les types disponibles pour le signalement (délégation, cf. composant original). */
    loadTypes(reportUniqId: string): void {
        this.typesFacade.loadTypes(reportUniqId, { forceRefresh: true });
    }

    /** Ouverture dialog : mode `create` → modèle vide (date = maintenant) ; sinon hydrate depuis `item`. */
    open(mode: TasksActionsDialogMode, item: TasksActionsProcessingEntity | null): void {
        this.mode.set(mode);
        if (!item || mode === 'create') {
            this.model.set(empty(toLocalInput(new Date())));
            return;
        }
        this.model.set({
            type: item.code,
            operator: item.operators[0] ?? '',
            date: toLocalInput(item.date),
            description: item.description,
            shouldNotifyUser: item.shouldNotifyUser,
            isConform: item.isConform,
        });
    }

    reset(): void {
        this.model.set(empty());
        this.mode.set('create');
    }
}
