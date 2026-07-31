import {
    ChangeDetectionStrategy,
    Component,
    input,
    output,
    inject,
    effect,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
    RequestsDetailsEntity,
    RequestsDetailsQualificationContract,
    RequestsDetailsQualificationEditFields,
} from '@cmz/requests-domain';
import { TranslationPort } from '@cmz/shared-application';
import { REQUESTS_DETAILS_APPROVAL_TYPES } from '../constants/requests-details-approval-type.constant';
import { REQUESTS_DETAILS_CALLBACK_TYPES } from '../constants/requests-details-callback-type.constant';
import { REQUESTS_DETAILS_REJECT_MOTIFS } from '../constants/requests-details-reject-motif.constant';
import { RequestsDetailsEditFieldsComponent } from './requests-details-edit-fields.component';

const Q = 'REQUESTS.DETAILS.QUALIFICATION';

@Component({
    selector: 'cmz-requests-details-qualification-form',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ReactiveFormsModule, RequestsDetailsEditFieldsComponent],
    template: `
        <form
            class="flex flex-col gap-3 border-t border-border pt-3"
            [formGroup]="form"
            (ngSubmit)="onSubmit()"
        >
            <fieldset class="flex flex-col gap-2">
                <legend class="text-sm font-medium text-text">
                    {{ t(Q + '.DECISION') }}
                </legend>
                <div class="flex flex-wrap gap-4">
                    <label
                        class="inline-flex cursor-pointer items-center gap-2 text-sm"
                    >
                        <input
                            type="radio"
                            formControlName="decision"
                            value="accepted"
                        />
                        {{ t(Q + '.APPROVE') }}
                    </label>
                    <label
                        class="inline-flex cursor-pointer items-center gap-2 text-sm"
                    >
                        <input
                            type="radio"
                            formControlName="decision"
                            value="rejected"
                        />
                        {{ t(Q + '.REJECT') }}
                    </label>
                </div>
                @if (
                    form.controls.decision.touched &&
                    form.controls.decision.invalid
                ) {
                    <p class="text-xs text-danger">
                        {{ t(Q + '.DECISION_REQUIRED') }}
                    </p>
                }
            </fieldset>

            @if (showApprovalType()) {
                <fieldset class="flex flex-col gap-2">
                    <legend class="text-sm font-medium text-text">
                        {{ t('MANAGEMENT.TREATMENT.CALLBACK_ACTION.TITLE') }}
                    </legend>
                    <div class="flex flex-wrap gap-4">
                        @for (option of approvalTypes; track option.value) {
                            <label
                                class="inline-flex cursor-pointer items-center gap-2 text-sm"
                            >
                                <input
                                    type="radio"
                                    formControlName="approvalType"
                                    [value]="option.value"
                                />
                                {{ t(option.label) }}
                            </label>
                        }
                    </div>
                </fieldset>

                <label class="flex flex-col gap-1 text-sm">
                    <span class="font-medium text-text">
                        {{
                            t(
                                'MANAGEMENT.TREATMENT.CALLBACK_ACTION.CALLBACK_TYPE'
                            )
                        }}
                        @if (callbackRequired()) {
                            <span class="text-danger">*</span>
                        }
                    </span>
                    <select
                        formControlName="callbackType"
                        class="rounded border border-border bg-surface px-3 py-2 disabled:opacity-50"
                    >
                        <option value="">
                            {{ t('COMMON.SELECT_PLACEHOLDER') }}
                        </option>
                        @for (type of callbackTypes; track type.value) {
                            <option [value]="type.value">
                                {{ t(type.label) }}
                            </option>
                        }
                    </select>
                    @if (
                        form.controls.callbackType.touched &&
                        form.controls.callbackType.invalid
                    ) {
                        <span class="text-xs text-danger">
                            {{ t(Q + '.CALLBACK_TYPE_REQUIRED') }}
                        </span>
                    }
                </label>
            }

            @if (showEditFields()) {
                <cmz-requests-details-edit-fields
                    [group]="form.controls.editFields"
                />
            }

            @if (showReason()) {
                <label class="flex flex-col gap-1 text-sm">
                    <span class="font-medium text-text">
                        {{ t(Q + '.MOTIF_LABEL') }}
                        <span class="text-danger">*</span>
                    </span>
                    <select
                        formControlName="reason"
                        class="rounded border border-border bg-surface px-3 py-2"
                    >
                        <option value="">
                            {{ t('COMMON.SELECT_PLACEHOLDER') }}
                        </option>
                        @for (motif of motifs; track motif.value) {
                            <option [value]="motif.value">
                                {{ t(motif.label) }}
                            </option>
                        }
                    </select>
                    @if (
                        form.controls.reason.touched &&
                        form.controls.reason.invalid
                    ) {
                        <span class="text-xs text-danger">
                            {{ t(Q + '.REASON_REQUIRED') }}
                        </span>
                    }
                </label>
            }

            <label class="flex flex-col gap-1 text-sm">
                <span class="font-medium text-text">
                    {{ t(Q + '.COMMENT') }}
                    @if (commentRequired()) {
                        <span class="text-danger">*</span>
                    }
                </span>
                <textarea
                    formControlName="comment"
                    rows="3"
                    class="rounded border border-border bg-surface px-3 py-2"
                ></textarea>
                @if (
                    form.controls.comment.touched &&
                    form.controls.comment.invalid
                ) {
                    <span class="text-xs text-danger">
                        {{ t(Q + '.COMMENT_REQUIRED') }}
                    </span>
                }
            </label>

            <footer class="flex justify-end gap-2">
                <button
                    type="button"
                    class="rounded border border-border px-4 py-2 text-sm hover:bg-surface-hover disabled:opacity-50"
                    [disabled]="loading()"
                    (click)="cancelled.emit()"
                >
                    {{ t('COMMON.CANCEL') }}
                </button>
                <button
                    type="submit"
                    class="rounded bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
                    [disabled]="loading()"
                >
                    {{ t('MANAGEMENT.BUTTONS.APPROBATION') }}
                </button>
            </footer>
        </form>
    `,
})
export class RequestsDetailsQualificationFormComponent {
    protected readonly Q = Q;
    protected readonly motifs = REQUESTS_DETAILS_REJECT_MOTIFS;
    protected readonly approvalTypes = REQUESTS_DETAILS_APPROVAL_TYPES;
    protected readonly callbackTypes = REQUESTS_DETAILS_CALLBACK_TYPES;

    readonly details = input<RequestsDetailsEntity | null>(null);
    readonly loading = input(false);
    readonly submitted = output<RequestsDetailsQualificationContract>();
    readonly cancelled = output<void>();

    private readonly i18n = inject(TranslationPort);
    private readonly fb = inject(FormBuilder);

    protected readonly form = this.fb.nonNullable.group({
        decision: ['', Validators.required],
        approvalType: ['view'],
        callbackType: [''],
        reason: [''],
        comment: [''],
        editFields: this.fb.nonNullable.group({
            latitude: [0],
            longitude: [0],
            locationName: [''],
            reportType: [''],
            operators: [[] as string[]],
            description: [''],
            placeDescription: [''],
            placePhotoUrl: [''],
            placePhotoFile: [null as File | null],
        }),
    });

    protected showReason(): boolean {
        return this.form.controls.decision.value === 'rejected';
    }

    protected showApprovalType(): boolean {
        return this.form.controls.decision.value === 'accepted';
    }

    protected showEditFields(): boolean {
        if (this.form.controls.decision.value !== 'accepted') {
            return false;
        }
        const mode = this.form.controls.approvalType.value;
        return mode === 'edit' || mode === 'callback';
    }

    protected commentRequired(): boolean {
        return (
            this.form.controls.decision.value === 'rejected' ||
            this.showEditFields()
        );
    }

    protected callbackRequired(): boolean {
        return (
            this.form.controls.decision.value === 'accepted' &&
            this.form.controls.approvalType.value === 'callback'
        );
    }

    constructor() {
        this.form.controls.decision.valueChanges.subscribe((decision) => {
            this.syncValidators(decision);
            this.maybeHydrateEditFields();
        });
        this.form.controls.approvalType.valueChanges.subscribe(() => {
            this.syncCallbackValidators();
            this.syncEditValidators();
            this.maybeHydrateEditFields();
        });

        effect(() => {
            if (this.details()) {
                this.maybeHydrateEditFields();
            }
        });
    }

    protected t(key: string): string {
        return this.i18n.translate(key);
    }

    protected onSubmit(): void {
        this.syncValidators(this.form.controls.decision.value);
        this.syncCallbackValidators();
        this.syncEditValidators();
        this.form.markAllAsTouched();
        if (this.form.invalid) {
            return;
        }
        const raw = this.form.getRawValue();
        const contract: RequestsDetailsQualificationContract = {
            decision: raw.decision as 'accepted' | 'rejected',
            comment: raw.comment,
            reason: raw.reason,
            approvalType: raw.approvalType,
            callbackType: raw.callbackType || null,
        };

        if (this.showEditFields()) {
            contract.editFields = this.buildEditFields(raw.editFields);
        }

        this.submitted.emit(contract);
    }

    reset(): void {
        this.form.reset({
            decision: '',
            approvalType: 'view',
            callbackType: '',
            reason: '',
            comment: '',
            editFields: {
                latitude: 0,
                longitude: 0,
                locationName: '',
                reportType: '',
                operators: [],
                description: '',
                placeDescription: '',
                placePhotoUrl: '',
                placePhotoFile: null,
            },
        });
    }

    private maybeHydrateEditFields(): void {
        const entity = this.details();
        if (!entity || !this.showEditFields()) {
            return;
        }
        this.hydrateEditFields(entity);
    }

    private buildEditFields(
        raw: typeof this.form.controls.editFields.value
    ): RequestsDetailsQualificationEditFields {
        return {
            latitude: Number(raw.latitude),
            longitude: Number(raw.longitude),
            locationName: raw.locationName ?? '',
            reportType: raw.reportType ?? '',
            operators: raw.operators ?? [],
            description: raw.description ?? '',
            placeDescription: raw.placeDescription ?? '',
            placePhoto: raw.placePhotoFile ?? (raw.placePhotoUrl || null),
        };
    }

    private hydrateEditFields(details: RequestsDetailsEntity): void {
        const photoUrl =
            details.placePhoto ||
            details.media?.placePhoto ||
            details.media?.accessPlacePhoto ||
            '';

        this.form.controls.editFields.patchValue({
            latitude: details.location.coordinates.latitude,
            longitude: details.location.coordinates.longitude,
            locationName: details.location.name,
            reportType: details.reportType,
            operators: [...details.operators],
            description: details.description,
            placeDescription: details.placeDescription,
            placePhotoUrl: photoUrl,
            placePhotoFile: null,
        });
    }

    private syncValidators(decision: string): void {
        const reason = this.form.controls.reason;
        const comment = this.form.controls.comment;
        if (decision === 'rejected') {
            reason.setValidators([Validators.required]);
            comment.setValidators([Validators.required]);
        } else if (this.showEditFields()) {
            reason.clearValidators();
            comment.setValidators([Validators.required]);
        } else {
            reason.clearValidators();
            comment.clearValidators();
        }
        reason.updateValueAndValidity({ emitEvent: false });
        comment.updateValueAndValidity({ emitEvent: false });
        this.syncCallbackValidators();
        this.syncEditValidators();
    }

    private syncCallbackValidators(): void {
        const callback = this.form.controls.callbackType;
        const approvalType = this.form.controls.approvalType.value;
        const decision = this.form.controls.decision.value;

        if (decision === 'accepted' && approvalType === 'callback') {
            callback.setValidators([Validators.required]);
            callback.enable({ emitEvent: false });
        } else {
            callback.clearValidators();
            callback.setValue('', { emitEvent: false });
            callback.disable({ emitEvent: false });
        }
        callback.updateValueAndValidity({ emitEvent: false });
    }

    private syncEditValidators(): void {
        const group = this.form.controls.editFields;
        const required = this.showEditFields();

        const controls = [
            group.controls.latitude,
            group.controls.longitude,
            group.controls.locationName,
            group.controls.reportType,
            group.controls.description,
            group.controls.placeDescription,
        ];

        for (const control of controls) {
            if (required) {
                control.setValidators([Validators.required]);
            } else {
                control.clearValidators();
            }
            control.updateValueAndValidity({ emitEvent: false });
        }

        const operators = group.controls.operators;
        if (required) {
            operators.setValidators([
                (ctrl) =>
                    ((ctrl.value as string[])?.length ?? 0) > 0
                        ? null
                        : { required: true },
            ]);
        } else {
            operators.clearValidators();
        }
        operators.updateValueAndValidity({ emitEvent: false });

        const photoUrl = group.controls.placePhotoUrl;
        const photoFile = group.controls.placePhotoFile;
        if (required) {
            photoUrl.setValidators([
                () =>
                    photoUrl.value || photoFile.value
                        ? null
                        : { required: true },
            ]);
        } else {
            photoUrl.clearValidators();
        }
        photoUrl.updateValueAndValidity({ emitEvent: false });
    }
}
