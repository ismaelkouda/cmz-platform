import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormField } from '@angular/forms/signals';
import { ActivatedRoute, Router } from '@angular/router';
import {
    FiberConstructorSelectFacade,
    OpticalFiberNetworkFacade,
} from '@cmz/coverage-areas-application';
import { FiberType, Operator } from '@cmz/coverage-areas-domain';
import { FieldComponent, FormMode } from '@cmz/shared-ui';
import { TRANSLATION_PORT } from '@cmz/shared-application';
import { OpticalFiberNetworkFormStore } from '../stores/optical-fiber-network-form.store';

const T = 'COVERAGE_AREAS.OPTICAL_FIBER_NETWORK';

/**
 * Formulaire `optical-fiber-network` — **Signal Forms (Angular 22)**.
 * `fiberConstructorId` est un select alimenté par `FiberConstructorSelectFacade`
 * (concept select-only, même forme que `TowerTypeSelectFacade`). `geomFile`
 * (tracé GeoJSON) est un `<input type="file">` natif hors `[formField]`
 * (cf. store) ; l'aperçu cartographique du source n'est **pas** reconstruit
 * ici (décision assumée, cf. commentaire du store) — seule une mention du
 * fichier existant s'affiche en mode édition/détails.
 */
@Component({
    selector: 'cmz-optical-fiber-network-form',
    imports: [FormField, FieldComponent],
    providers: [OpticalFiberNetworkFormStore],
    template: `
        <form (submit)="onSubmit($event)" class="flex max-w-2xl flex-col gap-4">
            <h1 class="text-lg font-semibold text-text">
                {{ t(ns + '.FORM.TITLE.' + mode().toUpperCase()) }}
            </h1>

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
                [label]="ns + '.FORM.OPERATOR'"
                [field]="store.form.operator"
                for="operator"
                [required]="true"
            >
                <select
                    id="operator"
                    [formField]="store.form.operator"
                    class="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
                >
                    <option value="" disabled>
                        {{ t('COMMON.SELECT_PLACEHOLDER') }}
                    </option>
                    @for (option of operatorOptions(); track option) {
                        <option [value]="option">{{ option }}</option>
                    }
                </select>
            </cmz-field>

            <cmz-field
                [label]="ns + '.FORM.CONSTRUCTOR'"
                [field]="store.form.fiberConstructorId"
                for="fiberConstructorId"
                [required]="true"
            >
                <select
                    id="fiberConstructorId"
                    [formField]="store.form.fiberConstructorId"
                    class="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
                >
                    <option value="" disabled>
                        {{ t('COMMON.SELECT_PLACEHOLDER') }}
                    </option>
                    @for (
                        option of fiberConstructorOptions();
                        track option.value
                    ) {
                        <option [value]="option.value">
                            {{ option.label }}
                        </option>
                    }
                </select>
            </cmz-field>

            <cmz-field
                [label]="ns + '.FORM.TYPE'"
                [field]="store.form.type"
                for="type"
                [required]="true"
            >
                <select
                    id="type"
                    [formField]="store.form.type"
                    class="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
                >
                    <option value="" disabled>
                        {{ t('COMMON.SELECT_PLACEHOLDER') }}
                    </option>
                    @for (option of typeOptions(); track option) {
                        <option [value]="option">{{ option }}</option>
                    }
                </select>
            </cmz-field>

            <cmz-field
                [label]="ns + '.FORM.GEOM_FILE'"
                [field]="store.form.geomFile"
                for="geomFile"
                [required]="isCreate()"
            >
                <input
                    id="geomFile"
                    type="file"
                    accept=".geojson,.json"
                    [disabled]="isDetails()"
                    (change)="onFileChange($event)"
                    class="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
                />
                @if (isDetails() && existingGeomUrl()) {
                    <p class="mt-1 text-xs text-text-muted">
                        {{ t(ns + '.FORM.GEOM_EXISTING') }}
                    </p>
                }
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
export class OpticalFiberNetworkFormComponent {
    protected readonly store = inject(OpticalFiberNetworkFormStore);
    private readonly facade = inject(OpticalFiberNetworkFacade);
    private readonly fiberConstructorFacade = inject(
        FiberConstructorSelectFacade
    );
    private readonly i18n = inject(TRANSLATION_PORT);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    protected readonly ns = T;
    protected readonly mode = this.store.mode;
    protected readonly isDetails = this.store.isDetails;
    protected readonly isCreate = this.store.isCreate;
    protected readonly existingGeomUrl = this.store.existingGeomUrl;
    protected readonly saving = computed(
        () => this.facade.actionState() === 'loading'
    );

    protected readonly fiberConstructorOptions =
        this.fiberConstructorFacade.options;
    protected readonly typeOptions = computed(() => Object.values(FiberType));
    protected readonly operatorOptions = computed(() =>
        Object.values(Operator)
    );

    private readonly params = toSignal(this.route.queryParamMap);
    private lastSeenSuccess = this.facade.actionSuccess();

    constructor() {
        this.fiberConstructorFacade.load({ forceRefresh: true });

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

    protected onFileChange(event: Event): void {
        const input = event.target as HTMLInputElement;
        this.store.setGeomFile(input.files?.[0] ?? null);
    }

    protected onSubmit(event: Event): void {
        event.preventDefault();
        if (this.store.form().invalid()) {
            return;
        }
        const { name, operator, fiberConstructorId, type, geomFile } =
            this.store.model();
        const payload = {
            name,
            operator: operator || undefined,
            fiberConstructorId,
            type: type || undefined,
            geomFile: geomFile ?? undefined,
        };
        if (this.mode() === 'edit') {
            const uniqId = this.params()?.get('uniqId') ?? '';
            this.facade.update({ uniqId, ...payload });
        } else {
            this.facade.create(payload);
        }
    }

    protected onCancel(): void {
        void this.router.navigate(['../'], { relativeTo: this.route });
    }
}
