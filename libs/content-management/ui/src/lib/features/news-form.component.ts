import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormField } from '@angular/forms/signals';
import { ActivatedRoute, Router } from '@angular/router';
import { TypeMedia } from '@cmz/shared-domain';
import {
    NewsCategoriesSelectFacade,
    NewsFacade,
} from '@cmz/content-management-application';
import { TranslationPort } from '@cmz/shared-application';
import { FieldComponent, FormMode, TYPE_MEDIA_OPTIONS } from '@cmz/shared-ui';
import { NewsFormStore } from '../stores/news-form.store';

const T = 'CONTENT_MANAGEMENT.NEWS';

/**
 * Formulaire `news` — Signal Forms. `type` (image/vidéo) pilote l'affichage
 * exclusif de `image` (upload fichier) ou `video` (URL) — même pattern que
 * `optical-fiber-network.geomFile` (input file natif hors `[formField]`).
 * `category`/`subCategory` : sélection en cascade, alimentée par
 * `NewsCategoriesSelectFacade` (concept select-only, pas de CRUD catégories
 * dans ce module) — options exposées via `store.categoryOptions`/
 * `store.subCategoryOptions` (pas de computed local ici) car le store en a
 * aussi besoin pour désactiver `subCategory` via `disabled()` : `ngc
 * --strictTemplates` (NG8022) interdit un `[disabled]` manuel sur un nœud
 * portant `[formField]`. `hashtags` : saisie libre + liste de puces (pas de
 * composant DS dédié — simplification assumée, même esprit que `content` en
 * textarea). `content`/`resume` en champs texte simples.
 */
@Component({
    selector: 'cmz-news-form',
    imports: [FormField, FieldComponent],
    providers: [NewsFormStore],
    template: `
        <form (submit)="onSubmit($event)" class="flex max-w-2xl flex-col gap-4">
            <h1 class="text-lg font-semibold text-text">
                {{ t(ns + '.FORM.TITLE.' + mode().toUpperCase()) }}
            </h1>

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
                [label]="ns + '.FORM.CATEGORY'"
                [field]="store.form.category"
                for="category"
                [required]="true"
            >
                <select
                    id="category"
                    [formField]="store.form.category"
                    (change)="onCategoryChange()"
                    class="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
                >
                    <option value="" disabled>
                        {{ t('COMMON.SELECT_PLACEHOLDER') }}
                    </option>
                    @for (
                        option of store.categoryOptions();
                        track option.value
                    ) {
                        <option [value]="option.value">
                            {{ option.label }}
                        </option>
                    }
                </select>
            </cmz-field>

            <cmz-field
                [label]="ns + '.FORM.SUB_CATEGORY'"
                [field]="store.form.subCategory"
                for="subCategory"
            >
                <select
                    id="subCategory"
                    [formField]="store.form.subCategory"
                    class="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
                >
                    <option value="">
                        {{ t('COMMON.SELECT_PLACEHOLDER') }}
                    </option>
                    @for (
                        option of store.subCategoryOptions();
                        track option.value
                    ) {
                        <option [value]="option.value">
                            {{ option.label }}
                        </option>
                    }
                </select>
            </cmz-field>

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
                [label]="ns + '.FORM.HASHTAGS'"
                [field]="store.form.hashtags"
                for="hashtags"
            >
                <div class="flex flex-wrap items-center gap-2">
                    @for (tag of store.model().hashtags; track tag) {
                        <span
                            class="flex items-center gap-1 rounded-full bg-surface-hover px-2 py-1 text-xs"
                        >
                            #{{ tag }}
                            @if (!isDetails()) {
                                <button
                                    type="button"
                                    (click)="store.removeHashtag(tag)"
                                    class="text-text-muted hover:text-danger"
                                >
                                    ×
                                </button>
                            }
                        </span>
                    }
                    @if (!isDetails()) {
                        <input
                            id="hashtags"
                            type="text"
                            [placeholder]="t(ns + '.FORM.HASHTAGS_PLACEHOLDER')"
                            (keydown.enter)="onHashtagEnter($event)"
                            class="w-40 rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus"
                        />
                    }
                </div>
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
export class NewsFormComponent {
    protected readonly store = inject(NewsFormStore);
    private readonly facade = inject(NewsFacade);
    private readonly categoriesFacade = inject(NewsCategoriesSelectFacade);
    private readonly i18n = inject(TranslationPort);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    protected readonly ns = T;
    protected readonly mode = this.store.mode;
    protected readonly isDetails = this.store.isDetails;
    protected readonly isCreate = computed(() => this.mode() === 'create');
    protected readonly saving = computed(
        () => this.facade.actionState() === 'loading'
    );

    protected readonly typeMediaOptions = TYPE_MEDIA_OPTIONS;
    protected readonly typeImage = TypeMedia.IMAGE;
    protected readonly typeVideo = TypeMedia.VIDEO;

    private readonly params = toSignal(this.route.queryParamMap);
    private lastSeenSuccess = this.facade.actionSuccess();

    constructor() {
        this.categoriesFacade.load({ forceRefresh: true });

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

    protected onImageChange(event: Event): void {
        const input = event.target as HTMLInputElement;
        this.store.setImage(input.files?.[0] ?? null);
    }

    protected onCategoryChange(): void {
        this.store.setCategory(this.store.model().category);
    }

    protected onHashtagEnter(event: Event): void {
        event.preventDefault();
        const input = event.target as HTMLInputElement;
        this.store.addHashtag(input.value);
        input.value = '';
    }

    protected onSubmit(event: Event): void {
        event.preventDefault();
        if (this.store.form().invalid()) {
            return;
        }
        const {
            type,
            image,
            video,
            category,
            subCategory,
            hashtags,
            title,
            resume,
            content,
        } = this.store.model();
        const payload = {
            type: type || undefined,
            image: image ?? undefined,
            video: video || undefined,
            category: category || undefined,
            subCategory: subCategory || undefined,
            hashtags,
            title,
            resume,
            content,
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
