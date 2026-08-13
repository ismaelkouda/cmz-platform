import { ActivatedRouteSnapshot, DetachedRouteHandle } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { CustomRouteReuseStrategy } from './custom-route-reuse-strategy';

/**
 * T12-3 (P2, 2026-08-13) — jamais testé, consommé par `app.config.ts`
 * (`{ provide: RouteReuseStrategy, useClass: ... }`) et `TabService.closeTab`
 * via `instanceof` + `clearHandle`. Logique pure sur objets `ActivatedRouteSnapshot`
 * factices (pas besoin de `RouterTestingModule`).
 */
function makeSnapshot(
    path: string | undefined,
    params: Record<string, string> = {},
    reuseComponent = false
): ActivatedRouteSnapshot {
    return {
        routeConfig: path === undefined ? null : { path, data: {} },
        params,
        data: { reuseComponent },
    } as unknown as ActivatedRouteSnapshot;
}

const fakeHandle = {} as DetachedRouteHandle;

describe('CustomRouteReuseStrategy', () => {
    it('shouldDetach() est vrai seulement si data.reuseComponent === true', () => {
        const strategy = new CustomRouteReuseStrategy();
        expect(strategy.shouldDetach(makeSnapshot('foo', {}, true))).toBe(true);
        expect(strategy.shouldDetach(makeSnapshot('foo', {}, false))).toBe(
            false
        );
    });

    it('store() puis shouldAttach()/retrieve() retrouvent le handle pour la même route', () => {
        const strategy = new CustomRouteReuseStrategy();
        const snapshot = makeSnapshot('foo');

        strategy.store(snapshot, fakeHandle);

        expect(strategy.shouldAttach(snapshot)).toBe(true);
        expect(strategy.retrieve(snapshot)).toBe(fakeHandle);
    });

    it('shouldAttach()/retrieve() renvoient false/null si rien n’a été stocké pour cette route', () => {
        const strategy = new CustomRouteReuseStrategy();
        const snapshot = makeSnapshot('never-stored');

        expect(strategy.shouldAttach(snapshot)).toBe(false);
        expect(strategy.retrieve(snapshot)).toBeNull();
    });

    it('store() ignore silencieusement une route sans routeConfig (id introuvable)', () => {
        const strategy = new CustomRouteReuseStrategy();
        const snapshot = makeSnapshot(undefined);

        expect(() => strategy.store(snapshot, fakeHandle)).not.toThrow();
        expect(strategy.shouldAttach(snapshot)).toBe(false);
    });

    it('deux routes avec le même path mais des params différents ont des ids distincts', () => {
        const strategy = new CustomRouteReuseStrategy();
        const snapshotA = makeSnapshot('item', { id: '1' });
        const snapshotB = makeSnapshot('item', { id: '2' });

        strategy.store(snapshotA, fakeHandle);

        expect(strategy.shouldAttach(snapshotA)).toBe(true);
        expect(strategy.shouldAttach(snapshotB)).toBe(false);
    });

    it('shouldReuseRoute() compare les routeConfig par référence', () => {
        const strategy = new CustomRouteReuseStrategy();
        const routeConfig = { path: 'foo' };
        const future = { routeConfig } as unknown as ActivatedRouteSnapshot;
        const curr = { routeConfig } as unknown as ActivatedRouteSnapshot;
        const other = {
            routeConfig: { path: 'bar' },
        } as unknown as ActivatedRouteSnapshot;

        expect(strategy.shouldReuseRoute(future, curr)).toBe(true);
        expect(strategy.shouldReuseRoute(future, other)).toBe(false);
    });

    it('clearHandle() supprime toutes les entrées dont l’id contient le path donné', () => {
        const strategy = new CustomRouteReuseStrategy();
        const snapshot = makeSnapshot('requests/details', { id: '42' });
        strategy.store(snapshot, fakeHandle);
        expect(strategy.shouldAttach(snapshot)).toBe(true);

        strategy.clearHandle('requests/details');

        expect(strategy.shouldAttach(snapshot)).toBe(false);
    });

    it('clearHandle() sur un path absent ne supprime rien et ne lève pas', () => {
        const strategy = new CustomRouteReuseStrategy();
        const snapshot = makeSnapshot('kept');
        strategy.store(snapshot, fakeHandle);

        expect(() => strategy.clearHandle('unrelated')).not.toThrow();
        expect(strategy.shouldAttach(snapshot)).toBe(true);
    });
});
