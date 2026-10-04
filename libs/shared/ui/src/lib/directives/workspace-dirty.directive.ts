import { Directive, Input, inject } from '@angular/core';
import { WorkspaceService } from '../services/workspace.service';

/**
 * Synchronise l'état modifié d'une surface avec l'onglet workspace actif.
 *
 * La directive reste volontairement indépendante d'une technologie de
 * formulaire : Signal Forms, Reactive Forms ou un éditeur spécialisé peuvent
 * tous lui fournir un simple booléen.
 *
 * @example
 * <form [cmzWorkspaceDirty]="form().dirty()">…</form>
 */
@Directive({ selector: '[cmzWorkspaceDirty]' })
export class WorkspaceDirtyDirective {
    private readonly workspace = inject(WorkspaceService);

    @Input({ alias: 'cmzWorkspaceDirty', required: true })
    set dirty(dirty: boolean) {
        this.workspace.markActiveDirty(dirty);
    }
}
