import { Component, inject, input, output } from '@angular/core';
import {
    PermissionActions,
    PermissionTreeNode,
} from '@cmz/settings-security-domain';
import { permissionActionLabel } from '../constants/permission-action-label.constant';
import { TranslocoService } from '@jsverse/transloco';

/**
 * Nœud récursif de l'arbre de permissions — se référence lui-même pour
 * les enfants (`imports: [PermissionTreeNodeComponent]`). Ré-émet les
 * événements des descendants (pas de DI ambiante) : `checkedChange`
 * porte la clé du nœud coché/décoché, `actionChange` porte `{key, action}`.
 * Le composant parent (`ProfilesPermissionsFormComponent`) est seul à
 * connaître le store et applique la mutation sur l'arbre complet.
 */
@Component({
    selector: 'cmz-permission-tree-node',
    imports: [PermissionTreeNodeComponent],
    template: `
        <li class="flex flex-col gap-1">
            <label
                class="flex items-center gap-2 text-sm font-medium text-text"
            >
                <input
                    type="checkbox"
                    [checked]="node().checked"
                    [disabled]="disabled()"
                    (change)="checkedChange.emit(node().key)"
                />
                {{ node().label }}
            </label>

            @if (actionKeys().length) {
                <div class="ml-6 flex flex-wrap gap-3">
                    @for (action of actionKeys(); track action) {
                        <label
                            class="flex items-center gap-1 text-xs text-text-muted"
                        >
                            <input
                                type="checkbox"
                                [checked]="isActionChecked(action)"
                                [disabled]="disabled()"
                                (change)="
                                    actionChange.emit({
                                        key: node().key,
                                        action,
                                    })
                                "
                            />
                            {{ t(actionLabel(action)) }}
                        </label>
                    }
                </div>
            }

            @if (node().children.length) {
                <ul
                    class="ml-6 flex flex-col gap-1 border-l border-border pl-3"
                >
                    @for (child of node().children; track child.key) {
                        <cmz-permission-tree-node
                            [node]="child"
                            [disabled]="disabled()"
                            (checkedChange)="checkedChange.emit($event)"
                            (actionChange)="actionChange.emit($event)"
                        />
                    }
                </ul>
            }
        </li>
    `,
})
export class PermissionTreeNodeComponent {
    private readonly i18n = inject(TranslocoService);

    readonly node = input.required<PermissionTreeNode>();
    readonly disabled = input(false);

    readonly checkedChange = output<string>();
    readonly actionChange = output<{ key: string; action: string }>();

    protected actionKeys(): string[] {
        return Object.keys(this.node().actions);
    }

    /**
     * `PermissionActions` est un type fermé (6 clés `PermissionAction`), pas
     * un `Record<string, boolean>` — l'indexation directe par une `string`
     * de boucle (`actionKeys()`) échoue sous `strictTemplates` (TS7053,
     * remonté par `ngc`, pas par `tsc` seul qui ne type-check pas les
     * templates). Recasté ici, au seul point de jonction entre la boucle
     * générique et le type fermé.
     */
    protected isActionChecked(action: string): boolean {
        return !!this.node().actions[action as keyof PermissionActions];
    }

    protected actionLabel(action: string): string {
        return permissionActionLabel(action);
    }

    protected t(key: string): string {
        return this.i18n.translate(key);
    }
}
