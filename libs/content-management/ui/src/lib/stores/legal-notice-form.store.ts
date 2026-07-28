import {
    Injectable,
    computed,
    effect,
    inject,
    signal,
    untracked,
} from '@angular/core';
import { disabled, form, required } from '@angular/forms/signals';
import { LegalNoticeFindOneFacade } from '@cmz/content-management-application';
import { FormMode } from './form-mode.type';

interface LegalNoticeFormModel {
    version: string;
    content: string;
}

/**
 * Store de formulaire legal-notice — Signal Forms. `version`/`content`
 * requis. Le statut n'est pas éditable ici — actions dédiées
 * publish/unpublish en liste.
 */
@Injectable()
export class LegalNoticeFormStore {
    private readonly findOne = inject(LegalNoticeFindOneFacade);

    readonly mode = signal<FormMode>('create');
    readonly isDetails = computed(() => this.mode() === 'details');
    readonly loading = this.findOne.isLoading;

    readonly model = signal<LegalNoticeFormModel>({
        version: '',
        content: '',
    });

    readonly form = form(this.model, (schema) => {
        required(schema.version, { message: 'COMMON.VALIDATION.REQUIRED' });
        required(schema.content, { message: 'COMMON.VALIDATION.REQUIRED' });
        disabled(schema.version, () => this.isDetails());
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
                    version: item.version,
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

    reset(): void {
        this.model.set({ version: '', content: '' });
        this.mode.set('create');
    }
}
