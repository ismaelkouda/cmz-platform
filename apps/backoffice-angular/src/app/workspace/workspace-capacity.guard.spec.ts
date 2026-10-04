import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import {
    LocalizeTranslationService,
    NOTIFICATION_PORT,
} from '@cmz/shared-application';
import { WorkspaceService } from '@cmz/shared-ui';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    canonicalWorkspaceUrl,
    workspaceCapacityGuard,
} from './workspace-capacity.guard';

describe('workspaceCapacityGuard', () => {
    const canOpen = vi.fn();
    const warning = vi.fn();
    const translate = vi.fn((key: string) => key);

    beforeEach(() => {
        canOpen.mockReset();
        warning.mockReset();
        translate.mockClear();
        TestBed.configureTestingModule({
            providers: [
                { provide: WorkspaceService, useValue: { canOpen } },
                { provide: NOTIFICATION_PORT, useValue: { warning } },
                {
                    provide: LocalizeTranslationService,
                    useValue: { translate },
                },
            ],
        });
    });

    it('retire query params et fragment de l’identité', () => {
        expect(canonicalWorkspaceUrl('/users?page=2#table')).toBe('/users');
    });

    it('autorise une vue existante ou une capacité disponible', () => {
        canOpen.mockReturnValue(true);

        const result = TestBed.runInInjectionContext(() =>
            workspaceCapacityGuard(
                {} as ActivatedRouteSnapshot,
                { url: '/users?page=2' } as RouterStateSnapshot
            )
        );

        expect(result).toBe(true);
        expect(canOpen).toHaveBeenCalledWith('/users');
        expect(warning).not.toHaveBeenCalled();
    });

    it('refuse sans éviction silencieuse et explique la limite', () => {
        canOpen.mockReturnValue(false);

        const result = TestBed.runInInjectionContext(() =>
            workspaceCapacityGuard(
                {} as ActivatedRouteSnapshot,
                { url: '/new-view' } as RouterStateSnapshot
            )
        );

        expect(result).toBe(false);
        expect(translate).toHaveBeenCalledWith('WORKSPACE.CAPACITY_REACHED');
        expect(warning).toHaveBeenCalledWith('WORKSPACE.CAPACITY_REACHED');
    });
});
