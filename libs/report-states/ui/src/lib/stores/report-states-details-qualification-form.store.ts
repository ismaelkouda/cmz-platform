import { Injectable, computed, signal } from '@angular/core';
import { disabled, form, required, validate } from '@angular/forms/signals';
import {
    ReportStatesDetailsEntity,
    ReportStatesDetailsQualificationContract,
    ReportStatesDetailsQualificationEditFields,
} from '@cmz/report-states-domain';

const Q = 'REPORT_STATES.DETAILS.QUALIFICATION';

interface QualificationFormModel {
    decision: 'accepted' | 'rejected' | '';
    approvalType: string;
    callbackType: string;
    reason: string;
    comment: string;
    latitude: number | null;
    longitude: number | null;
    locationName: string;
    reportType: string;
    operators: string[];
    description: string;
    placeDescription: string;
    placePhotoUrl: string;
    placePhotoFile: File | null;
}

function empty(): QualificationFormModel {
    return {
        decision: '',
        approvalType: 'view',
        callbackType: '',
        reason: '',
        comment: '',
        latitude: null,
        longitude: null,
        locationName: '',
        reportType: '',
        operators: [],
        description: '',
        placeDescription: '',
        placePhotoUrl: '',
        placePhotoFile: null,
    };
}

/** `approvalType` n'affiche les champs d'édition que si `decision` est `accepted` — même règle en lecture (`showEditFields`) et en validation. */
function isEditFieldsRequired(decision: string, approvalType: string): boolean {
    return (
        decision === 'accepted' &&
        (approvalType === 'edit' || approvalType === 'callback')
    );
}

/**
 * Store de formulaire `report-states-details-qualification` — Signal Forms.
 *
 * T27 (`docs/architecture/taches-restantes.md`) : remplace l'ancien duo
 * `ReportStatesDetailsQualificationFormComponent` (parent, `FormBuilder` +
 * bascule impérative de validateurs via `syncValidators`/
 * `syncCallbackValidators`/`syncEditValidators`) + `ReportStatesDetails
 * EditFieldsComponent` (enfant recevant un `FormGroup` en `@Input`) — plus
 * aucun composant Signal Forms du repo ne compose un sous-`FieldTree` à
 * travers une frontière de composant (cf. l'ancien commentaire P2-1
 * documentant cette absence de précédent). Plutôt que d'inventer ce pattern
 * pour un seul cas d'usage, ce store aplatit les 9 champs d'édition dans le
 * même modèle que les champs de décision, et le composant les rend dans un
 * seul template — l'idiome déjà suivi par les 48 autres formulaires Signal
 * Forms du repo. Les deux composants sont fusionnés en un seul.
 *
 * Champs conditionnels : `reason`/`comment`/`callbackType` dépendent de
 * `decision`/`approvalType` (`validate()` + `ctx.valueOf`, même style que
 * `messaging-form.store.ts`). Les 6 champs scalaires d'édition, `operators`
 * (tableau non vide) et `placePhotoUrl`/`placePhotoFile` (l'un des deux)
 * dépendent de `isEditFieldsRequired()` — factorisée pour rester la seule
 * source de vérité entre `validate()` (lit `ctx.valueOf`) et `showEditFields`
 * (lit `this.model()`, utilisé par le template et `disabled()`).
 */
@Injectable()
export class ReportStatesDetailsQualificationFormStore {
    readonly model = signal<QualificationFormModel>(empty());

    readonly showApprovalType = computed(
        () => this.model().decision === 'accepted'
    );
    readonly showReason = computed(() => this.model().decision === 'rejected');
    readonly showEditFields = computed(() =>
        isEditFieldsRequired(this.model().decision, this.model().approvalType)
    );
    readonly commentRequired = computed(
        () => this.model().decision === 'rejected' || this.showEditFields()
    );
    readonly callbackRequired = computed(
        () =>
            this.model().decision === 'accepted' &&
            this.model().approvalType === 'callback'
    );

    readonly form = form(this.model, (schema) => {
        required(schema.decision, { message: Q + '.DECISION_REQUIRED' });

        validate(schema.reason, (ctx) =>
            ctx.valueOf(schema.decision) === 'rejected' && !ctx.value()
                ? { kind: 'required', message: Q + '.REASON_REQUIRED' }
                : undefined
        );

        validate(schema.comment, (ctx) => {
            const decision = ctx.valueOf(schema.decision);
            const approvalType = ctx.valueOf(schema.approvalType);
            const isRequired =
                decision === 'rejected' ||
                isEditFieldsRequired(decision, approvalType);
            return isRequired && !ctx.value()
                ? { kind: 'required', message: Q + '.COMMENT_REQUIRED' }
                : undefined;
        });

        validate(schema.callbackType, (ctx) => {
            const decision = ctx.valueOf(schema.decision);
            const approvalType = ctx.valueOf(schema.approvalType);
            return decision === 'accepted' &&
                approvalType === 'callback' &&
                !ctx.value()
                ? { kind: 'required', message: Q + '.CALLBACK_TYPE_REQUIRED' }
                : undefined;
        });
        disabled(schema.callbackType, () => !this.callbackRequired());

        validate(schema.latitude, (ctx) =>
            isEditFieldsRequired(
                ctx.valueOf(schema.decision),
                ctx.valueOf(schema.approvalType)
            ) && ctx.value() == null
                ? { kind: 'required', message: Q + '.EDIT_FIELDS_REQUIRED' }
                : undefined
        );
        validate(schema.longitude, (ctx) =>
            isEditFieldsRequired(
                ctx.valueOf(schema.decision),
                ctx.valueOf(schema.approvalType)
            ) && ctx.value() == null
                ? { kind: 'required', message: Q + '.EDIT_FIELDS_REQUIRED' }
                : undefined
        );
        validate(schema.locationName, (ctx) =>
            isEditFieldsRequired(
                ctx.valueOf(schema.decision),
                ctx.valueOf(schema.approvalType)
            ) && !ctx.value()
                ? { kind: 'required', message: Q + '.EDIT_FIELDS_REQUIRED' }
                : undefined
        );
        validate(schema.reportType, (ctx) =>
            isEditFieldsRequired(
                ctx.valueOf(schema.decision),
                ctx.valueOf(schema.approvalType)
            ) && !ctx.value()
                ? { kind: 'required', message: Q + '.EDIT_FIELDS_REQUIRED' }
                : undefined
        );
        validate(schema.description, (ctx) =>
            isEditFieldsRequired(
                ctx.valueOf(schema.decision),
                ctx.valueOf(schema.approvalType)
            ) && !ctx.value()
                ? { kind: 'required', message: Q + '.EDIT_FIELDS_REQUIRED' }
                : undefined
        );
        validate(schema.placeDescription, (ctx) =>
            isEditFieldsRequired(
                ctx.valueOf(schema.decision),
                ctx.valueOf(schema.approvalType)
            ) && !ctx.value()
                ? { kind: 'required', message: Q + '.EDIT_FIELDS_REQUIRED' }
                : undefined
        );
        validate(schema.operators, (ctx) =>
            isEditFieldsRequired(
                ctx.valueOf(schema.decision),
                ctx.valueOf(schema.approvalType)
            ) && ctx.value().length === 0
                ? { kind: 'required', message: Q + '.EDIT_FIELDS_REQUIRED' }
                : undefined
        );
        validate(schema.placePhotoUrl, (ctx) =>
            isEditFieldsRequired(
                ctx.valueOf(schema.decision),
                ctx.valueOf(schema.approvalType)
            ) &&
            !ctx.value() &&
            !ctx.valueOf(schema.placePhotoFile)
                ? { kind: 'required', message: Q + '.EDIT_FIELDS_REQUIRED' }
                : undefined
        );
    });

    readonly isValid = computed(() => this.form().valid());

    hydrateEditFields(entity: ReportStatesDetailsEntity): void {
        const photoUrl =
            entity.placePhoto ||
            entity.media?.placePhoto ||
            entity.media?.accessPlacePhoto ||
            '';

        this.model.update((m) => ({
            ...m,
            latitude: entity.location.coordinates.latitude,
            longitude: entity.location.coordinates.longitude,
            locationName: entity.location.name,
            reportType: entity.reportType,
            operators: [...entity.operators],
            description: entity.description,
            placeDescription: entity.placeDescription,
            placePhotoUrl: photoUrl,
            placePhotoFile: null,
        }));
    }

    toggleOperator(value: string): void {
        const current = this.model().operators;
        const next = current.includes(value)
            ? current.filter((op) => op !== value)
            : [...current, value];
        this.model.update((m) => ({ ...m, operators: next }));
    }

    setPlacePhotoFile(file: File | null): void {
        this.model.update((m) => ({
            ...m,
            placePhotoFile: file,
            placePhotoUrl: file ? '' : m.placePhotoUrl,
        }));
    }

    buildContract(): ReportStatesDetailsQualificationContract | null {
        if (this.form().invalid()) {
            return null;
        }
        const raw = this.model();
        const contract: ReportStatesDetailsQualificationContract = {
            decision: raw.decision as 'accepted' | 'rejected',
            comment: raw.comment,
            reason: raw.reason,
            approvalType: raw.approvalType,
            callbackType: raw.callbackType || null,
        };
        if (this.showEditFields()) {
            contract.editFields = this.buildEditFields(raw);
        }
        return contract;
    }

    reset(): void {
        this.model.set(empty());
    }

    private buildEditFields(
        raw: QualificationFormModel
    ): ReportStatesDetailsQualificationEditFields {
        return {
            latitude: Number(raw.latitude),
            longitude: Number(raw.longitude),
            locationName: raw.locationName,
            reportType: raw.reportType,
            operators: raw.operators,
            description: raw.description,
            placeDescription: raw.placeDescription,
            placePhoto: raw.placePhotoFile ?? (raw.placePhotoUrl || null),
        };
    }
}
