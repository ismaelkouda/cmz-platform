import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormField } from '@angular/forms/signals';
import { ActivatedRoute, Router } from '@angular/router';
import {
    ProfilesPermissionsFacade,
    ProfilesPermissionsPermissionsFacade,
} from '@cmz/settings-security-application';
import { TranslationPort } from '@cmz/shared-application';
import { FieldComponent } from '@cmz/shared-ui';
import { ProfilesPermissionsFormStore } from '../stores/profiles-permissions-form.store';
import { FormMode } from '../stores/form-mode.type';
import { PermissionTreeNodeComponent } from './permission-tree-node.component';

const T = 'SETTINGS_SECURITY.PROFILES_PERMISSIONS';

/**
 * Formulaire `profiles-permissions` — Signal Forms pour `name`/`description`,
 * arbre de permissions récursif fidèle (pas aplati, cf. décision actée)
 * rendu par `<cmz-permission-tree-node>` (auto-référencé). En création,
 * l'arbre est amorcé depuis `ProfilesPermissionsPermissionsFacade` (arbre
 * vierge) ; en édition/détails, il vient de `ProfilesPermissionsFindOneFacade`
 * (géré en interne par le store).
 */
@Component({
    selector: 'cmz-profiles-permissions-form',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormField, FieldComponent, PermissionTreeNodeComponent],
    providers: [ProfilesPermissionsFormStore],
    template: `
        <form (submit)="onSubmit($event)" class="flex max-w-2xl flex-col gap-4">
            <h1 class="text-lg font-semibold text-text">
                {{ t(ns + '.FORM.TITLE.' + mode().toUpperCase()) }}
            </h1>

            <cmz-field
                [label]="ns + '.FORM.NAME'"
                [field]="store.form.name"
                for="name"
                [required]="true"
            >
                <input
                    id="name"
                    [formField]="store.form.name"
                    class="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
                />
            </cmz-field>

            <cmz-field
                [label]="ns + '.FORM.DESCRIPTION'"
                [field]="store.form.description"
                for="description"
                [required]="true"
            >
                <textarea
                    id="description"
                    rows="3"
                    [formField]="store.form.description"
                    class="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
                ></textarea>
            </cmz-field>

            <div class="flex flex-col gap-2">
                <span class="text-sm font-medium text-text">
                    {{ t(ns + '.FORM.PERMISSIONS') }}
                </span>
                <ul class="flex flex-col gap-2">
                    @for (node of tree(); track node.key) {
                        <cmz-permission-tree-node
                            [node]="node"
                            [disabled]="isDetails()"
                            (checkedChange)="onToggleChecked($event)"
                            (actionChange)="onToggleAction($event)"
                        />
                    }
                </ul>
            </div>

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
export class ProfilesPermissionsFormComponent {
    protected readonly store = inject(ProfilesPermissionsFormStore);
    private readonly facade = inject(ProfilesPermissionsFacade);
    private readonly permissionsFacade = inject(
        ProfilesPermissionsPermissionsFacade
    );
    private readonly i18n = inject(TranslationPort);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    protected readonly ns = T;
    protected readonly mode = this.store.mode;
    protected readonly isDetails = this.store.isDetails;
    protected readonly tree = this.store.tree;
    protected readonly saving = computed(
        () => this.facade.actionState() === 'loading'
    );

    private readonly params = toSignal(this.route.queryParamMap);
    private lastSeenSuccess = this.facade.actionSuccess();

    constructor() {
        const params = this.params();
        const uniqId = params?.get('uniqId') ?? null;
        const ref = (params?.get('ref') as FormMode) ?? 'create';
        this.store.setMode(uniqId, ref);

        if (ref === 'create') {
            this.permissionsFacade.load({ forceRefresh: true });
        }

        effect(() => {
            this.store.seedTreeIfEmpty(this.permissionsFacade.permissions());
        });

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

    protected onToggleChecked(key: string): void {
        this.store.toggleChecked(key);
    }

    protected onToggleAction(event: { key: string; action: string }): void {
        this.store.toggleAction(event.key, event.action);
    }

    protected onSubmit(event: Event): void {
        event.preventDefault();
        if (this.store.form().invalid()) {
            return;
        }
        const { name, description } = this.store.model();
        const permissions = this.store.toPermissionsPayload();
        const payload = { name, description, permissions };
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
