import {
    Injectable,
    computed,
    effect,
    inject,
    signal,
    untracked,
} from '@angular/core';
import { disabled, form, required, validate } from '@angular/forms/signals';
import {
    MessagingChannel,
    MessagingTarget,
    MessagingType,
} from '@cmz/communication-domain';
import { MessagingFindOneFacade } from '@cmz/communication-application';
import { RegionSelectFacade } from '@cmz/administrative-boundary-application';
import {
    DepartmentOption,
    MunicipalityOption,
} from '@cmz/administrative-boundary-domain';
import { FormMode } from '@cmz/shared-ui';

/** Miroir UI de `SMS_MAX_LENGTH` (domaine, `messaging-create.validator.ts`) — retour immédiat avant l'aller-retour serveur. */
const SMS_MAX_LENGTH = 160;

interface MessagingFormModel {
    type: MessagingType | '';
    targetType: MessagingTarget | '';
    reportId: string;
    region: string;
    department: string;
    municipality: string;
    channels: MessagingChannel[];
    subject: string;
    content: string;
}

function empty(): MessagingFormModel {
    return {
        type: '',
        targetType: '',
        reportId: '',
        region: '',
        department: '',
        municipality: '',
        channels: [],
        subject: '',
        content: '',
    };
}

/**
 * Store de formulaire `messaging` — Signal Forms. Combine deux patterns déjà
 * établis dans le monorepo : cascade région → département → commune
 * (`municipality-form.store.ts`, `RegionSelectFacade`, 3 niveaux ici — pas 2
 * — puisque `messaging` a besoin de la commune, pas seulement du
 * département) et `targetType` qui pilote un groupe de champs exclusif
 * (`reportId` vs `region`/`department`/`municipality`, même esprit que
 * `type` pilotant `image`/`video` dans `news-form.store.ts`). `channels` :
 * cases à cocher (`slide-form.store.ts`/`home-form.store.ts`). Règle
 * SMS/longueur dupliquée ici pour un retour immédiat, cf. `SMS_MAX_LENGTH`.
 */
@Injectable()
export class MessagingFormStore {
    private readonly findOne = inject(MessagingFindOneFacade);
    private readonly regionSelect = inject(RegionSelectFacade);

    readonly mode = signal<FormMode>('create');
    readonly isDetails = computed(() => this.mode() === 'details');
    readonly loading = this.findOne.isLoading;

    readonly regionOptions = this.regionSelect.options;

    readonly model = signal<MessagingFormModel>(empty());

    readonly isReportTarget = computed(
        () => this.model().targetType === MessagingTarget.REPORT
    );
    readonly isAreaTarget = computed(
        () => this.model().targetType === MessagingTarget.AREA
    );

    /** Départements de la région sélectionnée (cascade, pas de rappel réseau). */
    readonly departmentOptions = computed<readonly DepartmentOption[]>(() => {
        const region = this.model().region;
        if (!region) {
            return [];
        }
        return (
            this.regionOptions().find((r) => r.id === region)?.departments ?? []
        );
    });

    /** Communes du département sélectionné (cascade, pas de rappel réseau). */
    readonly municipalityOptions = computed<readonly MunicipalityOption[]>(
        () => {
            const department = this.model().department;
            if (!department) {
                return [];
            }
            return (
                this.departmentOptions().find((d) => d.id === department)
                    ?.municipalities ?? []
            );
        }
    );

    readonly form = form(this.model, (schema) => {
        required(schema.type, { message: 'COMMON.VALIDATION.REQUIRED' });
        required(schema.targetType, {
            message: 'COMMON.VALIDATION.REQUIRED',
        });
        required(schema.subject, { message: 'COMMON.VALIDATION.REQUIRED' });
        required(schema.content, { message: 'COMMON.VALIDATION.REQUIRED' });
        validate(schema.reportId, (ctx) =>
            ctx.valueOf(schema.targetType) === MessagingTarget.REPORT &&
            !ctx.value()
                ? { kind: 'required', message: 'COMMON.VALIDATION.REQUIRED' }
                : undefined
        );
        validate(schema.region, (ctx) =>
            ctx.valueOf(schema.targetType) === MessagingTarget.AREA &&
            !ctx.value()
                ? { kind: 'required', message: 'COMMON.VALIDATION.REQUIRED' }
                : undefined
        );
        validate(schema.channels, (ctx) =>
            ctx.value().length > 0
                ? undefined
                : { kind: 'required', message: 'COMMON.VALIDATION.REQUIRED' }
        );
        validate(schema.content, (ctx) => {
            const channels = ctx.valueOf(schema.channels);
            return channels.includes(MessagingChannel.SMS) &&
                ctx.value().length > SMS_MAX_LENGTH
                ? {
                      kind: 'maxLength',
                      message: 'COMMUNICATION.MESSAGING.FORM.SMS_TOO_LONG',
                  }
                : undefined;
        });
        disabled(schema.type, () => this.isDetails());
        disabled(schema.targetType, () => this.isDetails());
        disabled(
            schema.reportId,
            () => this.isDetails() || !this.isReportTarget()
        );
        disabled(schema.region, () => this.isDetails() || !this.isAreaTarget());
        disabled(
            schema.department,
            () =>
                this.isDetails() ||
                !this.isAreaTarget() ||
                !this.departmentOptions().length
        );
        disabled(
            schema.municipality,
            () =>
                this.isDetails() ||
                !this.isAreaTarget() ||
                !this.municipalityOptions().length
        );
        disabled(schema.channels, () => this.isDetails());
        disabled(schema.subject, () => this.isDetails());
        disabled(schema.content, () => this.isDetails());
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
                    type: item.type,
                    targetType: item.targetType,
                    reportId: item.reportId,
                    region: item.region,
                    department: item.department,
                    municipality: item.municipality,
                    channels: item.channels,
                    subject: item.subject,
                    content: item.content,
                })
            );
        });
    }

    /** Bascule `reportId`/`region` en exclusif : vide le groupe non pertinent. */
    setTargetType(targetType: MessagingTarget): void {
        this.model.update((m) => ({
            ...m,
            targetType,
            reportId: targetType === MessagingTarget.REPORT ? m.reportId : '',
            region: targetType === MessagingTarget.AREA ? m.region : '',
            department: targetType === MessagingTarget.AREA ? m.department : '',
            municipality:
                targetType === MessagingTarget.AREA ? m.municipality : '',
        }));
    }

    /** Réinitialise `department`/`municipality` quand la région change (cascade). */
    onRegionChange(region: string): void {
        this.model.update((m) => ({
            ...m,
            region,
            department: '',
            municipality: '',
        }));
    }

    /** Réinitialise `municipality` quand le département change (cascade). */
    onDepartmentChange(department: string): void {
        this.model.update((m) => ({ ...m, department, municipality: '' }));
    }

    toggleChannel(value: MessagingChannel): void {
        const current = this.model().channels;
        const next = current.includes(value)
            ? current.filter((v) => v !== value)
            : [...current, value];
        this.model.update((m) => ({ ...m, channels: next }));
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
        this.model.set(empty());
        this.mode.set('create');
    }
}
