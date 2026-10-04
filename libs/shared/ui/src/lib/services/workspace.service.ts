import {
    Injectable,
    Signal,
    computed,
    inject,
    signal,
    untracked,
} from '@angular/core';
import { Router } from '@angular/router';
import {
    WorkspaceView,
    WorkspaceViewLifecycle,
    WorkspaceViewRegistration,
} from '../interfaces/workspace-view.interface';
import { WorkspaceRouteReuseStrategy } from '../route-strategies/workspace-route-reuse-strategy';
import { WORKSPACE_CONFIG } from '../tokens/workspace-config.token';

@Injectable({ providedIn: 'root' })
export class WorkspaceService {
    private readonly router = inject(Router);
    private readonly reuseStrategy = inject(WorkspaceRouteReuseStrategy);
    private readonly config = inject(WORKSPACE_CONFIG);
    private readonly state = signal<WorkspaceView[]>([]);
    private activationSequence = 0;

    readonly views = this.state.asReadonly();
    readonly activeView = computed(
        () =>
            this.state().find(({ lifecycle }) => lifecycle === 'active') ?? null
    );

    canOpen(id: string): boolean {
        return (
            this.state().some((view) => view.id === id) ||
            this.state().length < this.config.maxOpenViews
        );
    }

    registerNavigation(registration: WorkspaceViewRegistration): boolean {
        const normalized = this.normalizeRegistration(registration);
        const existing = this.state().find(({ id }) => id === normalized.id);
        if (!existing && !this.canOpen(normalized.id)) {
            return false;
        }

        const activatedAt = ++this.activationSequence;
        this.state.update((views) => {
            const next: WorkspaceView[] = views.map((view) => ({
                ...view,
                lifecycle: 'suspended',
            }));
            const index = next.findIndex(({ id }) => id === normalized.id);
            if (index >= 0) {
                next[index] = {
                    ...next[index],
                    title: normalized.title,
                    url: normalized.url,
                    accessPath: normalized.accessPath,
                    lifecycle: 'active',
                    lastActivatedAt: activatedAt,
                };
                return this.pinnedFirst(next);
            }
            return this.pinnedFirst([
                ...next,
                {
                    ...normalized,
                    pinned: normalized.pinned ?? false,
                    closable: !(normalized.pinned ?? false),
                    dirty: false,
                    lifecycle: 'active',
                    lastActivatedAt: activatedAt,
                },
            ]);
        });
        return true;
    }

    async activate(id: string): Promise<boolean> {
        const view = this.state().find((candidate) => candidate.id === id);
        return view ? this.router.navigateByUrl(view.url) : false;
    }

    markDirty(id: string, dirty: boolean): void {
        this.state.update((views) => {
            const target = views.find((view) => view.id === id);
            if (!target || target.dirty === dirty) return views;
            return views.map((view) =>
                view.id === id ? { ...view, dirty } : view
            );
        });
    }

    /**
     * Relie un état local (formulaire, éditeur…) à la vue actuellement active
     * sans obliger le composant métier à connaître l'identité de sa route.
     */
    markActiveDirty(dirty: boolean): boolean {
        // Résout la cible au moment de l'émission sans inscrire la vue active
        // comme dépendance de l'effect appelant. Sinon un switch propagerait
        // le dirty du composant suspendu vers la nouvelle vue active.
        const active = untracked(this.activeView);
        if (!active) return false;
        this.markDirty(active.id, dirty);
        return true;
    }

    lifecycle(id: string): Signal<WorkspaceViewLifecycle | null> {
        return computed(
            () => this.state().find((view) => view.id === id)?.lifecycle ?? null
        );
    }

    async close(
        id: string,
        options: { discardDirty?: boolean } = {}
    ): Promise<boolean> {
        const views = this.state();
        const target = views.find((view) => view.id === id);
        if (
            !target?.closable ||
            (target.dirty && options.discardDirty !== true)
        ) {
            return false;
        }

        if (target.lifecycle === 'suspended') {
            this.reuseStrategy.discard(id);
            this.remove(id);
            return true;
        }

        const fallback = views
            .filter((view) => view.id !== id)
            .sort(
                (left, right) => right.lastActivatedAt - left.lastActivatedAt
            )[0];
        if (!fallback) {
            return false;
        }

        this.reuseStrategy.prepareForClosure(id);
        try {
            const navigated = await this.router.navigateByUrl(fallback.url);
            if (!navigated) {
                this.reuseStrategy.cancelClosure(id);
                return false;
            }
            this.reuseStrategy.finishClosure(id);
            this.remove(id);
            return true;
        } catch (error) {
            this.reuseStrategy.cancelClosure(id);
            throw error;
        }
    }

    async closeMany(
        ids: readonly string[],
        options: { discardDirty?: boolean } = {}
    ): Promise<boolean> {
        const targets = new Set(ids);
        const views = this.state();
        const selected = views.filter((view) => targets.has(view.id));
        if (
            selected.length !== targets.size ||
            selected.some(
                (view) =>
                    !view.closable ||
                    (view.dirty && options.discardDirty !== true)
            )
        ) {
            return false;
        }

        const activeTarget = selected.find(
            ({ lifecycle }) => lifecycle === 'active'
        );
        if (activeTarget) {
            const fallback = views
                .filter((view) => !targets.has(view.id))
                .sort(
                    (left, right) =>
                        right.lastActivatedAt - left.lastActivatedAt
                )[0];
            if (!fallback) return false;

            this.reuseStrategy.prepareForClosure(activeTarget.id);
            try {
                if (!(await this.router.navigateByUrl(fallback.url))) {
                    this.reuseStrategy.cancelClosure(activeTarget.id);
                    return false;
                }
                this.reuseStrategy.finishClosure(activeTarget.id);
            } catch (error) {
                this.reuseStrategy.cancelClosure(activeTarget.id);
                throw error;
            }
        }

        for (const view of selected) {
            if (view.id !== activeTarget?.id) {
                this.reuseStrategy.discard(view.id);
            }
        }
        this.state.update((current) =>
            current.filter((view) => !targets.has(view.id))
        );
        return true;
    }

    /**
     * Détruit des vues dont l'autorisation vient d'être retirée.
     *
     * Cette frontière de sécurité ignore volontairement `closable` et `dirty` :
     * un brouillon ne peut jamais maintenir une page devenue interdite. Si la
     * vue active est ciblée, le Router rejoint d'abord une vue survivante afin
     * de détruire son instance active au lieu de la détacher. Une impossibilité
     * de sortir est signalée au coordinateur hôte, qui doit fermer la session.
     */
    async revokeAccess(ids: readonly string[]): Promise<boolean> {
        const targets = new Set(ids);
        if (targets.size === 0) return true;

        const views = this.state();
        const selected = views.filter((view) => targets.has(view.id));
        if (selected.length !== targets.size) return false;

        const activeTarget = selected.find(
            ({ lifecycle }) => lifecycle === 'active'
        );
        if (activeTarget) {
            const fallback = views
                .filter((view) => !targets.has(view.id))
                .sort(
                    (left, right) =>
                        right.lastActivatedAt - left.lastActivatedAt
                )[0];
            if (!fallback) return false;

            this.reuseStrategy.prepareForClosure(activeTarget.id);
            try {
                if (!(await this.router.navigateByUrl(fallback.url))) {
                    this.reuseStrategy.cancelClosure(activeTarget.id);
                    return false;
                }
                this.reuseStrategy.finishClosure(activeTarget.id);
            } catch (error) {
                this.reuseStrategy.cancelClosure(activeTarget.id);
                throw error;
            }
        }

        for (const view of selected) {
            if (view.id !== activeTarget?.id) {
                this.reuseStrategy.discard(view.id);
            }
        }
        this.state.update((current) =>
            current.filter((view) => !targets.has(view.id))
        );
        return true;
    }

    clearForSecurityBoundary(): void {
        this.reuseStrategy.discardAll();
        this.state.set([]);
    }

    private remove(id: string): void {
        this.state.update((views) => views.filter((view) => view.id !== id));
    }

    private normalizeRegistration(
        registration: WorkspaceViewRegistration
    ): WorkspaceViewRegistration & { accessPath: string | null } {
        if (
            !registration.id.startsWith('/') ||
            !registration.url.startsWith('/')
        ) {
            throw new Error(
                'Workspace view identities and URLs must be absolute.'
            );
        }
        return {
            ...registration,
            id: registration.id.split(/[?#]/, 1)[0],
            // L'identité ignore query/fragment, mais l'URL doit conserver le
            // contexte exact requis pour réactiver une vue (mode, uniqId…).
            url: registration.url,
            title: registration.title.trim() || registration.id,
            accessPath: registration.accessPath ?? null,
        };
    }

    private pinnedFirst(views: WorkspaceView[]): WorkspaceView[] {
        return [...views].sort(
            (left, right) => Number(right.pinned) - Number(left.pinned)
        );
    }
}
