import { createEnvironmentInjector } from '@angular/core';
import { Router } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { WorkspaceRouteReuseStrategy } from '../route-strategies/workspace-route-reuse-strategy';
import { WORKSPACE_CONFIG } from '../tokens/workspace-config.token';
import { WorkspaceService } from './workspace.service';

function createService(maxOpenViews = 4): {
    service: WorkspaceService;
    router: { navigateByUrl: ReturnType<typeof vi.fn> };
    strategy: WorkspaceRouteReuseStrategy;
} {
    const router = { navigateByUrl: vi.fn(async () => true) };
    const injector = createEnvironmentInjector(
        [
            { provide: Router, useValue: router },
            WorkspaceRouteReuseStrategy,
            { provide: WORKSPACE_CONFIG, useValue: { maxOpenViews } },
            WorkspaceService,
        ],
        null as never
    );
    return {
        service: injector.get(WorkspaceService),
        router,
        strategy: injector.get(WorkspaceRouteReuseStrategy),
    };
}

function registerDashboard(service: WorkspaceService): void {
    service.registerNavigation({
        id: '/dashboard',
        url: '/dashboard',
        title: 'Tableau de bord',
        pinned: true,
    });
}

describe('WorkspaceService', () => {
    it('garde le dashboard épinglé en premier et une identité unique', () => {
        const { service } = createService();
        service.registerNavigation({
            id: '/users',
            url: '/users?ignored=true',
            title: 'Utilisateurs',
        });
        registerDashboard(service);
        service.registerNavigation({
            id: '/users',
            url: '/users',
            title: 'Utilisateurs renommés',
            accessPath: '/users',
        });

        expect(service.views().map(({ id }) => id)).toEqual([
            '/dashboard',
            '/users',
        ]);
        expect(service.views()[0]).toMatchObject({
            pinned: true,
            closable: false,
        });
        expect(service.activeView()?.id).toBe('/users');
        expect(service.views()[1].title).toBe('Utilisateurs renommés');
        expect(service.views()[1].url).toBe('/users');
        expect(service.views()[1].accessPath).toBe('/users');
    });

    it("conserve l'URL paramétrée tout en dédupliquant par identité canonique", () => {
        const { service } = createService();
        service.registerNavigation({
            id: '/users/form?ignored=true',
            url: '/users/form?ref=edit&uniqId=user-42',
            title: 'Modifier un utilisateur',
        });

        expect(service.views()[0]).toMatchObject({
            id: '/users/form',
            url: '/users/form?ref=edit&uniqId=user-42',
        });
    });

    it('refuse explicitement une nouvelle vue lorsque la capacité est atteinte', () => {
        const { service } = createService(2);
        registerDashboard(service);
        service.registerNavigation({ id: '/a', url: '/a', title: 'A' });

        expect(service.canOpen('/a')).toBe(true);
        expect(service.canOpen('/b')).toBe(false);
        expect(
            service.registerNavigation({ id: '/b', url: '/b', title: 'B' })
        ).toBe(false);
        expect(service.views()).toHaveLength(2);
    });

    it('expose active/suspended sans déclencher de navigation réseau', () => {
        const { service, router } = createService();
        registerDashboard(service);
        const dashboardLifecycle = service.lifecycle('/dashboard');
        service.registerNavigation({
            id: '/users',
            url: '/users',
            title: 'Users',
        });

        expect(dashboardLifecycle()).toBe('suspended');
        expect(service.lifecycle('/users')()).toBe('active');
        expect(router.navigateByUrl).not.toHaveBeenCalled();
    });

    it('active une vue existante par son URL canonique', async () => {
        const { service, router } = createService();
        registerDashboard(service);
        service.registerNavigation({
            id: '/users',
            url: '/users',
            title: 'Users',
        });

        await expect(service.activate('/dashboard')).resolves.toBe(true);
        expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard');
    });

    it('refuse de fermer une vue épinglée ou dirty', async () => {
        const { service } = createService();
        registerDashboard(service);
        service.registerNavigation({
            id: '/users',
            url: '/users',
            title: 'Users',
        });
        service.markDirty('/users', true);

        await expect(service.close('/dashboard')).resolves.toBe(false);
        await expect(service.close('/users')).resolves.toBe(false);
        expect(service.views()).toHaveLength(2);
    });

    it('marque la vue active sans exposer son identité au composant métier', () => {
        const { service } = createService();
        expect(service.markActiveDirty(true)).toBe(false);
        registerDashboard(service);

        expect(service.markActiveDirty(true)).toBe(true);
        expect(service.activeView()?.dirty).toBe(true);
    });

    it("n'émet aucun nouvel état quand le marqueur dirty est déjà identique", () => {
        const { service } = createService();
        registerDashboard(service);
        const unchanged = service.views();

        service.markDirty('/dashboard', false);

        expect(service.views()).toBe(unchanged);
    });

    it('ferme une vue active après navigation MRU réussie', async () => {
        const { service, router } = createService();
        registerDashboard(service);
        service.registerNavigation({ id: '/a', url: '/a', title: 'A' });
        service.registerNavigation({ id: '/b', url: '/b', title: 'B' });

        await expect(service.close('/b')).resolves.toBe(true);

        expect(router.navigateByUrl).toHaveBeenCalledWith('/a');
        expect(service.views().some(({ id }) => id === '/b')).toBe(false);
    });

    it('conserve la vue active si la navigation de fermeture échoue', async () => {
        const { service, router } = createService();
        registerDashboard(service);
        service.registerNavigation({
            id: '/users',
            url: '/users',
            title: 'Users',
        });
        service.markDirty('/users', true);
        router.navigateByUrl.mockResolvedValueOnce(false);

        await expect(
            service.close('/users', { discardDirty: true })
        ).resolves.toBe(false);

        expect(service.views().find(({ id }) => id === '/users')).toMatchObject(
            { dirty: true, lifecycle: 'active' }
        );
    });

    it('prévalide une fermeture groupée avant de muter une seule vue', async () => {
        const { service } = createService();
        registerDashboard(service);
        service.registerNavigation({ id: '/a', url: '/a', title: 'A' });
        service.registerNavigation({ id: '/b', url: '/b', title: 'B' });
        service.markDirty('/b', true);

        await expect(service.closeMany(['/a', '/b'])).resolves.toBe(false);

        expect(service.views().map(({ id }) => id)).toEqual([
            '/dashboard',
            '/a',
            '/b',
        ]);
    });

    it('ne détruit aucune vue groupée si la navigation de sortie échoue', async () => {
        const { service, router, strategy } = createService();
        registerDashboard(service);
        service.registerNavigation({ id: '/a', url: '/a', title: 'A' });
        service.registerNavigation({ id: '/b', url: '/b', title: 'B' });
        const discard = vi.spyOn(strategy, 'discard');
        router.navigateByUrl.mockResolvedValueOnce(false);

        await expect(service.closeMany(['/a', '/b'])).resolves.toBe(false);

        expect(service.views().map(({ id }) => id)).toEqual([
            '/dashboard',
            '/a',
            '/b',
        ]);
        expect(discard).not.toHaveBeenCalled();
    });

    it('ferme un groupe après une seule navigation réussie vers un survivant', async () => {
        const { service, router, strategy } = createService();
        registerDashboard(service);
        service.registerNavigation({ id: '/a', url: '/a', title: 'A' });
        service.registerNavigation({ id: '/b', url: '/b', title: 'B' });
        const discard = vi.spyOn(strategy, 'discard');

        await expect(service.closeMany(['/a', '/b'])).resolves.toBe(true);

        expect(router.navigateByUrl).toHaveBeenCalledOnce();
        expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard');
        expect(discard).toHaveBeenCalledWith('/a');
        expect(service.views().map(({ id }) => id)).toEqual(['/dashboard']);
    });

    it('révoque une vue suspendue même dirty sans navigation ni confirmation', async () => {
        const { service, router, strategy } = createService();
        registerDashboard(service);
        service.registerNavigation({
            id: '/users',
            url: '/users',
            title: 'Users',
            accessPath: '/users',
        });
        service.markDirty('/users', true);
        service.registerNavigation({ id: '/a', url: '/a', title: 'A' });
        const discard = vi.spyOn(strategy, 'discard');

        await expect(service.revokeAccess(['/users'])).resolves.toBe(true);

        expect(router.navigateByUrl).not.toHaveBeenCalled();
        expect(discard).toHaveBeenCalledWith('/users');
        expect(service.views().some(({ id }) => id === '/users')).toBe(false);
    });

    it('quitte puis détruit une vue active dont le droit vient d’être révoqué', async () => {
        const { service, router, strategy } = createService();
        registerDashboard(service);
        service.registerNavigation({
            id: '/users',
            url: '/users',
            title: 'Users',
            accessPath: '/users',
        });
        service.markDirty('/users', true);
        const finishClosure = vi.spyOn(strategy, 'finishClosure');

        await expect(service.revokeAccess(['/users'])).resolves.toBe(true);

        expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard');
        expect(finishClosure).toHaveBeenCalledWith('/users');
        expect(service.views().map(({ id }) => id)).toEqual(['/dashboard']);
    });

    it('échoue fermé sans mutation partielle si aucune vue autorisée ne survit', async () => {
        const { service, router, strategy } = createService();
        service.registerNavigation({
            id: '/users',
            url: '/users',
            title: 'Users',
            accessPath: '/users',
        });
        const discard = vi.spyOn(strategy, 'discard');

        await expect(service.revokeAccess(['/users'])).resolves.toBe(false);

        expect(router.navigateByUrl).not.toHaveBeenCalled();
        expect(discard).not.toHaveBeenCalled();
        expect(service.views().map(({ id }) => id)).toEqual(['/users']);
    });

    it('détruit toutes les vues détachées à une frontière de sécurité', () => {
        const { service, strategy } = createService();
        registerDashboard(service);
        service.registerNavigation({
            id: '/users',
            url: '/users',
            title: 'Users',
        });
        const discardAll = vi.spyOn(strategy, 'discardAll');

        service.clearForSecurityBoundary();

        expect(discardAll).toHaveBeenCalledOnce();
        expect(service.views()).toEqual([]);
    });
});
