import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormField } from '@angular/forms/signals';
import { ActivatedRoute, Router } from '@angular/router';
import { Platform, TypeMedia } from '@cmz/shared-domain';
import { SlideFacade } from '@cmz/content-management-application';
import { TranslationPort } from '@cmz/shared-application';
import {
    FieldComponent,
    FormMode,
    PLATFORM_OPTIONS,
    TYPE_MEDIA_OPTIONS,
} from '@cmz/shared-ui';
import { SlideFormStore } from '../stores/slide-form.store';

const T = 'CONTENT_MANAGEMENT.SLIDE';

/**
 * Formulaire `slide` — Signal Forms. Combine les patterns du module :
 * `type` pilote `image`/`video` en exclusif (comme `news-form.component.ts`),
 * `platforms` en cases à cocher (comme `home-form.component.ts`),
 * `startDate`/`endDate` en `<input type="date">`, `buttonLabel`/`buttonUrl`
 * en paire optionnelle complète, `content` en textarea simple.
 */
@Component({
    selector: 'cmz-slide-form',
    imports: [FormField, FieldComponent],
    providers: [SlideFormStore],
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
                [label]="ns + '.FORM.SUBTITLE'"
                [field]="store.form.subtitle"
                for="subtitle"
            >
                <input
                    id="subtitle"
                    [formField]="store.form.subtitle"
                    class="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
                />
            </cmz-field>

            <cmz-field
                [label]="ns + '.FORM.CONTENT'"
                [field]="store.form.content"
                for="content"
            >
                <textarea
                    id="content"
                    rows="6"
                    [formField]="store.form.content"
                    class="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
                ></textarea>
            </cmz-field>

            <cmz-field
                [label]="ns + '.FORM.TIME_DURATION'"
                [field]="store.form.timeDuration"
                for="timeDuration"
                [required]="true"
            >
                <input
                    id="timeDuration"
                    type="number"
                    [formField]="store.form.timeDuration"
                    class="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
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
                    class="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
                >
                    <option value="" disabled>
                        {{ t('COMMON.SELECT_PLACEHOLDER') }}
                    </option>
                    @for (option of typeMediaOptions; track option.value) {
                        <option [value]="option.value">
                            {{ t(option.label) }}
                        </option>
                    }
                </select>
            </cmz-field>

            @if (store.model().type === typeImage) {
                <cmz-field
                    [label]="ns + '.FORM.IMAGE'"
                    [field]="store.form.image"
                    for="image"
                    [required]="true"
                >
                    <input
                        id="image"
                        type="file"
                        accept="image/*"
                        [disabled]="isDetails()"
                        (change)="onImageChange($event)"
                        class="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
                    />
                </cmz-field>
            }

            @if (store.model().type === typeVideo) {
                <cmz-field
                    [label]="ns + '.FORM.VIDEO'"
                    [field]="store.form.video"
                    for="video"
                    [required]="true"
                >
                    <input
                        id="video"
                        [formField]="store.form.video"
                        class="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
                    />
                </cmz-field>
            }

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
export class SlideFormComponent {
    protected readonly store = inject(SlideFormStore);
    private readonly facade = inject(SlideFacade);
    private readonly i18n = inject(TranslationPort);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    protected readonly ns = T;
    protected readonly mode = this.store.mode;
    protected readonly isDetails = this.store.isDetails;
    protected readonly saving = computed(
        () => this.facade.actionState() === 'loading'
    );

    protected readonly platformOptions = PLATFORM_OPTIONS;
    protected readonly typeMediaOptions = TYPE_MEDIA_OPTIONS;
    protected readonly typeImage = TypeMedia.IMAGE;
    protected readonly typeVideo = TypeMedia.VIDEO;

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
            timeDuration,
            type,
            image,
            video,
            platforms,
            startDate,
            endDate,
            title,
            subtitle,
            content,
            buttonLabel,
            buttonUrl,
        } = this.store.model();
        const payload = {
            timeDuration: timeDuration ?? undefined,
            type: type || undefined,
            image: image ?? undefined,
            video: video || undefined,
            platforms,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            title,
            subtitle,
            content,
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
