import { Injectable, computed, signal } from '@angular/core';
import { disabled, form, required, validate } from '@angular/forms/signals';
import {
    RequestsDetailsEntity,
    RequestsDetailsQualificationContract,
    RequestsDetailsQualificationEditFields,
} from '@cmz/requests-domain';

const Q = 'REQUESTS.DETAILS.QUALIFICATION';

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
 * Store de formulaire `requests-details-qualification` — Signal Forms.
 *
 * T27 (`docs/architecture/taches-restantes.md`) : miroir exact de
 * `ReportStatesDetailsQualificationFormStore` (voir ce fichier pour le
 * raisonnement complet — `report-states`/`requests` "details" sont des
 * modules jumeaux, cf. `docs/architecture/factorisation-details-workflow.md`,
 * P1-1). Remplace l'ancien duo `RequestsDetailsQualificationFormComponent`
 * (`FormBuilder`, `ReactiveFormsModule`) + `RequestsDetailsEditFieldsComponent`
 * (enfant recevant un `FormGroup` en `@Input`), fusionnés en un seul
 * composant Signal Forms plutôt que d'inventer une composition de
 * sous-`FieldTree` sans précédent dans le repo pour ce seul cas d'usage.
 */
@Injectable()
export class RequestsDetailsQualificationFormStore {
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

    hydrateEditFields(entity: RequestsDetailsEntity): void {
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

    buildContract(): RequestsDetailsQualificationContract | null {
        if (this.form().invalid()) {
            return null;
        }
        const raw = this.model();
        const contract: RequestsDetailsQualificationContract = {
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
    ): RequestsDetailsQualificationEditFields {
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
