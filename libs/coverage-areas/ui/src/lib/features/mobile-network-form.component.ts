import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormField } from '@angular/forms/signals';
import { ActivatedRoute, Router } from '@angular/router';
import {
    MobileNetworkFacade,
    SiteGroupSelectFacade,
    TowerTypeSelectFacade,
} from '@cmz/coverage-areas-application';
import { Operator, Technology } from '@cmz/coverage-areas-domain';
import { FieldComponent, FormMode } from '@cmz/shared-ui';
import { TRANSLATION_PORT } from '@cmz/shared-application';
import { MobileNetworkFormStore } from '../stores/mobile-network-form.store';

const T = 'COVERAGE_AREAS.MOBILE_NETWORK';

/**
 * Formulaire `mobile-network` — **Signal Forms (Angular 22)**. `siteId`/
 * `siteName` restent des champs texte libres (fidèle au source, cf. plan) ;
 * `infrastructureType` et `towerTypeId` sont des selects alimentés
 * respectivement par `SiteGroupSelectFacade` et `TowerTypeSelectFacade` ;
 * `technology` est une multi-sélection (cases à cocher, cf. store).
 */
@Component({
    selector: 'cmz-mobile-network-form',
    imports: [FormField, FieldComponent],
    providers: [MobileNetworkFormStore],
    template: `
        <form (submit)="onSubmit($event)" class="flex max-w-2xl flex-col gap-4">
            <h1 class="text-lg font-semibold text-text">
                {{ t(ns + '.FORM.TITLE.' + mode().toUpperCase()) }}
            </h1>

            <cmz-field
                [label]="ns + '.FORM.SITE_ID'"
                [field]="store.form.siteId"
                for="siteId"
                [required]="true"
            >
                <input
                    id="siteId"
                    [formField]="store.form.siteId"
                    class="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
                />
            </cmz-field>

            <cmz-field
                [label]="ns + '.FORM.SITE_NAME'"
                [field]="store.form.siteName"
                for="siteName"
                [required]="true"
            >
                <input
                    id="siteName"
                    [formField]="store.form.siteName"
                    class="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
                />
            </cmz-field>

            <cmz-field
                [label]="ns + '.FORM.INFRASTRUCTURE_TYPE'"
                [field]="store.form.infrastructureType"
                for="infrastructureType"
                [required]="true"
            >
                <select
                    id="infrastructureType"
                    [formField]="store.form.infrastructureType"
                    class="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
                >
                    <option value="" disabled>
                        {{ t('COMMON.SELECT_PLACEHOLDER') }}
                    </option>
                    @for (option of siteGroupOptions(); track option.value) {
                        <option [value]="option.value">
                            {{ option.label }}
                        </option>
                    }
                </select>
            </cmz-field>

            <cmz-field
                [label]="ns + '.FORM.TOWER_TYPE'"
                [field]="store.form.towerTypeId"
                for="towerTypeId"
                [required]="true"
            >
                <select
                    id="towerTypeId"
                    [formField]="store.form.towerTypeId"
                    class="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
                >
                    <option value="" disabled>
                        {{ t('COMMON.SELECT_PLACEHOLDER') }}
                    </option>
                    @for (option of towerTypeOptions(); track option.value) {
                        <option [value]="option.value">
                            {{ option.label }}
                        </option>
                    }
                </select>
            </cmz-field>

            <cmz-field
                [label]="ns + '.FORM.TOWER_SIZE'"
                [field]="store.form.towerSize"
                for="towerSize"
                [required]="true"
            >
                <input
                    id="towerSize"
                    type="number"
                    [formField]="store.form.towerSize"
                    class="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
                />
            </cmz-field>

            <cmz-field
                [label]="ns + '.FORM.TECHNOLOGY'"
                [field]="store.form.technology"
                for="technology"
                [required]="true"
            >
                <div id="technology" class="flex flex-wrap gap-3">
                    @for (option of technologyOptions(); track option) {
                        <label class="flex items-center gap-1 text-sm">
                            <input
                                type="checkbox"
                                [checked]="isTechnologyChecked(option)"
                                [disabled]="isDetails()"
                                (change)="store.toggleTechnology(option)"
                            />
                            {{ option }}
                        </label>
                    }
                </div>
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
                [label]="ns + '.FORM.RADIUS'"
                [field]="store.form.radius"
                for="radius"
            >
                <input
                    id="radius"
                    type="number"
                    [formField]="store.form.radius"
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
export class MobileNetworkFormComponent {
    protected readonly store = inject(MobileNetworkFormStore);
    private readonly facade = inject(MobileNetworkFacade);
    private readonly siteGroupFacade = inject(SiteGroupSelectFacade);
    private readonly towerTypeFacade = inject(TowerTypeSelectFacade);
    private readonly i18n = inject(TRANSLATION_PORT);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    protected readonly ns = T;
    protected readonly mode = this.store.mode;
    protected readonly isDetails = this.store.isDetails;
    protected readonly saving = computed(
        () => this.facade.actionState() === 'loading'
    );

    protected readonly siteGroupOptions = this.siteGroupFacade.options;
    protected readonly towerTypeOptions = this.towerTypeFacade.options;
    protected readonly technologyOptions = computed(() =>
        Object.values(Technology)
    );
    protected readonly operatorOptions = computed(() =>
        Object.values(Operator)
    );

    private readonly params = toSignal(this.route.queryParamMap);
    private lastSeenSuccess = this.facade.actionSuccess();

    constructor() {
        this.siteGroupFacade.load({ forceRefresh: true });
        this.towerTypeFacade.load({ forceRefresh: true });

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

    protected isTechnologyChecked(value: Technology): boolean {
        return this.store.model().technology.includes(value);
    }

    protected onSubmit(event: Event): void {
        event.preventDefault();
        if (this.store.form().invalid()) {
            return;
        }
        const {
            siteId,
            siteName,
            infrastructureType,
            towerTypeId,
            towerSize,
            technology,
            operator,
            radius,
        } = this.store.model();
        const payload = {
            siteId,
            siteName,
            infrastructureType,
            towerTypeId,
            towerSize: towerSize ?? undefined,
            technology,
            operator: operator || undefined,
            radius: radius ?? undefined,
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
