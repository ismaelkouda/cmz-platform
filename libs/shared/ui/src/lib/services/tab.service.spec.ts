import { createEnvironmentInjector } from '@angular/core';
import { Router, RouteReuseStrategy } from '@angular/router';
import { STORAGE_PORT } from '@cmz/shared-application';
import { StoragePort } from '@cmz/shared-domain';
import { describe, expect, it, vi } from 'vitest';
import { CustomRouteReuseStrategy } from '../route-strategies/custom-route-reuse-strategy';
import { Tab } from '../interfaces/tab.interface';
import { TabService } from './tab.service';

/**
 * T12-3 (P2, 2026-08-13) — jamais testé, gère l'état des onglets de
 * navigation (persistant via `STORAGE_PORT`, obfusqué). Le constructeur
 * lance `restore()` (async, microtask) — chaque test doit `await flush()`
 * avant d'agir, sinon la restauration écrase l'état de départ.
 */
function makeFakeStorage(initial?: Tab[]): StoragePort {
    const store = new Map<string, unknown>();
    if (initial) {
        store.set('tabs', initial);
    }
    return {
        save: vi.fn(),
        get: vi.fn(),
        remove: vi.fn((key: string) => store.delete(key)),
        hasKey: vi.fn((key: string) => store.has(key)),
        saveObfuscated: vi.fn(async (key: string, value: unknown) => {
            store.set(key, value);
        }),
        getObfuscated: vi.fn(
            async <T>(key: string) => (store.get(key) as T | undefined) ?? null
        ),
        removeKeysWithPrefix: vi.fn(),
        clearObfuscated: vi.fn(),
        clearAll: vi.fn(),
    } as StoragePort;
}

async function flush(): Promise<void> {
    await new Promise((r) => setTimeout(r, 0));
}

function createService(
    initial?: Tab[],
    routeReuseStrategy: RouteReuseStrategy = new CustomRouteReuseStrategy()
): { service: TabService; router: { navigate: ReturnType<typeof vi.fn> } } {
    const router = { navigate: vi.fn() };
    const injector = createEnvironmentInjector(
        [
            { provide: STORAGE_PORT, useValue: makeFakeStorage(initial) },
            { provide: Router, useValue: router },
            { provide: RouteReuseStrategy, useValue: routeReuseStrategy },
            TabService,
        ],
        null as never
    );
    return { service: injector.get(TabService), router };
}

describe('TabService', () => {
    it('restaure les onglets persistés au démarrage plutôt que de créer un onglet dashboard', async () => {
        const saved: Tab[] = [
            { id: 'a', title: 'A', path: '/a', active: true, closable: true },
        ];
        const { service } = createService(saved);
        await flush();

        expect(service.tabs()).toEqual(saved);
    });

    it('crée un onglet "Tableau de bord" non-closable si rien n’est persisté', async () => {
        const { service } = createService(undefined);
        await flush();

        expect(service.tabs()).toHaveLength(1);
        expect(service.tabs()[0]).toMatchObject({
            title: 'Tableau de bord',
            path: '/dashboard',
            closable: false,
        });
    });

    it('addTab() ajoute un nouvel onglet actif et désactive les autres, puis navigue', async () => {
        // createService(undefined) : [] n'est PAS traité comme "rien de
        // persisté" par restore() (saved && saved.length > 0) → tableau
        // vide déclenche quand même la création du dashboard par défaut.
        const { service, router } = createService(undefined);
        await flush();

        service.addTab('Requêtes', '/requests');

        expect(service.tabs()).toHaveLength(2);
        const added = service.tabs().find((t) => t.path === '/requests');
        expect(added).toMatchObject({
            title: 'Requêtes',
            path: '/requests',
            active: true,
        });
        expect(router.navigate).toHaveBeenCalledWith(['/requests']);
    });

    it('addTab() sur un path déjà ouvert active l’onglet existant au lieu d’en créer un doublon', async () => {
        const { service, router } = createService(undefined);
        await flush();
        service.addTab('Requêtes', '/requests');
        const countBefore = service.tabs().length;
        router.navigate.mockClear();

        service.addTab('Requêtes (bis)', '/requests');

        expect(service.tabs()).toHaveLength(countBefore);
        expect(router.navigate).toHaveBeenCalledWith(['/requests']);
    });

    it('activateTab() active l’onglet ciblé et désactive les autres', async () => {
        const { service, router } = createService(undefined);
        await flush();
        service.addTab('A', '/a');
        service.addTab('B', '/b');
        router.navigate.mockClear();

        const idA = service.tabs().find((t) => t.path === '/a')?.id;
        service.activateTab(idA as string);

        const tabs = service.tabs();
        expect(tabs.find((t) => t.path === '/a')?.active).toBe(true);
        expect(tabs.find((t) => t.path === '/b')?.active).toBe(false);
        expect(router.navigate).toHaveBeenCalledWith(['/a']);
    });

    it('closeTab() ignore un onglet non-closable (dashboard)', async () => {
        const { service } = createService(undefined);
        await flush();
        const dashboardId = service.tabs()[0].id;

        service.closeTab(dashboardId);

        expect(service.tabs()).toHaveLength(1);
    });

    it('closeTab() retire un onglet fermable et active le suivant si c’était l’onglet actif', async () => {
        const { service, router } = createService(undefined);
        await flush();
        service.addTab('A', '/a');
        service.addTab('B', '/b');
        const idB = service.tabs().find((t) => t.path === '/b')?.id;
        router.navigate.mockClear();

        service.closeTab(idB as string);

        const tabs = service.tabs();
        expect(tabs.some((t) => t.path === '/b')).toBe(false);
        const lastTab = tabs[tabs.length - 1];
        expect(lastTab.path).toBe('/a');
        expect(lastTab.active).toBe(true);
        expect(router.navigate).toHaveBeenCalledWith(['/a']);
    });

    it('closeTab() appelle clearHandle() sur la stratégie si c’est une CustomRouteReuseStrategy', async () => {
        const strategy = new CustomRouteReuseStrategy();
        const clearSpy = vi.spyOn(strategy, 'clearHandle');
        const { service } = createService(undefined, strategy);
        await flush();
        service.addTab('A', '/a');

        const idA = service.tabs().find((t) => t.path === '/a')?.id;
        service.closeTab(idA as string);

        expect(clearSpy).toHaveBeenCalledWith('/a');
    });

    it('closeAllTabsExceptDashboard() ne garde que l’onglet dashboard et navigue dessus', async () => {
        const { service, router } = createService(undefined);
        await flush();
        service.addTab('A', '/a');
        router.navigate.mockClear();

        service.closeAllTabsExceptDashboard();

        expect(service.tabs()).toHaveLength(1);
        expect(service.tabs()[0].path).toBe('/dashboard');
        expect(service.tabs()[0].active).toBe(true);
        expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    });

    it('closeAllTabsExceptDashboard() ne fait rien si le dashboard n’a jamais existé dans l’état courant', async () => {
        const { service, router } = createService([
            { id: '_a', title: 'A', path: '/a', active: true, closable: true },
        ]);
        await flush();
        router.navigate.mockClear();

        service.closeAllTabsExceptDashboard();

        expect(service.tabs()).toHaveLength(1);
        expect(service.tabs()[0].path).toBe('/a');
        expect(router.navigate).not.toHaveBeenCalled();
    });
});
