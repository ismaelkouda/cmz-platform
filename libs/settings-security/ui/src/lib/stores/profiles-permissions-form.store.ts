import {
    Injectable,
    computed,
    effect,
    inject,
    signal,
    untracked,
} from '@angular/core';
import { disabled, form, required } from '@angular/forms/signals';
import { PermissionTreeNode } from '@cmz/settings-security-domain';
import { ProfilesPermissionsFindOneFacade } from '@cmz/settings-security-application';
import {
    toggleNodeAction,
    toggleNodeChecked,
    treeToPermissionsPayload,
} from '../utils/permission-tree.util';
import { FormMode } from '@cmz/shared-ui';

interface ProfilesPermissionsFormModel {
    name: string;
    description: string;
}

/**
 * Store de formulaire `profiles-permissions` — Signal Forms pour
 * `name`/`description` (requis), arbre de permissions géré à part en
 * signal simple (`tree`) : la cascade tri-state n'est pas une
 * responsabilité de validation de formulaire (cf. `permission-tree.util.ts`).
 * L'arbre affichable dépend du mode : en édition/détails, il vient des
 * permissions embarquées dans `ProfilesPermissionsFindOneFacade` (état
 * réel, géré ici) ; en création, le composant l'alimente une seule fois
 * (`seedTreeIfEmpty`) depuis `ProfilesPermissionsPermissionsFacade` (arbre
 * "vierge", tout décoché) — même précédent que
 * `team-organization/TeamsPermissionsFacade`.
 */
@Injectable()
export class ProfilesPermissionsFormStore {
    private readonly findOne = inject(ProfilesPermissionsFindOneFacade);

    readonly mode = signal<FormMode>('create');
    readonly isDetails = computed(() => this.mode() === 'details');
    readonly loading = this.findOne.isLoading;

    readonly tree = signal<PermissionTreeNode[]>([]);

    readonly model = signal<ProfilesPermissionsFormModel>({
        name: '',
        description: '',
    });

    readonly form = form(this.model, (schema) => {
        required(schema.name, { message: 'COMMON.VALIDATION.REQUIRED' });
        required(schema.description, {
            message: 'COMMON.VALIDATION.REQUIRED',
        });
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
            untracked(() => {
                this.model.set({
                    name: item.name,
                    description: item.description,
                });
                this.tree.set(item.permissions);
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

    /** Amorce l'arbre (mode création uniquement) depuis la source "vierge" — ignore si déjà amorcé ou hors création. */
    seedTreeIfEmpty(nodes: PermissionTreeNode[]): void {
        if (
            this.mode() === 'create' &&
            this.tree().length === 0 &&
            nodes.length
        ) {
            this.tree.set(nodes);
        }
    }

    toggleChecked(key: string): void {
        this.tree.update((tree) => toggleNodeChecked(tree, key));
    }

    toggleAction(key: string, action: string): void {
        this.tree.update((tree) => toggleNodeAction(tree, key, action));
    }

    /** Map plate `{[nodeKey]: actionName[]}` — passthrough, cf. `permission-tree.util.ts`. */
    toPermissionsPayload(): Record<string, string[]> {
        return treeToPermissionsPayload(this.tree());
    }

    reset(): void {
        this.model.set({ name: '', description: '' });
        this.tree.set([]);
        this.mode.set('create');
    }
}
