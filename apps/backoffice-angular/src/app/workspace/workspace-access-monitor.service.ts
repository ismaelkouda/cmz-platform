import { ErrorHandler, Injectable, effect, inject } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { SessionService, StorePathsService } from '@cmz/shared-application';
import { WorkspaceService } from '@cmz/shared-ui';
import { pathsGuard } from '../guards/paths.guard';

/**
 * Retrouve l'autorité de page effectivement utilisée par `pathsGuard`.
 * La valeur est attachée à la vue ouverte afin que le cache puisse être
 * réévalué sans inventer une deuxième table de correspondance des routes.
 */
export function workspaceAccessPath(
    routeChain: readonly ActivatedRouteSnapshot[]
): string | null {
    const guardedRoute = routeChain.find(({ routeConfig }) =>
        routeConfig?.canActivate?.includes(pathsGuard)
    );
    const segment = guardedRoute?.routeConfig?.path;
    return segment ? `/${segment}` : null;
}

/**
 * Réconcilie les vues vivantes avec les chemins émis par la session.
 *
 * Le monitor observe aussi le registre du workspace : une route qui aurait
 * contourné un guard par erreur est donc retirée dès son enregistrement. Les
 * traitements sont sérialisés pour qu'une rafale de mises à jour ne ferme pas
 * deux fois le même handle. Si aucune navigation sûre n'est possible, toute la
 * frontière workspace est purgée et la session est fermée (fail-closed).
 */
@Injectable({ providedIn: 'root' })
export class WorkspaceAccessMonitor {
    private readonly paths = inject(StorePathsService);
    private readonly workspace = inject(WorkspaceService);
    private readonly session = inject(SessionService);
    private readonly errorHandler = inject(ErrorHandler);
    private reconciliationScheduled = false;

    constructor() {
        effect(() => {
            const ready = this.paths.ready();
            const allowedPaths = this.paths.paths();
            const views = this.workspace.views();
            if (!ready) return;

            const allowed = new Set(allowedPaths ?? []);
            if (
                views.some(
                    ({ accessPath }) =>
                        accessPath !== null && !allowed.has(accessPath)
                )
            ) {
                this.scheduleReconciliation();
            }
        });
    }

    private scheduleReconciliation(): void {
        if (this.reconciliationScheduled) return;
        this.reconciliationScheduled = true;
        queueMicrotask(() => void this.reconcile());
    }

    private async reconcile(): Promise<void> {
        try {
            const revokedIds = this.revokedIds();
            if (revokedIds.length === 0) return;

            let revoked = false;
            try {
                revoked = await this.workspace.revokeAccess(revokedIds);
            } catch (error) {
                this.errorHandler.handleError(error);
            }
            if (!revoked) await this.failClosed();
        } finally {
            this.reconciliationScheduled = false;
            if (this.revokedIds().length > 0) {
                this.scheduleReconciliation();
            }
        }
    }

    private revokedIds(): string[] {
        if (!this.paths.ready()) return [];
        const allowed = new Set(this.paths.paths() ?? []);
        return this.workspace
            .views()
            .filter(
                ({ accessPath }) =>
                    accessPath !== null && !allowed.has(accessPath)
            )
            .map(({ id }) => id);
    }

    private async failClosed(): Promise<void> {
        this.workspace.clearForSecurityBoundary();
        try {
            await this.session.clear();
        } catch (error) {
            // `SessionService.clear()` recharge dans un finally. L'erreur de
            // stockage reste néanmoins visible pour l'observabilité.
            this.errorHandler.handleError(error);
        }
    }
}
