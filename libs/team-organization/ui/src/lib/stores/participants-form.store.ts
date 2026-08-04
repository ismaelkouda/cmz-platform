import {
    Injectable,
    computed,
    effect,
    inject,
    signal,
    untracked,
} from '@angular/core';
import { disabled, form, required } from '@angular/forms/signals';
import { ParticipantsFindOneFacade } from '@cmz/team-organization-application';
import { Role } from '@cmz/shared-domain';
import { FormMode } from '@cmz/shared-ui';

interface ParticipantsFormModel {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    role: Role | '';
    /** uniqId de l'équipe sélectionnée (`''` si aucune). */
    team: string;
}

/**
 * Store de formulaire `participants` — Signal Forms. `role`/`team` restent
 * optionnels (aucun `required()`), fidèle au contrat domaine. Le statut
 * n'est pas éditable ici — géré par les actions dédiées enable/disable
 * (cf. décision domaine `ParticipantsRepository`).
 */
@Injectable()
export class ParticipantsFormStore {
    private readonly findOne = inject(ParticipantsFindOneFacade);

    readonly mode = signal<FormMode>('create');
    readonly isDetails = computed(() => this.mode() === 'details');
    readonly loading = this.findOne.isLoading;

    readonly model = signal<ParticipantsFormModel>({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        role: '',
        team: '',
    });

    readonly form = form(this.model, (schema) => {
        required(schema.firstName, { message: 'COMMON.VALIDATION.REQUIRED' });
        required(schema.lastName, { message: 'COMMON.VALIDATION.REQUIRED' });
        required(schema.email, { message: 'COMMON.VALIDATION.REQUIRED' });
        required(schema.phone, { message: 'COMMON.VALIDATION.REQUIRED' });
        disabled(schema.firstName, () => this.isDetails());
        disabled(schema.lastName, () => this.isDetails());
        disabled(schema.email, () => this.isDetails());
        disabled(schema.phone, () => this.isDetails());
        disabled(schema.role, () => this.isDetails());
        disabled(schema.team, () => this.isDetails());
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
                    firstName: item.firstName,
                    lastName: item.lastName,
                    email: item.email,
                    phone: item.phone,
                    role: item.role ?? '',
                    team: item.team ?? '',
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
        this.model.set({
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            role: '',
            team: '',
        });
        this.mode.set('create');
    }
}
