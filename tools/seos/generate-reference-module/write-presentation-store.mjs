/**
 * SEOS generate-reference-module — writePresentationStore
 * Extrait mécanique du monolithe (plafond 800 l. CI).
 * Corps non-indenté volontairement : préserve les littéraux de templates.
 */

export function writePresentationStore(ctx) {
    const {
        w,
        E,
        Cap,
        MODULE,
        MODULE_UPPER,
        ENTITY_UPPER,
        ModuleCap,
        FIELD_DEFS,
        FIELD_NAMES,
        REQUIRED_FIELDS,
        EXTRA_FILTERS,
        API_BASE,
        BASE,
        crudOps,
        toSnake,
        pascalCase,
        upperSnake,
    } = ctx;

    // ---------------------------------------------------------------------
    // PRESENTATION — store (controles + etat reactif)
    // ---------------------------------------------------------------------

    // Les interfaces de controle vivent directement sous presentation/store (pas de
    // domain/controls — dossier absent du module de reference reel, verifie sur
    // infrastructure ET infrastructure-type). Le Store construit un vrai FormGroup
    // reactif (FormBuilder), pas un simple signal opaque : c'est ce qui permet a la
    // regle 4 de check-semantics.js (Validators.required du formulaire vs validator
    // du domaine) d'avoir reellement quelque chose a comparer sur un module genere.
    w(
        `presentation/constants/${E}/${E}-filter-keys.constant.ts`,
        `
export const ${ENTITY_UPPER}_FILTER_KEYS = {
    SEARCH: 'search',
${EXTRA_FILTERS.map((f) => `    ${toSnake(f).toUpperCase()}: '${f}',`).join('\n')}
    START_DATE: 'startDate',
    END_DATE: 'endDate',
} as const;
`
    );
    w(
        `presentation/store/${E}/${E}-filter.control.ts`,
        `
import { FormControl } from '@angular/forms';
import { ${ENTITY_UPPER}_FILTER_KEYS } from '${BASE}/presentation/constants/${E}/${E}-filter-keys.constant';

export interface ${Cap}FilterControl {
    [${ENTITY_UPPER}_FILTER_KEYS.SEARCH]: FormControl<string | undefined>;
${EXTRA_FILTERS.map((f) => `    [${ENTITY_UPPER}_FILTER_KEYS.${toSnake(f).toUpperCase()}]: FormControl<string | undefined>;`).join('\n')}
    [${ENTITY_UPPER}_FILTER_KEYS.START_DATE]: FormControl<Date | undefined>;
    [${ENTITY_UPPER}_FILTER_KEYS.END_DATE]: FormControl<Date | undefined>;
}
`
    );
    w(
        `presentation/store/${E}/${E}-filter.store.ts`,
        `
import { Injectable, inject } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { ${Cap}FilterDto } from '${BASE}/application/dto/${E}/${E}-filter.dto';
import { ${Cap}FilterControl } from '${BASE}/presentation/store/${E}/${E}-filter.control';
import { ${ENTITY_UPPER}_FILTER_KEYS } from '${BASE}/presentation/constants/${E}/${E}-filter-keys.constant';

@Injectable()
export class ${Cap}FilterStore {
    private readonly fb = inject(FormBuilder);

    readonly form: FormGroup<${Cap}FilterControl> =
        this.fb.group<${Cap}FilterControl>({
            [${ENTITY_UPPER}_FILTER_KEYS.SEARCH]: new FormControl<
                string | undefined
            >(undefined, {
                nonNullable: true,
            }),
${EXTRA_FILTERS.map(
    (
        f
    ) => `            [${ENTITY_UPPER}_FILTER_KEYS.${toSnake(f).toUpperCase()}]: new FormControl<
                string | undefined
            >(undefined, {
                nonNullable: true,
            }),`
).join('\n')}
            [${ENTITY_UPPER}_FILTER_KEYS.START_DATE]: new FormControl<
                Date | undefined
            >(undefined, {
                nonNullable: true,
            }),
            [${ENTITY_UPPER}_FILTER_KEYS.END_DATE]: new FormControl<
                Date | undefined
            >(undefined, {
                nonNullable: true,
            }),
        });

    reset(): void {
        this.form.reset();
    }

    get value(): ${Cap}FilterDto {
        const raw = this.form.getRawValue();
        return {
            [${ENTITY_UPPER}_FILTER_KEYS.SEARCH]:
                raw[${ENTITY_UPPER}_FILTER_KEYS.SEARCH] || undefined,
${EXTRA_FILTERS.map(
    (
        f
    ) => `            [${ENTITY_UPPER}_FILTER_KEYS.${toSnake(f).toUpperCase()}]:
                raw[${ENTITY_UPPER}_FILTER_KEYS.${toSnake(f).toUpperCase()}] || undefined,`
).join('\n')}
            [${ENTITY_UPPER}_FILTER_KEYS.START_DATE]:
                raw[${ENTITY_UPPER}_FILTER_KEYS.START_DATE] || undefined,
            [${ENTITY_UPPER}_FILTER_KEYS.END_DATE]:
                raw[${ENTITY_UPPER}_FILTER_KEYS.END_DATE] || undefined,
        };
    }
}
`
    );
    w(
        `presentation/constants/${E}/${E}-form-keys.constant.ts`,
        `
export const ${ENTITY_UPPER}_FORM_KEYS = {
${FIELD_NAMES.map(
    (f) =>
        `    ${f
            .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
            .replace(/-/g, '_')
            .toUpperCase()}: '${f}',`
).join('\n')}
} as const;
`
    );
    // presentation/constants/${E}/${E}-form-error-messages.constant.ts — parite STRUCTURELLE
    // uniquement avec action-request (design_decisions_v19.form_error_messages_pause) : le
    // module reel administrative-infrastructure/infrastructure a DEJA un mecanisme d'erreur
    // reel et fonctionnel (FormValidationService, generique par type d'erreur Angular), que
    // l'architecte a explicitement choisi de NE PAS toucher (decision : "ne rien changer sur
    // le reel, parite generateur/schema seulement"). Ce fichier n'est donc PAS reference par
    // ${Cap}FormStore ni ${Cap}FormComponent dans ce generateur (aucun cablage, contrairement
    // a action-request ou le mecanisme equivalent est reellement branche) — il existe
    // uniquement pour que ce module synthetique ait la meme silhouette de fichiers que
    // action-request lorsqu'on compare les deux schemas, jamais pour etre consomme.
    w(
        `presentation/constants/${E}/${E}-form-error-messages.constant.ts`,
        `
import { ${ENTITY_UPPER}_FORM_KEYS } from '${BASE}/presentation/constants/${E}/${E}-form-keys.constant';

export const ${ENTITY_UPPER}_FORM_ERROR_MESSAGES = {
${REQUIRED_FIELDS.map((f) => {
    const k = f
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .replace(/-/g, '_')
        .toUpperCase();
    return `    [${ENTITY_UPPER}_FORM_KEYS.${k}]: {
        required: '${MODULE_UPPER}.${ENTITY_UPPER}.FORM.ERROR.${k}_REQUIRE',
    },`;
}).join('\n')}
} as const;
`
    );
    w(
        `presentation/store/${E}/${E}-form.control.ts`,
        `
import { FormControl } from '@angular/forms';
import { ${ENTITY_UPPER}_FORM_KEYS } from '${BASE}/presentation/constants/${E}/${E}-form-keys.constant';

export interface ${Cap}FormControl {
${FIELD_NAMES.map((f) => {
    const k = f
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .replace(/-/g, '_')
        .toUpperCase();
    return `    [${ENTITY_UPPER}_FORM_KEYS.${k}]: FormControl<string | undefined>;`;
}).join('\n')}
}
`
    );
    w(
        `presentation/store/${E}/${E}-form.store.ts`,
        `
import {
    Injectable,
    inject,
    signal,
    computed,
    effect,
    untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
    FormBuilder,
    FormControl,
    FormGroup,
    Validators,
} from '@angular/forms';
import { ${Cap}FindOneFacade } from '${BASE}/application/services/${E}/${E}-find-one.facade';
import { ${Cap}FormControl } from '${BASE}/presentation/store/${E}/${E}-form.control';
import { FormValidators } from '${BASE}/presentation/constants/form-validators.constants';
import { ${ENTITY_UPPER}_FORM_KEYS } from '${BASE}/presentation/constants/${E}/${E}-form-keys.constant';
import { startWith } from 'rxjs';

type ${Cap}FormMode = 'create' | 'edit' | 'details';

@Injectable()
export class ${Cap}FormStore {
    private readonly fb = inject(FormBuilder);
    private readonly findOneFacade = inject(${Cap}FindOneFacade);
    readonly VALIDATION = FormValidators;

    readonly form = this.createForm();
    readonly mode = signal<${Cap}FormMode>('create');
    readonly isCreateMode = computed(() => this.mode() === 'create');
    readonly isEditMode = computed(() => this.mode() === 'edit');
    readonly isDetailsMode = computed(() => this.mode() === 'details');

    readonly loading = computed(() => this.findOneFacade.loading());

    readonly status = toSignal(
        this.form.statusChanges.pipe(startWith(this.form.status)),
        {
            initialValue: this.form.status,
        }
    );
    readonly isValid = computed(() => this.status() === 'VALID');

    private readonly item = this.findOneFacade.items;

    constructor() {
        this.initializeDetailsModeEffect();
    }

    private createForm(): FormGroup<${Cap}FormControl> {
        return this.fb.nonNullable.group<${Cap}FormControl>({
${FIELD_DEFS.map((f) => {
    const k = f.name
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .replace(/-/g, '_')
        .toUpperCase();
    const validators = f.required ? '[Validators.required]' : '[]';
    return `            [${ENTITY_UPPER}_FORM_KEYS.${k}]: new FormControl<
                string | undefined
            >(undefined, {
                nonNullable: true,
                validators: ${validators},
            }),`;
}).join('\n')}
        });
    }

    private initializeDetailsModeEffect(): void {
        effect(() => {
            const item = this.item();
            if (this.isCreateMode() || !item) {
                return;
            }
            const patch = {
${FIELD_NAMES.map((f) => `                ${f}: item.${f},`).join('\n')}
            };
            const details = this.isDetailsMode();
            untracked(() => {
                queueMicrotask(() => {
                    this.form.patchValue(patch);
                    if (details) {
                        this.form.disable({ emitEvent: false });
                    }
                });
            });
        });
    }

    private load(uniqId: string): void {
        this.findOneFacade.read({ uniqId }, { forceRefresh: true });
    }

    setMode(uniqId: string | null, mode: ${Cap}FormMode): void {
        this.mode.set(mode);
        const handlers: Record<${Cap}FormMode, () => void> = {
            create: () => {
                this.reset();
                this.findOneFacade.reset();
            },
            edit: () => uniqId && this.load(uniqId),
            details: () => uniqId && this.load(uniqId),
        };
        handlers[mode]();
    }

    reset(): void {
        this.form.enable({ emitEvent: false });
        this.form.reset(
            {
${FIELD_NAMES.map((f) => {
    const k = f
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .replace(/-/g, '_')
        .toUpperCase();
    return `                [${ENTITY_UPPER}_FORM_KEYS.${k}]: undefined,`;
}).join('\n')}
            },
            { emitEvent: true }
        );
        this.mode.set('create');
        this.form.markAsPristine();
        this.form.markAsUntouched();
    }
}
`
    );
}
