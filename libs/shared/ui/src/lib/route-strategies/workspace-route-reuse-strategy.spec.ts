import { Type } from '@angular/core';
import { ActivatedRouteSnapshot, DetachedRouteHandle } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import {
    WORKSPACE_ROOT_DATA_KEY,
    WorkspaceRouteReuseStrategy,
    workspaceRouteId,
} from './workspace-route-reuse-strategy';

class ShellStub {}
class PageStub {}
class ChildPageStub {}
class InternalEmptyOutletStub {}

function routeTree(
    segments: string[],
    component: Type<unknown> | null = PageStub
): ActivatedRouteSnapshot {
    const root = {
        url: [],
        data: { [WORKSPACE_ROOT_DATA_KEY]: true },
        component: ShellStub,
        routeConfig: { path: '', component: ShellStub },
    } as unknown as ActivatedRouteSnapshot;
    const snapshots: ActivatedRouteSnapshot[] = [root];
    for (const [index, segment] of segments.entries()) {
        const routeComponent = index === segments.length - 1 ? component : null;
        snapshots.push({
            url: [{ path: segment }],
            data: {},
            component: routeComponent,
            routeConfig: { path: segment, component: routeComponent },
        } as unknown as ActivatedRouteSnapshot);
    }
    for (const snapshot of snapshots) {
        Object.defineProperty(snapshot, 'pathFromRoot', {
            value: snapshots.slice(0, snapshots.indexOf(snapshot) + 1),
        });
    }
    return snapshots.at(-1) as ActivatedRouteSnapshot;
}

function childRoute(
    parent: ActivatedRouteSnapshot,
    segment: string
): ActivatedRouteSnapshot {
    const child = {
        url: [{ path: segment }],
        data: {},
        component: ChildPageStub,
        routeConfig: { path: segment, component: ChildPageStub },
    } as unknown as ActivatedRouteSnapshot;
    Object.defineProperty(child, 'pathFromRoot', {
        value: [...parent.pathFromRoot, child],
    });
    return child;
}

function detachedHandle(): {
    handle: DetachedRouteHandle;
    destroy: ReturnType<typeof vi.fn>;
} {
    const destroy = vi.fn();
    return {
        handle: {
            componentRef: { destroy },
            route: { value: {} },
        } as unknown as DetachedRouteHandle,
        destroy,
    };
}

describe('WorkspaceRouteReuseStrategy', () => {
    it('identifie exactement l’URL d’un composant sous le shell', () => {
        expect(workspaceRouteId(routeTree(['settings', 'users']))).toBe(
            '/settings/users'
        );
        expect(workspaceRouteId(routeTree([]))).toBeNull();
    });

    it('ne crée qu’une frontière cacheable quand une vue contient une route composant enfant', () => {
        const parent = routeTree(['users']);
        const child = childRoute(parent, '42');

        expect(workspaceRouteId(parent)).toBe('/users');
        expect(workspaceRouteId(child)).toBeNull();
    });

    it('ignore un conteneur lazy même si Angular lui affecte un composant interne', () => {
        const leaf = routeTree(['equipments', 'types', 'list']);
        const lazyContainer = leaf.pathFromRoot[1];
        Object.defineProperty(lazyContainer, 'component', {
            value: InternalEmptyOutletStub,
        });
        Object.defineProperty(lazyContainer, 'routeConfig', {
            value: {
                path: 'equipments',
                loadChildren: async () => [],
            },
        });

        expect(workspaceRouteId(lazyContainer)).toBeNull();
        expect(workspaceRouteId(leaf)).toBe('/equipments/types/list');
    });

    it('détache, stocke et rattache le même handle', () => {
        const strategy = new WorkspaceRouteReuseStrategy();
        const route = routeTree(['users']);
        const { handle } = detachedHandle();

        expect(strategy.shouldDetach(route)).toBe(true);
        strategy.store(route, handle);

        expect(strategy.shouldAttach(route)).toBe(true);
        expect(strategy.retrieve(route)).toBe(handle);
        expect(strategy.retrieveStoredRouteHandles()).toEqual([handle]);
    });

    it('ne détache pas la vue marquée pour fermeture', () => {
        const strategy = new WorkspaceRouteReuseStrategy();
        const route = routeTree(['users']);

        strategy.prepareForClosure('/users');

        expect(strategy.shouldDetach(route)).toBe(false);
        strategy.cancelClosure('/users');
        expect(strategy.shouldDetach(route)).toBe(true);
    });

    it('détruit officiellement le composant quand un handle est abandonné', () => {
        const strategy = new WorkspaceRouteReuseStrategy();
        const route = routeTree(['users']);
        const { handle, destroy } = detachedHandle();
        strategy.store(route, handle);

        strategy.discard('/users');

        expect(destroy).toHaveBeenCalledOnce();
        expect(strategy.has('/users')).toBe(false);
    });

    it('détruit un ancien handle avant de le remplacer', () => {
        const strategy = new WorkspaceRouteReuseStrategy();
        const route = routeTree(['users']);
        const first = detachedHandle();
        const second = detachedHandle();

        strategy.store(route, first.handle);
        strategy.store(route, second.handle);

        expect(first.destroy).toHaveBeenCalledOnce();
        expect(second.destroy).not.toHaveBeenCalled();
        expect(strategy.retrieve(route)).toBe(second.handle);
    });

    it('transfère sans détruire le handle repris par le Router', () => {
        const strategy = new WorkspaceRouteReuseStrategy();
        const route = routeTree(['users']);
        const { handle, destroy } = detachedHandle();
        strategy.store(route, handle);

        strategy.store(route, null);

        expect(destroy).not.toHaveBeenCalled();
        expect(strategy.has('/users')).toBe(false);
    });

    it('ne réutilise pas une même routeConfig pour deux identités URL', () => {
        const strategy = new WorkspaceRouteReuseStrategy();
        const first = routeTree(['users', '1']);
        const second = routeTree(['users', '2']);
        Object.defineProperty(second, 'routeConfig', {
            value: first.routeConfig,
        });

        expect(strategy.shouldReuseRoute(second, first)).toBe(false);
        const routeConfig = first.routeConfig;
        expect(routeConfig).toBeDefined();
        if (!routeConfig) throw new Error('routeConfig de test absent');
        expect(strategy.shouldDestroyInjector(routeConfig)).toBe(true);
    });
});
