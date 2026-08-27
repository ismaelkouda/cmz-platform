import { Injectable } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DomainError, PageResult, UnknownError } from '@cmz/shared-domain';
import { Observable, Subject, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { TranslocoService } from '@jsverse/transloco';
import { ErrorHandlerRegistry } from '../services/error-handler-registry.service';
import { NOTIFICATION_PORT } from '../tokens/notification-port.token';
import { CollectionResourceFacade } from './collection-resource.facade';

/**
 * T12-3 (cartographie 2026-08-12) — jamais testé. `CollectionResourceFacade`
 * ajoute `runAction()` (machine à états idle/loading + notification succès
 * + routage d'erreur) par-dessus `PaginatedResourceFacade` (déjà verrouillée
 * dans `paginated-resource.facade.rxresource.spec.ts`) — ce test couvre
 * spécifiquement `runAction()`, `actionState`/`actionSuccess`/`actionError`.
 */
function makePage(items: string[]): PageResult<string> {
    return {
        items,
        currentPage: 1,
        lastPage: 1,
        perPage: 10,
        total: items.length,
    };
}

class FakeError extends DomainError {
    readonly code = 'FAKE_ERROR';
    readonly messageKey = 'ERRORS.FAKE';
    readonly statusCode = 400;
}

@Injectable()
class TestCollectionFacade extends CollectionResourceFacade<
    string,
    { q: string }
> {
    protected stream(): Observable<PageResult<string>> {
        return of(makePage([]));
    }

    doAction(action$: Observable<void>, onSuccess?: () => void): void {
        this.runAction(action$, 'ACTIONS.SUCCESS', onSuccess);
    }
}

function setup() {
    const notification = {
        success: vi.fn(),
        error: vi.fn(),
        warning: vi.fn(),
        info: vi.fn(),
        notify: vi.fn(),
    };
    const translation = {
        translate: vi.fn((key: string) => `translated:${key}`),
        setActiveLang: vi.fn(),
        getActiveLang: vi.fn(() => 'fr'),
    };
    const mutationErrorHandler = { handle: vi.fn() };
    TestBed.configureTestingModule({
        providers: [
            TestCollectionFacade,
            { provide: NOTIFICATION_PORT, useValue: notification },
            { provide: TranslocoService, useValue: translation },
            { provide: ErrorHandlerRegistry, useValue: mutationErrorHandler },
        ],
    });
    const facade = TestBed.inject(TestCollectionFacade);
    return { facade, notification, translation, mutationErrorHandler };
}

async function flush(): Promise<void> {
    await new Promise((r) => setTimeout(r, 0));
}

describe('CollectionResourceFacade', () => {
    it('runAction() passe par idle → loading → idle et incrémente actionSuccess au succès', async () => {
        const { facade } = setup();
        const action$ = new Subject<void>();

        expect(facade.actionState()).toBe('idle');
        facade.doAction(action$);
        expect(facade.actionState()).toBe('loading');

        action$.next();
        action$.complete();
        await flush();

        expect(facade.actionState()).toBe('idle');
        expect(facade.actionSuccess()).toBe(1);
    });

    it('runAction() notifie le message de succès traduit', async () => {
        const { facade, notification, translation } = setup();
        const action$ = of(undefined);

        facade.doAction(action$);
        await flush();

        expect(translation.translate).toHaveBeenCalledWith('ACTIONS.SUCCESS');
        expect(notification.success).toHaveBeenCalledWith(
            'translated:ACTIONS.SUCCESS'
        );
    });

    it('runAction() appelle onSuccess après le succès', async () => {
        const { facade } = setup();
        const onSuccess = vi.fn();

        facade.doAction(of(undefined), onSuccess);
        await flush();

        expect(onSuccess).toHaveBeenCalledOnce();
    });

    it('runAction() route une DomainError vers ErrorHandlerRegistry et repasse idle sans notifier de succès', async () => {
        const { facade, notification, mutationErrorHandler } = setup();
        const domainError = new FakeError('boom');

        facade.doAction(throwError(() => domainError));
        await flush();

        expect(facade.actionState()).toBe('idle');
        expect(facade.actionError()).toBe(domainError);
        expect(mutationErrorHandler.handle).toHaveBeenCalledWith(domainError);
        expect(notification.success).not.toHaveBeenCalled();
    });

    it('runAction() convertit une erreur non-DomainError en UnknownError (garde-fou T3-1)', async () => {
        const { facade, mutationErrorHandler } = setup();

        facade.doAction(throwError(() => new Error('raw failure')));
        await flush();

        expect(mutationErrorHandler.handle).toHaveBeenCalledWith(
            expect.any(UnknownError)
        );
    });

    it('runAction() efface actionError au démarrage d’une nouvelle action', async () => {
        const { facade } = setup();

        facade.doAction(throwError(() => new FakeError('first')));
        await flush();
        expect(facade.actionError()).not.toBeNull();

        facade.doAction(of(undefined));
        expect(facade.actionError()).toBeNull();
    });
});
