import {
    Injectable,
    computed,
    effect,
    inject,
    signal,
    untracked,
} from '@angular/core';
import { disabled, form, required, validate } from '@angular/forms/signals';
import { TypeMedia } from '@cmz/shared-domain';
import {
    NewsCategoriesSelectFacade,
    NewsFindOneFacade,
} from '@cmz/content-management-application';
import { FormMode } from './form-mode.type';

interface NewsFormModel {
    type: TypeMedia | '';
    image: File | null;
    video: string;
    category: string;
    subCategory: string;
    hashtags: string[];
    title: string;
    resume: string;
    content: string;
}

/**
 * Store de formulaire `news` — Signal Forms. `type` pilote `image`/`video`
 * en exclusif (validate() croisé, même règle que le domaine
 * `assertValidMediaPair`, dupliquée ici côté formulaire pour un retour
 * immédiat à l'utilisateur). `category`/`subCategory` : select en cascade
 * (options résolues ici via `NewsCategoriesSelectFacade` pour que la règle
 * `disabled()` de `subCategory` — qui doit désactiver le champ à la fois en
 * mode détails ET quand aucune sous-catégorie n'est disponible — reste dans
 * le schema Signal Forms plutôt qu'un `[disabled]` manuel sur l'élément :
 * `ngc --strictTemplates` (NG8022) interdit `[disabled]` sur un nœud portant
 * `[formField]`, tout le disabled doit transiter par `disabled()`). `content`
 * en textarea simple (pas d'éditeur riche, cf. décision documentée).
 */
@Injectable()
export class NewsFormStore {
    private readonly findOne = inject(NewsFindOneFacade);
    private readonly categoriesFacade = inject(NewsCategoriesSelectFacade);

    readonly mode = signal<FormMode>('create');
    readonly isDetails = computed(() => this.mode() === 'details');
    readonly loading = this.findOne.isLoading;
    readonly findOneItem = this.findOne.value;

    readonly model = signal<NewsFormModel>({
        type: '',
        image: null,
        video: '',
        category: '',
        subCategory: '',
        hashtags: [],
        title: '',
        resume: '',
        content: '',
    });

    readonly categoryOptions = this.categoriesFacade.categories;
    readonly subCategoryOptions = computed(() => {
        const selected = this.model().category;
        return (
            this.categoriesFacade.categories().find((c) => c.value === selected)
                ?.subCategories ?? []
        );
    });

    readonly form = form(this.model, (schema) => {
        required(schema.type, { message: 'COMMON.VALIDATION.REQUIRED' });
        required(schema.category, { message: 'COMMON.VALIDATION.REQUIRED' });
        required(schema.title, { message: 'COMMON.VALIDATION.REQUIRED' });
        required(schema.resume, { message: 'COMMON.VALIDATION.REQUIRED' });
        required(schema.content, { message: 'COMMON.VALIDATION.REQUIRED' });
        validate(schema.image, (ctx) =>
            ctx.valueOf(schema.type) === TypeMedia.IMAGE && !ctx.value()
                ? { kind: 'required', message: 'COMMON.VALIDATION.REQUIRED' }
                : undefined
        );
        validate(schema.video, (ctx) =>
            ctx.valueOf(schema.type) === TypeMedia.VIDEO && !ctx.value()
                ? { kind: 'required', message: 'COMMON.VALIDATION.REQUIRED' }
                : undefined
        );
        disabled(schema.type, () => this.isDetails());
        disabled(schema.image, () => this.isDetails());
        disabled(schema.video, () => this.isDetails());
        disabled(schema.category, () => this.isDetails());
        disabled(
            schema.subCategory,
            () => this.isDetails() || !this.subCategoryOptions().length
        );
        disabled(schema.hashtags, () => this.isDetails());
        disabled(schema.title, () => this.isDetails());
        disabled(schema.resume, () => this.isDetails());
        disabled(schema.content, () => this.isDetails());
    });

    readonly isValid = computed(() => this.form().valid());

    constructor() {
        effect(() => {
            const item = this.findOne.value();
            if (this.mode() === 'create' || !item) {
                return;
            }
            untracked(() =>
                this.model.set({
                    type: item.type,
                    image: null,
                    video: item.video ?? '',
                    category: item.category,
                    subCategory: item.subCategory,
                    hashtags: item.hashtags,
                    title: item.title,
                    resume: item.resume,
                    content: item.content,
                })
            );
        });
    }

    setMode(uniqId: string | null, mode: FormMode): void {
        this.mode.set(mode);
        if (mode === 'create') {
            this.reset();
            return;
        }
        if (uniqId) {
            this.findOne.read({ uniqId }, { forceRefresh: true });
        }
    }

    setType(type: TypeMedia): void {
        this.model.update((m) => ({ ...m, type, image: null, video: '' }));
    }

    setImage(file: File | null): void {
        this.model.update((m) => ({ ...m, image: file }));
    }

    setCategory(category: string): void {
        this.model.update((m) => ({ ...m, category, subCategory: '' }));
    }

    addHashtag(raw: string): void {
        const value = raw.trim().replace(/^#/, '');
        if (!value || this.model().hashtags.includes(value)) {
            return;
        }
        this.model.update((m) => ({ ...m, hashtags: [...m.hashtags, value] }));
    }

    removeHashtag(value: string): void {
        this.model.update((m) => ({
            ...m,
            hashtags: m.hashtags.filter((h) => h !== value),
        }));
    }

    reset(): void {
        this.model.set({
            type: '',
            image: null,
            video: '',
            category: '',
            subCategory: '',
            hashtags: [],
            title: '',
            resume: '',
            content: '',
        });
        this.mode.set('create');
    }
}
