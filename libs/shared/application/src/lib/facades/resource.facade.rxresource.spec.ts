import { Injectable } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DomainError, UnknownError } from '@cmz/shared-domain';
import { Observable, Subject, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { ErrorHandlerRegistry } from '../services/error-handler-registry.service';
import { ResourceFacade } from './resource.facade';

/**
 * T12-3 (cartographie 2026-08-12) — jamais testé, aucun précédent
 * `rxResource` dans le dépôt (voir `tools/vitest-lib-rxresource.config.ts`
 * pour la technique retenue et pourquoi elle est nécessaire).
 *
 * `ResourceFacade` est `abstract` — sous-classe concrète minimale pour
 * l'instancier. Le flux est piloté par un `Subject` par test : `rxResource`
 * ne (re)démarre le stream que lorsque `_params` change de valeur
 * référentielle (signal), donc chaque `setParams()` doit recevoir un objet
 * distinct pour redéclencher le chargement en test comme en prod.
 */
class FakeError extends DomainError {
    readonly code = 'FAKE_ERROR';
    readonly messageKey = 'ERRORS.FAKE';
    readonly statusCode = 400;
}

@Injectable()
class TestResourceFacade extends ResourceFacade<string, { id: number }> {
    streamFn: (params: { id: number }) => Observable<string> = () =>
        new Subject<string>();

    protected stream(params: { id: number }): Observable<string> {
        return this.streamFn(params);
    }

    triggerLoad(id: number): void {
        this.setParams({ id });
    }
}

function setup() {
    const errorHandler = { handle: vi.fn() };
    TestBed.configureTestingModule({
        providers: [
            TestResourceFacade,
            { provide: ErrorHandlerRegistry, useValue: errorHandler },
        ],
    });
    const facade = TestBed.inject(TestResourceFacade);
    return { facade, errorHandler };
}

/** Laisse les microtasks de `rxResource` (Promise-based en interne) se stabiliser. */
async function flush(): Promise<void> {
    await new Promise((r) => setTimeout(r, 0));
}

describe('ResourceFacade', () => {
    it('value() est undefined tant qu’aucun paramètre n’a été posé (repos)', async () => {
        const { facade } = setup();
        await flush();

        expect(facade.value()).toBeUndefined();
        expect(facade.isLoading()).toBe(false);
    });

    it('setParams() déclenche le chargement puis expose la valeur émise', async () => {
        const { facade } = setup();
        facade.streamFn = () => new Subject<string>();
        const subject = new Subject<string>();
        facade.streamFn = () => subject;

        facade.triggerLoad(1);
        await flush();
        expect(facade.isLoading()).toBe(true);
        expect(facade.value()).toBeUndefined();

        subject.next('hello');
        subject.complete();
        await flush();

        expect(facade.value()).toBe('hello');
        expect(facade.isLoading()).toBe(false);
        expect(facade.status()).toBe('resolved');
    });

    it('route une DomainError levée par le stream vers ErrorHandlerRegistry telle quelle', async () => {
        const { facade, errorHandler } = setup();
        const domainError = new FakeError('boom');
        facade.streamFn = () => throwError(() => domainError);

        facade.triggerLoad(1);
        await flush();

        expect(facade.error()).toBe(domainError);
        expect(errorHandler.handle).toHaveBeenCalledWith(domainError);
    });

    it('convertit une erreur non-DomainError en UnknownError avant de la router (garde-fou T3-1)', async () => {
        const { facade, errorHandler } = setup();
        facade.streamFn = () => throwError(() => new Error('raw failure'));

        facade.triggerLoad(1);
        await flush();

        expect(errorHandler.handle).toHaveBeenCalledWith(
            expect.any(UnknownError)
        );
        const handled = errorHandler.handle.mock.calls[0][0];
        expect(handled).not.toBe(expect.any(FakeError));
    });

    it('reload() relance le stream avec les mêmes paramètres', async () => {
        const { facade } = setup();
        let callCount = 0;
        facade.streamFn = () => {
            callCount++;
            const s = new Subject<string>();
            queueMicrotask(() => {
                s.next(`call-${callCount}`);
                s.complete();
            });
            return s;
        };

        facade.triggerLoad(1);
        await flush();
        expect(facade.value()).toBe('call-1');

        facade.reload();
        await flush();
        expect(facade.value()).toBe('call-2');
        expect(callCount).toBe(2);
    });
});
