import { ErrorHandler, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot } from '@angular/router';
import { SessionService, StorePathsService } from '@cmz/shared-application';
import { WorkspaceService, WorkspaceView } from '@cmz/shared-ui';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { pathsGuard } from '../guards/paths.guard';
import {
    WorkspaceAccessMonitor,
    workspaceAccessPath,
} from './workspace-access-monitor.service';

function view(
    id: string,
    accessPath: string | null,
    lifecycle: WorkspaceView['lifecycle'] = 'suspended'
): WorkspaceView {
    return {
        id,
        url: id,
        title: id,
        pinned: accessPath === null,
        closable: accessPath !== null,
        dirty: false,
        accessPath,
        lifecycle,
        lastActivatedAt: 1,
    };
}

describe('workspaceAccessPath', () => {
    it('reprend exactement le chemin contrôlé par pathsGuard', () => {
        const routeChain = [
            { routeConfig: { path: '' } },
            {
                routeConfig: {
                    path: 'settings-security/users',
                    canActivate: [pathsGuard],
                },
            },
            { routeConfig: { path: 'form' } },
        ] as ActivatedRouteSnapshot[];

        expect(workspaceAccessPath(routeChain)).toBe(
            '/settings-security/users'
        );
    });

    it('retourne null pour une vue protégée seulement par la session', () => {
        expect(
            workspaceAccessPath([
                { routeConfig: { path: 'dashboard' } },
            ] as ActivatedRouteSnapshot[])
        ).toBeNull();
    });
});

describe('WorkspaceAccessMonitor', () => {
    const ready = signal(true);
    const paths = signal<string[] | null>(['/users']);
    const views = signal<WorkspaceView[]>([
        view('/dashboard', null, 'active'),
        view('/users', '/users'),
    ]);
    const revokeAccess = vi.fn(async (ids: readonly string[]) => {
        views.update((current) =>
            current.filter(({ id }) => !ids.includes(id))
        );
        return true;
    });
    const clearForSecurityBoundary = vi.fn(() => views.set([]));
    const clearSession = vi.fn(async () => undefined);
    const handleError = vi.fn();

    beforeEach(() => {
        ready.set(true);
        paths.set(['/users']);
        views.set([
            view('/dashboard', null, 'active'),
            view('/users', '/users'),
        ]);
        revokeAccess.mockClear();
        revokeAccess.mockImplementation(async (ids: readonly string[]) => {
            views.update((current) =>
                current.filter(({ id }) => !ids.includes(id))
            );
            return true;
        });
        clearForSecurityBoundary.mockClear();
        clearSession.mockClear();
        handleError.mockClear();

        TestBed.configureTestingModule({
            providers: [
                WorkspaceAccessMonitor,
                {
                    provide: StorePathsService,
                    useValue: {
                        ready: ready.asReadonly(),
                        paths: paths.asReadonly(),
                    },
                },
                {
                    provide: WorkspaceService,
                    useValue: {
                        views: views.asReadonly(),
                        revokeAccess,
                        clearForSecurityBoundary,
                    },
                },
                {
                    provide: SessionService,
                    useValue: { clear: clearSession },
                },
                { provide: ErrorHandler, useValue: { handleError } },
            ],
        });
        TestBed.inject(WorkspaceAccessMonitor);
        TestBed.tick();
    });

    it('ne ferme aucune vue tant que ses droits sont présents', async () => {
        await Promise.resolve();

        expect(revokeAccess).not.toHaveBeenCalled();
        expect(views().map(({ id }) => id)).toEqual(['/dashboard', '/users']);
    });

    it('détruit automatiquement une vue quand son chemin est révoqué', async () => {
        paths.set([]);
        TestBed.tick();
        await vi.waitFor(() =>
            expect(revokeAccess).toHaveBeenCalledWith(['/users'])
        );

        expect(views().map(({ id }) => id)).toEqual(['/dashboard']);
        expect(clearSession).not.toHaveBeenCalled();
    });

    it('intercepte aussi une vue interdite enregistrée après hydratation', async () => {
        views.update((current) => [
            ...current,
            view('/admin', '/admin', 'active'),
        ]);
        TestBed.tick();
        await vi.waitFor(() =>
            expect(revokeAccess).toHaveBeenCalledWith(['/admin'])
        );

        expect(views().some(({ id }) => id === '/admin')).toBe(false);
    });

    it('ferme toute la session si une sortie sûre est impossible', async () => {
        revokeAccess.mockResolvedValueOnce(false);
        paths.set([]);
        TestBed.tick();
        await vi.waitFor(() => expect(clearSession).toHaveBeenCalledOnce());

        expect(clearForSecurityBoundary).toHaveBeenCalledOnce();
    });

    it('ferme toute la session et rend l’erreur observable si la révocation lève', async () => {
        const failure = new Error('navigation failed');
        revokeAccess.mockRejectedValueOnce(failure);
        paths.set([]);
        TestBed.tick();
        await vi.waitFor(() => expect(clearSession).toHaveBeenCalledOnce());

        expect(handleError).toHaveBeenCalledWith(failure);
        expect(clearForSecurityBoundary).toHaveBeenCalledOnce();
    });

    it('interprète un snapshot de droits absent comme aucun accès accordé', async () => {
        paths.set(null);
        TestBed.tick();
        await vi.waitFor(() =>
            expect(revokeAccess).toHaveBeenCalledWith(['/users'])
        );

        expect(views().map(({ id }) => id)).toEqual(['/dashboard']);
    });
});
