import { Injectable } from '@angular/core';
import {
    ActivatedRouteSnapshot,
    DetachedRouteHandle,
    Route,
    RouteReuseStrategy,
    destroyDetachedRouteHandle,
} from '@angular/router';

export const WORKSPACE_ROOT_DATA_KEY = 'workspaceRoot';

function declaresPageComponent(route: ActivatedRouteSnapshot): boolean {
    return (
        route.routeConfig?.component != null ||
        route.routeConfig?.loadComponent != null
    );
}

/** Retourne l'identité URL d'une route composant située sous le shell workspace. */
export function workspaceRouteId(route: ActivatedRouteSnapshot): string | null {
    const rootIndex = route.pathFromRoot.findIndex(
        (candidate) => candidate.data?.[WORKSPACE_ROOT_DATA_KEY] === true
    );
    if (rootIndex < 0 || route.pathFromRoot[rootIndex] === route) {
        return null;
    }

    // Un seul handle doit posséder tout l'arbre d'une vue. Si une page ajoute
    // plus tard un composant routé enfant, détacher aussi ce descendant sous la
    // même URL écraserait (et détruirait) le handle parent. Le premier segment
    // porteur d'un composant sous le shell est donc l'unique frontière cacheable.
    const firstComponentRoute = route.pathFromRoot
        .slice(rootIndex + 1)
        // La déclaration de route est l'autorité. Angular peut affecter un
        // composant d'outlet interne au snapshot d'un conteneur loadChildren ;
        // le prendre pour une page rattacherait son ancien enfant à une URL
        // sœur (URL `/form`, DOM toujours `/list`).
        .find(declaresPageComponent);
    if (firstComponentRoute !== route) {
        return null;
    }

    const segments = route.pathFromRoot.flatMap((candidate) =>
        candidate.url.map(({ path }) => path)
    );
    return `/${segments.map(encodeURIComponent).join('/')}`;
}

/**
 * Cache sélectif du workspace. Les handles sont détruits explicitement à la
 * fermeture ; aucune comparaison partielle de chemin n'est autorisée.
 */
@Injectable({ providedIn: 'root' })
export class WorkspaceRouteReuseStrategy implements RouteReuseStrategy {
    private readonly handles = new Map<string, DetachedRouteHandle>();
    private readonly closing = new Set<string>();

    shouldDetach(route: ActivatedRouteSnapshot): boolean {
        const id = workspaceRouteId(route);
        return id !== null && !this.closing.has(id);
    }

    store(
        route: ActivatedRouteSnapshot,
        handle: DetachedRouteHandle | null
    ): void {
        const id = workspaceRouteId(route);
        if (!id) {
            return;
        }
        if (handle === null) {
            // Angular reprend la propriété du handle juste après cet appel
            // lorsqu'il rattache la vue. Le supprimer de la Map est requis ;
            // le détruire ici invaliderait la View avant RouterOutlet.attach().
            this.handles.delete(id);
            return;
        }

        const previous = this.handles.get(id);
        if (previous && previous !== handle) {
            destroyDetachedRouteHandle(previous);
        }
        this.handles.set(id, handle);
    }

    shouldAttach(route: ActivatedRouteSnapshot): boolean {
        const id = workspaceRouteId(route);
        return id !== null && this.handles.has(id);
    }

    retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
        const id = workspaceRouteId(route);
        return id ? (this.handles.get(id) ?? null) : null;
    }

    shouldReuseRoute(
        future: ActivatedRouteSnapshot,
        current: ActivatedRouteSnapshot
    ): boolean {
        const futureId = workspaceRouteId(future);
        const currentId = workspaceRouteId(current);
        if (futureId || currentId) {
            return (
                future.routeConfig === current.routeConfig &&
                futureId === currentId
            );
        }
        return future.routeConfig === current.routeConfig;
    }

    retrieveStoredRouteHandles(): DetachedRouteHandle[] {
        return [...this.handles.values()];
    }

    shouldDestroyInjector(_route: Route): boolean {
        return true;
    }

    prepareForClosure(id: string): void {
        this.closing.add(id);
    }

    finishClosure(id: string): void {
        this.closing.delete(id);
        this.discard(id);
    }

    cancelClosure(id: string): void {
        this.closing.delete(id);
    }

    discard(id: string): void {
        const handle = this.handles.get(id);
        if (handle) {
            destroyDetachedRouteHandle(handle);
            this.handles.delete(id);
        }
    }

    discardAll(): void {
        for (const id of [...this.handles.keys()]) {
            this.discard(id);
        }
    }

    has(id: string): boolean {
        return this.handles.has(id);
    }
}
