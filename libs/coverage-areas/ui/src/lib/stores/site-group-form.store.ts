import {
    Injectable,
    computed,
    effect,
    inject,
    signal,
    untracked,
} from '@angular/core';
import { disabled, form, required } from '@angular/forms/signals';
import { SiteGroupFindOneFacade } from '@cmz/coverage-areas-application';
import { FormMode } from './form-mode.type';

interface SiteGroupFormModel {
    code: string;
    name: string;
    description: string;
}

/**
 * Store de formulaire `site-group` — **Signal Forms (Angular 22)**. Modèle en
 * signal → `form()` avec validators `required` et désactivation réactive en
 * mode `details`. En edit/details, le modèle est hydraté depuis la façade
 * find-one (`rxResource`) via un `effect`. Fourni au composant.
 */
@Injectable()
export class SiteGroupFormStore {
    private readonly findOne = inject(SiteGroupFindOneFacade);

    readonly mode = signal<FormMode>('create');
    readonly isDetails = computed(() => this.mode() === 'details');
    readonly loading = this.findOne.isLoading;

    readonly model = signal<SiteGroupFormModel>({
        code: '',
        name: '',
        description: '',
    });

    readonly form = form(this.model, (schema) => {
        required(schema.code, { message: 'COMMON.VALIDATION.REQUIRED' });
        required(schema.name, { message: 'COMMON.VALIDATION.REQUIRED' });
        disabled(schema.code, () => this.isDetails());
        disabled(schema.name, () => this.isDetails());
        disabled(schema.description, () => this.isDetails());
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
                    code: item.code,
                    name: item.name,
                    description: item.description,
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
        this.model.set({ code: '', name: '', description: '' });
        this.mode.set('create');
    }
}
