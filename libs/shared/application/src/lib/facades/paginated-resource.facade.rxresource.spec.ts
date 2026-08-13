import { Injectable } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PageResult } from '@cmz/shared-domain';
import { Observable, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { ErrorHandlerRegistry } from '../services/error-handler-registry.service';
import {
    PageQuery,
    PaginatedResourceFacade,
} from './paginated-resource.facade';

/**
 * T12-3 (cartographie 2026-08-12) — jamais testé. `PaginatedResourceFacade`
 * hérite le pilotage `rxResource` de `ResourceFacade` (déjà verrouillé dans
 * `resource.facade.rxresource.spec.ts`) — ce test se concentre sur ce que
 * cette couche ajoute : `items`/`page`/`total` dérivés du `PageResult`, et
 * `load()`/`changePage()`.
 */
function makePage(
    items: string[],
    page: number,
    total: number
): PageResult<string> {
    return { items, currentPage: page, lastPage: 1, perPage: 10, total };
}

@Injectable()
class TestPaginatedFacade extends PaginatedResourceFacade<
    string,
    { q: string }
> {
    streamFn: (
        params: PageQuery<{ q: string }>
    ) => Observable<PageResult<string>> = () => of(makePage([], 1, 0));

    protected stream(
        params: PageQuery<{ q: string }>
    ): Observable<PageResult<string>> {
        return this.streamFn(params);
    }
}

function setup() {
    TestBed.configureTestingModule({
        providers: [
            TestPaginatedFacade,
            { provide: ErrorHandlerRegistry, useValue: { handle: vi.fn() } },
        ],
    });
    return TestBed.inject(TestPaginatedFacade);
}

async function flush(): Promise<void> {
    await new Promise((r) => setTimeout(r, 0));
}

describe('PaginatedResourceFacade', () => {
    it('items()/page()/total() retombent sur les valeurs par défaut au repos', async () => {
        const facade = setup();
        await flush();

        expect(facade.items()).toEqual([]);
        expect(facade.page()).toBe(1);
        expect(facade.total()).toBe(0);
    });

    it('load() pose filter+page+options et expose items/page/total depuis le PageResult', async () => {
        const facade = setup();
        facade.streamFn = () => of(makePage(['a', 'b'], 2, 42));

        facade.load({ q: 'term' }, '2');
        await flush();

        expect(facade.items()).toEqual(['a', 'b']);
        expect(facade.page()).toBe(2);
        expect(facade.total()).toBe(42);
    });

    it('load() sans page explicite utilise PAGINATION_CONST.DEFAULT_PAGE', async () => {
        const facade = setup();
        let receivedPage: string | undefined;
        facade.streamFn = (params) => {
            receivedPage = params.page;
            return of(makePage([], 1, 0));
        };

        facade.load({ q: 'term' });
        await flush();

        expect(receivedPage).toBe('1');
    });

    it('changePage() conserve le filtre courant et ne change que la page', async () => {
        const facade = setup();
        const receivedParams: PageQuery<{ q: string }>[] = [];
        facade.streamFn = (params) => {
            receivedParams.push(params);
            return of(makePage([], Number(params.page), 0));
        };

        facade.load({ q: 'kept' }, '1');
        await flush();
        facade.changePage('3');
        await flush();

        expect(receivedParams).toHaveLength(2);
        expect(receivedParams[1]).toEqual({ filter: { q: 'kept' }, page: '3' });
    });

    it('changePage() sans chargement préalable part d’un filtre null', async () => {
        const facade = setup();
        const receivedParams: PageQuery<{ q: string }>[] = [];
        facade.streamFn = (params) => {
            receivedParams.push(params);
            return of(makePage([], Number(params.page), 0));
        };

        facade.changePage('5');
        await flush();

        expect(receivedParams[0]).toEqual({ filter: null, page: '5' });
    });
});
