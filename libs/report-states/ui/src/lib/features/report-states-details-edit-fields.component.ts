import {
    ChangeDetectionStrategy,
    Component,
    input,
    inject,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TranslationPort } from '@cmz/shared-application';
import {
    LOCATION_NAME_OPTIONS,
    REPORT_TYPE_OPTIONS,
    TELECOM_OPERATOR_OPTIONS,
} from '@cmz/shared-ui';

const E = 'REQUESTS.DETAILS.EDIT';

export interface ReportStatesDetailsEditFieldsForm {
    latitude: FormControl<number>;
    longitude: FormControl<number>;
    locationName: FormControl<string>;
    reportType: FormControl<string>;
    operators: FormControl<string[]>;
    description: FormControl<string>;
    placeDescription: FormControl<string>;
    placePhotoUrl: FormControl<string>;
    placePhotoFile: FormControl<File | null>;
}

@Component({
    selector: 'cmz-report-states-details-edit-fields',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ReactiveFormsModule],
    template: `
        <fieldset
            class="flex flex-col gap-3 rounded border border-border p-3"
            [formGroup]="group()"
        >
            <legend class="text-sm font-medium text-text">
                {{ t(E + '.TITLE') }}
            </legend>

            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label class="flex flex-col gap-1 text-sm">
                    <span class="font-medium">{{ t(E + '.LATITUDE') }} *</span>
                    <input
                        type="number"
                        step="any"
                        formControlName="latitude"
                        class="rounded border border-border bg-surface px-3 py-2"
                    />
                </label>
                <label class="flex flex-col gap-1 text-sm">
                    <span class="font-medium">{{ t(E + '.LONGITUDE') }} *</span>
                    <input
                        type="number"
                        step="any"
                        formControlName="longitude"
                        class="rounded border border-border bg-surface px-3 py-2"
                    />
                </label>
            </div>

            <label class="flex flex-col gap-1 text-sm">
                <span class="font-medium">{{ t(E + '.LOCATION_NAME') }} *</span>
                <select
                    formControlName="locationName"
                    class="rounded border border-border bg-surface px-3 py-2"
                >
                    <option value="">
                        {{ t('COMMON.SELECT_PLACEHOLDER') }}
                    </option>
                    @for (opt of locationOptions; track opt.value) {
                        <option [value]="opt.value">{{ t(opt.label) }}</option>
                    }
                </select>
            </label>

            <label class="flex flex-col gap-1 text-sm">
                <span class="font-medium">{{ t(E + '.REPORT_TYPE') }} *</span>
                <select
                    formControlName="reportType"
                    class="rounded border border-border bg-surface px-3 py-2"
                >
                    <option value="">
                        {{ t('COMMON.SELECT_PLACEHOLDER') }}
                    </option>
                    @for (opt of reportTypeOptions; track opt.value) {
                        <option [value]="opt.value">{{ t(opt.label) }}</option>
                    }
                </select>
            </label>

            <fieldset class="flex flex-col gap-2">
                <legend class="text-sm font-medium">
                    {{ t(E + '.OPERATORS') }} *
                </legend>
                <div class="flex flex-wrap gap-3">
                    @for (opt of operatorOptions; track opt.value) {
                        <label class="inline-flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                [checked]="isOperatorSelected(opt.value)"
                                (change)="toggleOperator(opt.value, $event)"
                            />
                            {{ t(opt.label) }}
                        </label>
                    }
                </div>
            </fieldset>

            <label class="flex flex-col gap-1 text-sm">
                <span class="font-medium">{{ t(E + '.DESCRIPTION') }} *</span>
                <textarea
                    formControlName="description"
                    rows="3"
                    class="rounded border border-border bg-surface px-3 py-2"
                ></textarea>
            </label>

            <label class="flex flex-col gap-1 text-sm">
                <span class="font-medium"
                    >{{ t(E + '.PLACE_DESCRIPTION') }} *</span
                >
                <textarea
                    formControlName="placeDescription"
                    rows="2"
                    class="rounded border border-border bg-surface px-3 py-2"
                ></textarea>
            </label>

            <div class="flex flex-col gap-2 text-sm">
                <span class="font-medium">{{ t(E + '.PLACE_PHOTO') }} *</span>
                @if (group().controls.placePhotoUrl.value; as url) {
                    <img
                        [src]="url"
                        [alt]="t(E + '.PLACE_PHOTO_ALT')"
                        class="max-h-32 rounded border border-border object-cover"
                    />
                }
                <input
                    type="file"
                    accept="image/*"
                    class="text-sm"
                    (change)="onPhotoSelected($event)"
                />
            </div>
        </fieldset>
    `,
})
export class ReportStatesDetailsEditFieldsComponent {
    protected readonly E = E;
    protected readonly locationOptions = LOCATION_NAME_OPTIONS;
    protected readonly reportTypeOptions = REPORT_TYPE_OPTIONS;
    protected readonly operatorOptions = TELECOM_OPERATOR_OPTIONS;

    readonly group =
        input.required<FormGroup<ReportStatesDetailsEditFieldsForm>>();

    private readonly i18n = inject(TranslationPort);

    protected t(key: string): string {
        return this.i18n.translate(key);
    }

    protected isOperatorSelected(value: string): boolean {
        const operators =
            (this.group().controls.operators.value as string[]) ?? [];
        return operators.includes(value);
    }

    protected toggleOperator(value: string, event: Event): void {
        const checked = (event.target as HTMLInputElement).checked;
        const control = this.group().controls.operators;
        const current = [...((control.value as string[]) ?? [])];
        const next = checked
            ? [...current, value]
            : current.filter((op) => op !== value);
        control.setValue(next);
        control.markAsTouched();
    }

    protected onPhotoSelected(event: Event): void {
        const file = (event.target as HTMLInputElement).files?.[0] ?? null;
        this.group().controls.placePhotoFile.setValue(file);
        if (file) {
            this.group().controls.placePhotoUrl.setValue('');
        }
        this.group().controls.placePhotoFile.markAsTouched();
    }
}
