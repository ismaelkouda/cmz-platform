import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormField } from '@angular/forms/signals';
import { ActivatedRoute, Router } from '@angular/router';
import { TermsUseFacade } from '@cmz/content-management-application';
import { TRANSLATION_PORT } from '@cmz/shared-application';
import { FieldComponent, FormMode } from '@cmz/shared-ui';
import { TermsUseFormStore } from '../stores/terms-use-form.store';

const T = 'CONTENT_MANAGEMENT.TERMS_USE';

/**
 * Formulaire terms-use — Signal Forms. `content` en textarea simple : le
 * source utilise un éditeur riche (Quill/p-editor) mais le design-system ne
 * possède aucun composant éditeur pour l'instant — simplification assumée
 * et documentée (décision utilisateur, cf. module doc), pas un nouveau
 * composant DS construit pour cette passe.
 */
@Component({
    selector: 'cmz-terms-use-form',
    imports: [FormField, FieldComponent],
    providers: [TermsUseFormStore],
    template: `
        <form (submit)="onSubmit($event)" class="flex max-w-2xl flex-col gap-4">
            <h1 class="text-lg font-semibold text-text">
                {{ t(ns + '.FORM.TITLE.' + mode().toUpperCase()) }}
            </h1>

            <cmz-field
                [label]="ns + '.FORM.VERSION'"
                [field]="store.form.version"
                for="version"
                [required]="true"
            >
                <input
                    id="version"
                    [formField]="store.form.version"
                    class="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
                />
            </cmz-field>

            <cmz-field
                [label]="ns + '.FORM.CONTENT'"
                [field]="store.form.content"
                for="content"
                [required]="true"
            >
                <textarea
                    id="content"
                    rows="10"
                    [formField]="store.form.content"
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
export class TermsUseFormComponent {
    protected readonly store = inject(TermsUseFormStore);
    private readonly facade = inject(TermsUseFacade);
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
        const { version, content } = this.store.model();
        const payload = { version, content };
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
