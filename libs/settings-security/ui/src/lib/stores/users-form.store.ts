import {
    Injectable,
    computed,
    effect,
    inject,
    signal,
    untracked,
} from '@angular/core';
import { disabled, form, required } from '@angular/forms/signals';
import { UsersFindOneFacade } from '@cmz/settings-security-application';
import { Role } from '@cmz/shared-domain';
import { FormMode } from './form-mode.type';

interface UsersFormModel {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    /** uniqId du profil sélectionné (`''` si aucun) — non éditable en écriture pour `role` (mort côté source). */
    profileId: string;
}

/**
 * Store de formulaire `users` — Signal Forms. `role` n'est PAS dans ce
 * formulaire : champ mort en écriture côté source (`UsersCreateApiDto`/
 * `UsersUpdateApiDto` le commentent), confirmé en Phase 2/3. Le statut
 * n'est pas éditable ici — actions dédiées enable/disable en liste.
 */
@Injectable()
export class UsersFormStore {
    private readonly findOne = inject(UsersFindOneFacade);

    readonly mode = signal<FormMode>('create');
    readonly isDetails = computed(() => this.mode() === 'details');
    readonly loading = this.findOne.isLoading;

    /** Role en lecture seule (détail uniquement) — affiché mais jamais envoyé en écriture. */
    readonly currentRole = signal<Role | null>(null);

    readonly model = signal<UsersFormModel>({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        profileId: '',
    });

    readonly form = form(this.model, (schema) => {
        required(schema.firstName, { message: 'COMMON.VALIDATION.REQUIRED' });
        required(schema.lastName, { message: 'COMMON.VALIDATION.REQUIRED' });
        required(schema.email, { message: 'COMMON.VALIDATION.REQUIRED' });
        required(schema.phone, { message: 'COMMON.VALIDATION.REQUIRED' });
        required(schema.profileId, { message: 'COMMON.VALIDATION.REQUIRED' });
        disabled(schema.firstName, () => this.isDetails());
        disabled(schema.lastName, () => this.isDetails());
        disabled(schema.email, () => this.isDetails());
        disabled(schema.phone, () => this.isDetails());
        disabled(schema.profileId, () => this.isDetails());
    });

    readonly isValid = computed(() => this.form().valid());

    constructor() {
        effect(() => {
            const item = this.findOne.value();
            if (this.mode() === 'create' || !item) {
                return;
            }
            untracked(() => {
                this.model.set({
                    firstName: item.firstName,
                    lastName: item.lastName,
                    email: item.email,
                    phone: item.phone,
                    profileId: item.profile,
                });
                this.currentRole.set(item.role);
            });
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
        this.model.set({
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            profileId: '',
        });
        this.currentRole.set(null);
        this.mode.set('create');
    }
}
