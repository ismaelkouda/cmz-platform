import {
    Injectable,
    computed,
    effect,
    inject,
    signal,
    untracked,
} from '@angular/core';
import { disabled, form, required, validate } from '@angular/forms/signals';
import { Platform, TypeMedia } from '@cmz/shared-domain';
import { SlideFindOneFacade } from '@cmz/content-management-application';
import { FormMode } from '@cmz/shared-ui';

interface SlideFormModel {
    timeDuration: number | null;
    type: TypeMedia | '';
    image: File | null;
    video: string;
    platforms: Platform[];
    startDate: string;
    endDate: string;
    title: string;
    subtitle: string;
    content: string;
    buttonLabel: string;
    buttonUrl: string;
}

function toDateInputValue(date: Date): string {
    return date.toISOString().slice(0, 10);
}

/**
 * Store de formulaire `slide` — Signal Forms. Combine les patterns déjà
 * établis dans ce module : `type` pilote `image`/`video` en exclusif (même
 * `validate()` croisé que `news-form.store.ts`, dupliquant
 * `assertValidMediaPair` côté formulaire) ; `platforms` en cases à cocher
 * (`home-form.store.ts`) ; `startDate`/`endDate` en `<input type="date">`
 * (`radio-relay-links-form.store.ts`) ; `buttonLabel`/`buttonUrl` paire
 * optionnelle mais complète (`home-form.store.ts`, `assertButtonPairComplete`).
 * `content` en textarea simple (décision documentée).
 */
@Injectable()
export class SlideFormStore {
    private readonly findOne = inject(SlideFindOneFacade);

    readonly mode = signal<FormMode>('create');
    readonly isDetails = computed(() => this.mode() === 'details');
    readonly loading = this.findOne.isLoading;

    readonly model = signal<SlideFormModel>({
        timeDuration: null,
        type: '',
        image: null,
        video: '',
        platforms: [],
        startDate: '',
        endDate: '',
        title: '',
        subtitle: '',
        content: '',
        buttonLabel: '',
        buttonUrl: '',
    });

    readonly form = form(this.model, (schema) => {
        required(schema.timeDuration, {
            message: 'COMMON.VALIDATION.REQUIRED',
        });
        required(schema.type, { message: 'COMMON.VALIDATION.REQUIRED' });
        required(schema.startDate, { message: 'COMMON.VALIDATION.REQUIRED' });
        required(schema.endDate, { message: 'COMMON.VALIDATION.REQUIRED' });
        required(schema.title, { message: 'COMMON.VALIDATION.REQUIRED' });
        validate(schema.platforms, (ctx) =>
            ctx.value().length > 0
                ? undefined
                : { kind: 'required', message: 'COMMON.VALIDATION.REQUIRED' }
        );
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
        validate(schema.buttonUrl, (ctx) =>
            ctx.valueOf(schema.buttonLabel) && !ctx.value()
                ? { kind: 'required', message: 'COMMON.VALIDATION.REQUIRED' }
                : undefined
        );
        validate(schema.buttonLabel, (ctx) =>
            ctx.valueOf(schema.buttonUrl) && !ctx.value()
                ? { kind: 'required', message: 'COMMON.VALIDATION.REQUIRED' }
                : undefined
        );
        disabled(schema.timeDuration, () => this.isDetails());
        disabled(schema.type, () => this.isDetails());
        disabled(schema.image, () => this.isDetails());
        disabled(schema.video, () => this.isDetails());
        disabled(schema.platforms, () => this.isDetails());
        disabled(schema.startDate, () => this.isDetails());
        disabled(schema.endDate, () => this.isDetails());
        disabled(schema.title, () => this.isDetails());
        disabled(schema.subtitle, () => this.isDetails());
        disabled(schema.content, () => this.isDetails());
        disabled(schema.buttonLabel, () => this.isDetails());
        disabled(schema.buttonUrl, () => this.isDetails());
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
                    timeDuration: item.timeDuration,
                    type: item.type,
                    image: null,
                    video: item.video ?? '',
                    platforms: item.platforms,
                    startDate: toDateInputValue(item.startDate),
                    endDate: toDateInputValue(item.endDate),
                    title: item.title,
                    subtitle: item.subtitle,
                    content: item.content,
                    buttonLabel: item.buttonLabel ?? '',
                    buttonUrl: item.buttonUrl ?? '',
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

    togglePlatform(value: Platform): void {
        const current = this.model().platforms;
        const next = current.includes(value)
            ? current.filter((v) => v !== value)
            : [...current, value];
        this.model.update((m) => ({ ...m, platforms: next }));
    }

    reset(): void {
        this.model.set({
            timeDuration: null,
            type: '',
            image: null,
            video: '',
            platforms: [],
            startDate: '',
            endDate: '',
            title: '',
            subtitle: '',
            content: '',
            buttonLabel: '',
            buttonUrl: '',
        });
        this.mode.set('create');
    }
}
