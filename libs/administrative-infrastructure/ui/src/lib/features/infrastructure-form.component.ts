import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormField } from '@angular/forms/signals';
import { ActivatedRoute, Router } from '@angular/router';
import { InfrastructureFacade } from '@cmz/administrative-infrastructure-application';
import { FieldComponent, FormMode } from '@cmz/shared-ui';
import { InfrastructureFormStore } from '../stores/infrastructure-form.store';
import { TranslocoService } from '@jsverse/transloco';

const T = 'ADMINISTRATIVE_INFRASTRUCTURE.INFRASTRUCTURE';

/**
 * Formulaire `infrastructure` — **Signal Forms**. Champs name/type(select)/
 * position(lat,long)/description. Le schéma typé + validation vivent dans le
 * store ; submit → façade `create`/`update` (position reconstruite en
 * `CoordinatesProps`). Retour au succès via `effect` sur `actionSuccess`.
 */
@Component({
    selector: 'cmz-infrastructure-form',
    imports: [FormField, FieldComponent],
    providers: [InfrastructureFormStore],
    template: `
        <form (submit)="onSubmit($event)" class="flex max-w-xl flex-col gap-4">
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
                    [class]="inputClass"
                />
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
                    [class]="inputClass"
                >
                    <option value="">
                        {{ t('COMMON.SELECT_PLACEHOLDER') }}
                    </option>
                    @for (opt of store.typeSelect.options(); track opt.value) {
                        <option [value]="opt.value">{{ opt.label }}</option>
                    }
                </select>
            </cmz-field>

            <div class="grid grid-cols-2 gap-4">
                <cmz-field
                    [label]="ns + '.FORM.LATITUDE'"
                    [field]="store.form.latitude"
                    for="latitude"
                    [required]="true"
                >
                    <input
                        id="latitude"
                        type="number"
                        step="any"
                        [formField]="store.form.latitude"
                        [class]="inputClass"
                    />
                </cmz-field>
                <cmz-field
                    [label]="ns + '.FORM.LONGITUDE'"
                    [field]="store.form.longitude"
                    for="longitude"
                    [required]="true"
                >
                    <input
                        id="longitude"
                        type="number"
                        step="any"
                        [formField]="store.form.longitude"
                        [class]="inputClass"
                    />
                </cmz-field>
            </div>

            <cmz-field
                [label]="ns + '.FORM.DESCRIPTION'"
                [field]="store.form.description"
                for="description"
                [required]="true"
            >
                <textarea
                    id="description"
                    rows="4"
                    [formField]="store.form.description"
                    [class]="inputClass"
                ></textarea>
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
export class InfrastructureFormComponent {
    protected readonly store = inject(InfrastructureFormStore);
    private readonly facade = inject(InfrastructureFacade);
    private readonly i18n = inject(TranslocoService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    protected readonly ns = T;
    protected readonly mode = this.store.mode;
    protected readonly isDetails = this.store.isDetails;
    protected readonly saving = computed(
        () => this.facade.actionState() === 'loading'
    );
    protected readonly inputClass =
        'w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50';

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

    protected onSubmit(event: Event): void {
        event.preventDefault();
        if (this.store.form().invalid()) {
            return;
        }
        const m = this.store.model();
        const position = {
            latitude: Number(m.latitude),
            longitude: Number(m.longitude),
        };
        if (this.mode() === 'edit') {
            const uniqId = this.params()?.get('uniqId') ?? '';
            this.facade.update({
                uniqId,
                name: m.name,
                type: m.type,
                description: m.description,
                position,
            });
        } else {
            this.facade.create({
                name: m.name,
                type: m.type,
                description: m.description,
                position,
            });
        }
    }

    protected onCancel(): void {
        void this.router.navigate(['../'], { relativeTo: this.route });
    }
}
