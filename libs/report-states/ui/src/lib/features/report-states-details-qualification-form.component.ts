import { Component, effect, inject, input, output } from '@angular/core';
import { FormField } from '@angular/forms/signals';
import { ReportStatesDetailsEntity } from '@cmz/report-states-domain';
import type { ReportStatesDetailsQualificationContract } from '@cmz/report-states-domain';
import { TRANSLATION_PORT } from '@cmz/shared-application';
import {
    FieldComponent,
    LOCATION_NAME_OPTIONS,
    REPORT_TYPE_OPTIONS,
    TELECOM_OPERATOR_OPTIONS,
} from '@cmz/shared-ui';
import { REPORT_STATES_DETAILS_APPROVAL_TYPES } from '../constants/report-states-details-approval-type.constant';
import { REPORT_STATES_DETAILS_CALLBACK_TYPES } from '../constants/report-states-details-callback-type.constant';
import { REPORT_STATES_DETAILS_REJECT_MOTIFS } from '../constants/report-states-details-reject-motif.constant';
import { ReportStatesDetailsQualificationFormStore } from '../stores/report-states-details-qualification-form.store';

const Q = 'REPORT_STATES.DETAILS.QUALIFICATION';
const E = 'REPORT_STATES.DETAILS.EDIT';

/**
 * Formulaire qualification `report-states-details` — Signal Forms.
 *
 * T27 (`docs/architecture/taches-restantes.md`) : fusionne l'ancien duo
 * `ReportStatesDetailsQualificationFormComponent` (`FormBuilder`,
 * `ReactiveFormsModule`) + `ReportStatesDetailsEditFieldsComponent` (enfant
 * recevant un `FormGroup` en `@Input`) — voir `ReportStatesDetailsQualification
 * FormStore` pour le détail du raisonnement (aucun composant Signal Forms du
 * repo ne compose de sous-`FieldTree` à travers une frontière de composant ;
 * fusion en un seul template plutôt que d'inventer ce pattern pour un seul
 * cas d'usage). Contrat public inchangé pour son unique consommateur
 * (`report-states-details-dialog.component.ts`) : `[details]`, `[loading]`,
 * `(submitted)`, `(cancelled)`, méthode publique `reset()`.
 */
@Component({
    selector: 'cmz-report-states-details-qualification-form',
    imports: [FormField, FieldComponent],
    providers: [ReportStatesDetailsQualificationFormStore],
    template: `
        <form
            class="flex flex-col gap-3 border-t border-border pt-3"
            (submit)="onSubmit($event)"
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
                            value="accepted"
                            [formField]="store.form.decision"
                        />
                        {{ t(Q + '.APPROVE') }}
                    </label>
                    <label
                        class="inline-flex cursor-pointer items-center gap-2 text-sm"
                    >
                        <input
                            type="radio"
                            value="rejected"
                            [formField]="store.form.decision"
                        />
                        {{ t(Q + '.REJECT') }}
                    </label>
                </div>
                @if (
                    store.form.decision().touched() &&
                    store.form.decision().invalid()
                ) {
                    <p class="text-xs text-danger">
                        {{ t(Q + '.DECISION_REQUIRED') }}
                    </p>
                }
            </fieldset>

            @if (store.showApprovalType()) {
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
                                    [value]="option.value"
                                    [formField]="store.form.approvalType"
                                />
                                {{ t(option.label) }}
                            </label>
                        }
                    </div>
                </fieldset>

                <cmz-field
                    [label]="'MANAGEMENT.TREATMENT.CALLBACK_ACTION.CALLBACK_TYPE'"
                    [field]="store.form.callbackType"
                    for="callbackType"
                    [required]="store.callbackRequired()"
                >
                    <select
                        id="callbackType"
                        [formField]="store.form.callbackType"
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
                </cmz-field>
            }

            @if (store.showEditFields()) {
                <fieldset
                    class="flex flex-col gap-3 rounded border border-border p-3"
                >
                    <legend class="text-sm font-medium text-text">
                        {{ t(E + '.TITLE') }}
                    </legend>

                    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <cmz-field
                            [label]="E + '.LATITUDE'"
                            [field]="store.form.latitude"
                            for="latitude"
                            [required]="true"
                        >
                            <input
                                id="latitude"
                                type="number"
                                step="any"
                                [formField]="store.form.latitude"
                                class="rounded border border-border bg-surface px-3 py-2"
                            />
                        </cmz-field>
                        <cmz-field
                            [label]="E + '.LONGITUDE'"
                            [field]="store.form.longitude"
                            for="longitude"
                            [required]="true"
                        >
                            <input
                                id="longitude"
                                type="number"
                                step="any"
                                [formField]="store.form.longitude"
                                class="rounded border border-border bg-surface px-3 py-2"
                            />
                        </cmz-field>
                    </div>

                    <cmz-field
                        [label]="E + '.LOCATION_NAME'"
                        [field]="store.form.locationName"
                        for="locationName"
                        [required]="true"
                    >
                        <select
                            id="locationName"
                            [formField]="store.form.locationName"
                            class="rounded border border-border bg-surface px-3 py-2"
                        >
                            <option value="">
                                {{ t('COMMON.SELECT_PLACEHOLDER') }}
                            </option>
                            @for (opt of locationOptions; track opt.value) {
                                <option [value]="opt.value">
                                    {{ t(opt.label) }}
                                </option>
                            }
                        </select>
                    </cmz-field>

                    <cmz-field
                        [label]="E + '.REPORT_TYPE'"
                        [field]="store.form.reportType"
                        for="reportType"
                        [required]="true"
                    >
                        <select
                            id="reportType"
                            [formField]="store.form.reportType"
                            class="rounded border border-border bg-surface px-3 py-2"
                        >
                            <option value="">
                                {{ t('COMMON.SELECT_PLACEHOLDER') }}
                            </option>
                            @for (opt of reportTypeOptions; track opt.value) {
                                <option [value]="opt.value">
                                    {{ t(opt.label) }}
                                </option>
                            }
                        </select>
                    </cmz-field>

                    <cmz-field
                        [label]="E + '.OPERATORS'"
                        [field]="store.form.operators"
                        for="operators"
                        [required]="true"
                    >
                        <div class="flex flex-wrap gap-3">
                            @for (opt of operatorOptions; track opt.value) {
                                <label
                                    class="inline-flex items-center gap-2 text-sm"
                                >
                                    <input
                                        type="checkbox"
                                        [checked]="
                                            isOperatorSelected(opt.value)
                                        "
                                        (change)="toggleOperator(opt.value)"
                                    />
                                    {{ t(opt.label) }}
                                </label>
                            }
                        </div>
                    </cmz-field>

                    <cmz-field
                        [label]="E + '.DESCRIPTION'"
                        [field]="store.form.description"
                        for="description"
                        [required]="true"
                    >
                        <textarea
                            id="description"
                            rows="3"
                            [formField]="store.form.description"
                            class="rounded border border-border bg-surface px-3 py-2"
                        ></textarea>
                    </cmz-field>

                    <cmz-field
                        [label]="E + '.PLACE_DESCRIPTION'"
                        [field]="store.form.placeDescription"
                        for="placeDescription"
                        [required]="true"
                    >
                        <textarea
                            id="placeDescription"
                            rows="2"
                            [formField]="store.form.placeDescription"
                            class="rounded border border-border bg-surface px-3 py-2"
                        ></textarea>
                    </cmz-field>

                    <cmz-field
                        [label]="E + '.PLACE_PHOTO'"
                        [field]="store.form.placePhotoUrl"
                        for="placePhoto"
                        [required]="true"
                    >
                        @if (store.model().placePhotoUrl; as url) {
                            <img
                                [src]="url"
                                [alt]="t(E + '.PLACE_PHOTO_ALT')"
                                class="mb-2 max-h-32 rounded border border-border object-cover"
                            />
                        }
                        <input
                            id="placePhoto"
                            type="file"
                            accept="image/*"
                            class="text-sm"
                            (change)="onPhotoSelected($event)"
                        />
                    </cmz-field>
                </fieldset>
            }

            @if (store.showReason()) {
                <cmz-field
                    [label]="Q + '.MOTIF_LABEL'"
                    [field]="store.form.reason"
                    for="reason"
                    [required]="true"
                >
                    <select
                        id="reason"
                        [formField]="store.form.reason"
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
                </cmz-field>
            }

            <cmz-field
                [label]="Q + '.COMMENT'"
                [field]="store.form.comment"
                for="comment"
                [required]="store.commentRequired()"
            >
                <textarea
                    id="comment"
                    [formField]="store.form.comment"
                    rows="3"
                    class="rounded border border-border bg-surface px-3 py-2"
                ></textarea>
            </cmz-field>

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
                    [disabled]="loading() || store.form().invalid()"
                >
                    {{ t('MANAGEMENT.BUTTONS.APPROBATION') }}
                </button>
            </footer>
        </form>
    `,
})
export class ReportStatesDetailsQualificationFormComponent {
    protected readonly store = inject(
        ReportStatesDetailsQualificationFormStore
    );
    protected readonly Q = Q;
    protected readonly E = E;
    protected readonly motifs = REPORT_STATES_DETAILS_REJECT_MOTIFS;
    protected readonly approvalTypes = REPORT_STATES_DETAILS_APPROVAL_TYPES;
    protected readonly callbackTypes = REPORT_STATES_DETAILS_CALLBACK_TYPES;
    protected readonly locationOptions = LOCATION_NAME_OPTIONS;
    protected readonly reportTypeOptions = REPORT_TYPE_OPTIONS;
    protected readonly operatorOptions = TELECOM_OPERATOR_OPTIONS;

    readonly details = input<ReportStatesDetailsEntity | null>(null);
    readonly loading = input(false);
    readonly submitted = output<ReportStatesDetailsQualificationContract>();
    readonly cancelled = output<void>();

    private readonly i18n = inject(TRANSLATION_PORT);

    constructor() {
        effect(() => {
            const entity = this.details();
            if (entity && this.store.showEditFields()) {
                this.store.hydrateEditFields(entity);
            }
        });
    }

    protected t(key: string): string {
        return this.i18n.translate(key);
    }

    protected isOperatorSelected(value: string): boolean {
        return this.store.model().operators.includes(value);
    }

    protected toggleOperator(value: string): void {
        this.store.toggleOperator(value);
    }

    protected onPhotoSelected(event: Event): void {
        const file = (event.target as HTMLInputElement).files?.[0] ?? null;
        this.store.setPlacePhotoFile(file);
    }

    protected onSubmit(event: Event): void {
        event.preventDefault();
        const contract = this.store.buildContract();
        if (!contract) {
            return;
        }
        this.submitted.emit(contract);
    }

    reset(): void {
        this.store.reset();
    }
}
