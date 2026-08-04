import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormField } from '@angular/forms/signals';
import { ActivatedRoute, Router } from '@angular/router';
import { Platform } from '@cmz/shared-domain';
import { HomeFacade } from '@cmz/content-management-application';
import { TranslationPort } from '@cmz/shared-application';
import { FieldComponent, FormMode, PLATFORM_OPTIONS } from '@cmz/shared-ui';
import { HomeFormStore } from '../stores/home-form.store';

const T = 'CONTENT_MANAGEMENT.HOME';

/**
 * Formulaire `home` — Signal Forms. `platforms` en cases à cocher (même
 * pattern que `teams.reportTypes`) ; `image` en `<input type="file">` natif
 * (même pattern que `optical-fiber-network.geomFile`) ; `startDate`/
 * `endDate` en `<input type="date">` (même pattern que
 * `radio-relay-links`) ; `buttonLabel`/`buttonUrl` : paire CTA optionnelle
 * mais complète, validée en croisé côté store. `content` en textarea simple
 * (décision documentée, pas d'éditeur riche).
 */
@Component({
    selector: 'cmz-home-form',
    imports: [FormField, FieldComponent],
    providers: [HomeFormStore],
    template: `
        <form (submit)="onSubmit($event)" class="flex max-w-2xl flex-col gap-4">
            <h1 class="text-lg font-semibold text-text">
                {{ t(ns + '.FORM.TITLE.' + mode().toUpperCase()) }}
            </h1>

            <cmz-field
                [label]="ns + '.FORM.TITLE_FIELD'"
                [field]="store.form.title"
                for="title"
                [required]="true"
            >
                <input
                    id="title"
                    [formField]="store.form.title"
                    class="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
                />
            </cmz-field>

            <cmz-field
                [label]="ns + '.FORM.RESUME'"
                [field]="store.form.resume"
                for="resume"
                [required]="true"
            >
                <textarea
                    id="resume"
                    rows="2"
                    [formField]="store.form.resume"
                    class="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
                ></textarea>
            </cmz-field>

            <cmz-field
                [label]="ns + '.FORM.CONTENT'"
                [field]="store.form.content"
                for="content"
                [required]="true"
            >
                <textarea
                    id="content"
                    rows="8"
                    [formField]="store.form.content"
                    class="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
                ></textarea>
            </cmz-field>

            <cmz-field
                [label]="ns + '.FORM.IMAGE'"
                [field]="store.form.image"
                for="image"
                [required]="isCreate()"
            >
                <input
                    id="image"
                    type="file"
                    accept="image/*"
                    [disabled]="isDetails()"
                    (change)="onImageChange($event)"
                    class="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
                />
                @if (isDetails() && existingImageUrl()) {
                    <p class="mt-1 text-xs text-text-muted">
                        {{ t(ns + '.FORM.IMAGE_EXISTING') }}
                    </p>
                }
            </cmz-field>

            <cmz-field
                [label]="ns + '.FORM.PLATFORMS'"
                [field]="store.form.platforms"
                for="platforms"
                [required]="true"
            >
                <div id="platforms" class="flex flex-wrap gap-3">
                    @for (option of platformOptions; track option.value) {
                        <label class="flex items-center gap-1 text-sm">
                            <input
                                type="checkbox"
                                [checked]="isPlatformChecked(option.value)"
                                [disabled]="isDetails()"
                                (change)="store.togglePlatform(option.value)"
                            />
                            {{ t(option.label) }}
                        </label>
                    }
                </div>
            </cmz-field>

            <cmz-field
                [label]="ns + '.FORM.START_DATE'"
                [field]="store.form.startDate"
                for="startDate"
                [required]="true"
            >
                <input
                    id="startDate"
                    type="date"
                    [formField]="store.form.startDate"
                    class="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
                />
            </cmz-field>

            <cmz-field
                [label]="ns + '.FORM.END_DATE'"
                [field]="store.form.endDate"
                for="endDate"
                [required]="true"
            >
                <input
                    id="endDate"
                    type="date"
                    [formField]="store.form.endDate"
                    class="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
                />
            </cmz-field>

            <cmz-field
                [label]="ns + '.FORM.BUTTON_LABEL'"
                [field]="store.form.buttonLabel"
                for="buttonLabel"
            >
                <input
                    id="buttonLabel"
                    [formField]="store.form.buttonLabel"
                    class="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
                />
            </cmz-field>

            <cmz-field
                [label]="ns + '.FORM.BUTTON_URL'"
                [field]="store.form.buttonUrl"
                for="buttonUrl"
            >
                <input
                    id="buttonUrl"
                    [formField]="store.form.buttonUrl"
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
export class HomeFormComponent {
    protected readonly store = inject(HomeFormStore);
    private readonly facade = inject(HomeFacade);
    private readonly i18n = inject(TranslationPort);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    protected readonly ns = T;
    protected readonly mode = this.store.mode;
    protected readonly isDetails = this.store.isDetails;
    protected readonly isCreate = this.store.isCreate;
    protected readonly existingImageUrl = this.store.existingImageUrl;
    protected readonly saving = computed(
        () => this.facade.actionState() === 'loading'
    );

    protected readonly platformOptions = PLATFORM_OPTIONS;

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

    protected isPlatformChecked(value: Platform): boolean {
        return this.store.model().platforms.includes(value);
    }

    protected onImageChange(event: Event): void {
        const input = event.target as HTMLInputElement;
        this.store.setImage(input.files?.[0] ?? null);
    }

    protected onSubmit(event: Event): void {
        event.preventDefault();
        if (this.store.form().invalid()) {
            return;
        }
        const {
            title,
            resume,
            content,
            image,
            platforms,
            startDate,
            endDate,
            buttonLabel,
            buttonUrl,
        } = this.store.model();
        const payload = {
            title,
            resume,
            content,
            image: image ?? undefined,
            platforms,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            buttonLabel: buttonLabel || undefined,
            buttonUrl: buttonUrl || undefined,
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
