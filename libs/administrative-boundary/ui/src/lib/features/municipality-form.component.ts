import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormField } from '@angular/forms/signals';
import { ActivatedRoute, Router } from '@angular/router';
import { MunicipalityFacade } from '@cmz/administrative-boundary-application';
import { TranslationPort } from '@cmz/shared-application';
import { FieldComponent } from '@cmz/shared-ui';
import { MunicipalityFormStore } from '../stores/municipality-form.store';
import { FormMode } from '../stores/form-mode.type';

const T = 'ADMINISTRATIVE_BOUNDARY.MUNICIPALITY';

@Component({
    selector: 'cmz-municipality-form',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormField, FieldComponent],
    providers: [MunicipalityFormStore],
    template: `
        <form (submit)="onSubmit($event)" class="flex max-w-xl flex-col gap-4">
            <h1 class="text-lg font-semibold text-text">
                {{ t(ns + '.FORM.TITLE.' + mode().toUpperCase()) }}
            </h1>

            <cmz-field
                [label]="ns + '.FORM.CODE'"
                [field]="store.form.code"
                for="code"
                [required]="true"
            >
                <input
                    id="code"
                    [formField]="store.form.code"
                    class="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
                />
            </cmz-field>

            <cmz-field
                [label]="ns + '.FORM.NAME'"
                [field]="store.form.name"
                for="name"
                [required]="true"
            >
                <input
                    id="name"
                    [formField]="store.form.name"
                    class="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
                />
            </cmz-field>

            <cmz-field
                [label]="ns + '.FORM.REGION'"
                [field]="store.form.regionId"
                for="regionId"
                [required]="true"
            >
                <select
                    id="regionId"
                    [formField]="store.form.regionId"
                    (change)="onRegionChange($event)"
                    class="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
                >
                    <option value="">
                        {{ t('COMMON.SELECT_PLACEHOLDER') }}
                    </option>
                    @for (region of store.regionOptions(); track region.id) {
                        <option [value]="region.id">{{ region.name }}</option>
                    }
                </select>
            </cmz-field>

            <cmz-field
                [label]="ns + '.FORM.DEPARTMENT'"
                [field]="store.form.departmentId"
                for="departmentId"
                [required]="true"
            >
                <select
                    id="departmentId"
                    [formField]="store.form.departmentId"
                    class="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
                >
                    <option value="">
                        {{ t('COMMON.SELECT_PLACEHOLDER') }}
                    </option>
                    @for (
                        department of store.departmentOptions();
                        track department.id
                    ) {
                        <option [value]="department.id">
                            {{ department.name }}
                        </option>
                    }
                </select>
            </cmz-field>

            <cmz-field
                [label]="ns + '.FORM.DESCRIPTION'"
                [field]="store.form.description"
                for="description"
            >
                <textarea
                    id="description"
                    rows="4"
                    [formField]="store.form.description"
                    class="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
                ></textarea>
            </cmz-field>

            <cmz-field
                [label]="ns + '.FORM.POPULATION_SIZE'"
                [field]="store.form.populationSize"
                for="populationSize"
                [required]="true"
            >
                <input
                    id="populationSize"
                    type="number"
                    [formField]="store.form.populationSize"
                    class="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
                />
            </cmz-field>

            <cmz-field
                [label]="ns + '.FORM.INFRASTRUCTURE_COUNT'"
                [field]="store.form.infrastructureCount"
                for="infrastructureCount"
                [required]="true"
            >
                <input
                    id="infrastructureCount"
                    type="number"
                    [formField]="store.form.infrastructureCount"
                    class="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
                />
            </cmz-field>

            <div class="flex items-center justify-end gap-2">
                <button
                    type="button"
                    (click)="onCancel()"
                    class="rounded border border-border px-4 py-2 text-sm hover:bg-surface-hover"
                >
                    {{ t('COMMON.CANCEL') }}
                </button>
                @if (!isDetails()) {
                    <button
                        type="submit"
                        [disabled]="store.form().invalid() || saving()"
                        class="rounded bg-primary px-4 py-2 text-sm font-medium text-on-primary disabled:opacity-50"
                    >
                        {{ t('COMMON.SAVE') }}
                    </button>
                }
            </div>
        </form>
    `,
})
export class MunicipalityFormComponent {
    protected readonly store = inject(MunicipalityFormStore);
    private readonly facade = inject(MunicipalityFacade);
    private readonly i18n = inject(TranslationPort);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    protected readonly ns = T;
    protected readonly mode = this.store.mode;
    protected readonly isDetails = this.store.isDetails;
    protected readonly saving = computed(
        () => this.facade.actionState() === 'loading'
    );

    private readonly params = toSignal(this.route.queryParamMap);
    private lastSeenSuccess = this.facade.actionSuccess();

    constructor() {
        const params = this.params();
        const uniqId = params?.get('uniqId') ?? null;
        const ref = (params?.get('ref') as FormMode) ?? 'create';
        this.store.setMode(uniqId, ref);

        effect(() => {
            const success = this.facade.actionSuccess();
            if (success > this.lastSeenSuccess) {
                this.lastSeenSuccess = success;
                this.onCancel();
            }
        });
    }

    protected t(key: string): string {
        return this.i18n.translate(key);
    }

    /** Cascade : un changement de région réinitialise le département choisi. */
    protected onRegionChange(event: Event): void {
        const regionId = (event.target as HTMLSelectElement).value;
        this.store.onRegionChange(regionId);
    }

    protected onSubmit(event: Event): void {
        event.preventDefault();
        if (this.store.form().invalid()) {
            return;
        }
        const {
            code,
            name,
            description,
            populationSize,
            infrastructureCount,
            regionId,
            departmentId,
        } = this.store.model();
        if (this.mode() === 'edit') {
            const uniqId = this.params()?.get('uniqId') ?? '';
            this.facade.update({
                uniqId,
                code,
                name,
                description,
                populationSize: populationSize ?? undefined,
                infrastructureCount: infrastructureCount ?? undefined,
                regionId,
                departmentId,
            });
        } else {
            this.facade.create({
                code,
                name,
                description,
                populationSize: populationSize ?? undefined,
                infrastructureCount: infrastructureCount ?? undefined,
                regionId,
                departmentId,
            });
        }
    }

    protected onCancel(): void {
        void this.router.navigate(['../'], { relativeTo: this.route });
    }
}
