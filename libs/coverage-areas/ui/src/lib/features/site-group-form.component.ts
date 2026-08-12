import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormField } from '@angular/forms/signals';
import { ActivatedRoute, Router } from '@angular/router';
import { SiteGroupFacade } from '@cmz/coverage-areas-application';
import { TRANSLATION_PORT } from '@cmz/shared-application';
import { FieldComponent, FormMode } from '@cmz/shared-ui';
import { SiteGroupFormStore } from '../stores/site-group-form.store';

const T = 'COVERAGE_AREAS.SITE_GROUP';

/**
 * Formulaire `site-group` — **Signal Forms (Angular 22)**. Le schéma typé + la
 * validation vivent dans le store ; le composant lie les champs via
 * `[formField]`, affiche les erreurs via `cmz-field`, et soumet vers la façade
 * (`create`/`update`). Modes create/edit/details lus dans les query params.
 */
@Component({
    selector: 'cmz-site-group-form',
    imports: [FormField, FieldComponent],
    providers: [SiteGroupFormStore],
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
export class SiteGroupFormComponent {
    protected readonly store = inject(SiteGroupFormStore);
    private readonly facade = inject(SiteGroupFacade);
    private readonly i18n = inject(TRANSLATION_PORT);
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

        // Navigation retour au succès de la mutation (signal-idiomatique).
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
        const { code, name, description } = this.store.model();
        if (this.mode() === 'edit') {
            const uniqId = this.params()?.get('uniqId') ?? '';
            this.facade.update({ uniqId, code, name, description });
        } else {
            this.facade.create({ code, name, description });
        }
    }

    protected onCancel(): void {
        void this.router.navigate(['../'], { relativeTo: this.route });
    }
}
