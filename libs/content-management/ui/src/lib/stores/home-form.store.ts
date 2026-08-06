import {
    Injectable,
    computed,
    effect,
    inject,
    signal,
    untracked,
} from '@angular/core';
import { disabled, form, required, validate } from '@angular/forms/signals';
import { Platform } from '@cmz/shared-domain';
import { HomeFindOneFacade } from '@cmz/content-management-application';
import { FormMode } from '@cmz/shared-ui';

interface HomeFormModel {
    title: string;
    resume: string;
    content: string;
    image: File | null;
    platforms: Platform[];
    /** Dates en chaîne `YYYY-MM-DD` — même précédent que
     * `radio-relay-links-form.store.ts` (liaison native `<input type="date">`,
     * conversion en `Date` déléguée au domaine via `DatePeriod.create()`). */
    startDate: string;
    endDate: string;
    buttonLabel: string;
    buttonUrl: string;
}

function toDateInputValue(date: Date): string {
    return date.toISOString().slice(0, 10);
}

/**
 * Store de formulaire `home` — Signal Forms. `image` : upload fichier natif
 * hors `[formField]`, requis en création seulement (même pattern que
 * `optical-fiber-network.geomFile`). `platforms` : cases à cocher, validées
 * par longueur (même pattern que `teams.reportTypes`). `buttonLabel`/
 * `buttonUrl` : paire optionnelle mais complète — `validate()` croisé
 * dupliquant `assertButtonPairComplete` (domaine) côté formulaire pour un
 * retour immédiat. `content` en textarea simple (décision documentée, pas
 * d'éditeur riche).
 */
@Injectable()
export class HomeFormStore {
    private readonly findOne = inject(HomeFindOneFacade);

    readonly mode = signal<FormMode>('create');
    readonly isDetails = computed(() => this.mode() === 'details');
    readonly isCreate = computed(() => this.mode() === 'create');
    readonly loading = this.findOne.isLoading;
    readonly existingImageUrl = signal<string | null>(null);

    readonly model = signal<HomeFormModel>({
        title: '',
        resume: '',
        content: '',
        image: null,
        platforms: [],
        startDate: '',
        endDate: '',
        buttonLabel: '',
        buttonUrl: '',
    });

    readonly form = form(this.model, (schema) => {
        required(schema.title, { message: 'COMMON.VALIDATION.REQUIRED' });
        required(schema.resume, { message: 'COMMON.VALIDATION.REQUIRED' });
        required(schema.content, { message: 'COMMON.VALIDATION.REQUIRED' });
        required(schema.startDate, { message: 'COMMON.VALIDATION.REQUIRED' });
        required(schema.endDate, { message: 'COMMON.VALIDATION.REQUIRED' });
        validate(schema.image, (ctx) =>
            this.isCreate() && !ctx.value()
                ? { kind: 'required', message: 'COMMON.VALIDATION.REQUIRED' }
                : undefined
        );
        validate(schema.platforms, (ctx) =>
            ctx.value().length > 0
                ? undefined
                : { kind: 'required', message: 'COMMON.VALIDATION.REQUIRED' }
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
        disabled(schema.title, () => this.isDetails());
        disabled(schema.resume, () => this.isDetails());
        disabled(schema.content, () => this.isDetails());
        disabled(schema.image, () => this.isDetails());
        disabled(schema.platforms, () => this.isDetails());
        disabled(schema.startDate, () => this.isDetails());
        disabled(schema.endDate, () => this.isDetails());
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
                    title: item.title,
                    resume: item.resume,
                    content: item.content,
                    image: null,
                    platforms: item.platforms,
                    startDate: toDateInputValue(item.startDate),
                    endDate: toDateInputValue(item.endDate),
                    buttonLabel: item.buttonLabel ?? '',
                    buttonUrl: item.buttonUrl ?? '',
                })
            );
            this.existingImageUrl.set(item.image ?? null);
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
            title: '',
            resume: '',
            content: '',
            image: null,
            platforms: [],
            startDate: '',
            endDate: '',
            buttonLabel: '',
            buttonUrl: '',
        });
        this.existingImageUrl.set(null);
        this.mode.set('create');
    }
}
