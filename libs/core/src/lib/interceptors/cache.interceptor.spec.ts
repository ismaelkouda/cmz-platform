import '@angular/compiler';
import { describe, expect, it, vi } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import {
    HttpContext,
    HttpEvent,
    HttpHandlerFn,
    HttpRequest,
    HttpResponse,
} from '@angular/common/http';
import { Observable, firstValueFrom, of } from 'rxjs';
import { cacheInterceptor } from './cache.interceptor';
import { BYPASS_CACHE } from './cache-context.token';
import { HttpCacheStore } from './http-cache.store';

/** Double de test pour `next` — ne fait jamais d'appel réseau réel. */
function next(response$: Observable<HttpEvent<unknown>>): HttpHandlerFn {
    return () => response$;
}

/**
 * Exécute `cacheInterceptor` avec un `HttpCacheStore` réel (pas un mock —
 * l'objet sous test est la collaboration entre les deux, cf.
 * `http-cache.store.spec.ts` qui couvre déjà `HttpCacheStore` isolément) mis
 * à disposition via un `Injector` dédié, comme `safe-url.pipe.spec.ts`.
 */
function run(
    req: HttpRequest<unknown>,
    handler: HttpHandlerFn,
    store: HttpCacheStore
): Promise<HttpEvent<unknown>> {
    const injector = Injector.create({
        providers: [{ provide: HttpCacheStore, useValue: store }],
    });
    return firstValueFrom(
        runInInjectionContext(injector, () => cacheInterceptor(req, handler))
    );
}

describe('cacheInterceptor', () => {
    it('laisse passer une requête non-GET sans jamais toucher au cache (POST/DELETE ne sont jamais mis en cache)', async () => {
        const store = new HttpCacheStore();
        const setSpy = vi.spyOn(store, 'set');
        const postReq = new HttpRequest('POST', '/api/regions', {});
        const handler = vi.fn(next(of({ type: 4 } as unknown as HttpEvent<unknown>)));

        await run(postReq, handler, store);

        expect(handler).toHaveBeenCalledOnce();
        expect(setSpy).not.toHaveBeenCalled();
    });

    it('sert la réponse en cache pour un GET répété sans rappeler `next`', async () => {
        const store = new HttpCacheStore();
        const req = new HttpRequest('GET', '/api/regions');
        const cached = new HttpResponse({ body: { id: 1 }, status: 200 });
        store.set(req.urlWithParams, cached);
        const handler = vi.fn(next(of({ type: 4 } as unknown as HttpEvent<unknown>)));

        const result = await run(req, handler, store);

        expect(handler).not.toHaveBeenCalled();
        expect((result as HttpResponse<unknown>).body).toEqual({ id: 1 });
    });

    it("n'appelle jamais `store.clone()` par référence — la réponse servie est un clone, pas l'objet caché lui-même", async () => {
        const store = new HttpCacheStore();
        const req = new HttpRequest('GET', '/api/regions');
        const cached = new HttpResponse({ body: { id: 1 }, status: 200 });
        store.set(req.urlWithParams, cached);
        const handler = vi.fn(next(of({ type: 4 } as unknown as HttpEvent<unknown>)));

        const result = await run(req, handler, store);

        expect(result).not.toBe(cached);
    });

    it("met en cache une réponse GET reçue du réseau lorsqu'il n'y avait rien en cache", async () => {
        const store = new HttpCacheStore();
        const req = new HttpRequest('GET', '/api/regions');
        const networkResponse = new HttpResponse({
            body: { id: 2 },
            status: 200,
        });
        const handler = next(of(networkResponse));

        const result = await run(req, handler, store);

        expect(result).toBe(networkResponse);
        expect(store.get(req.urlWithParams)).toBe(networkResponse);
    });

    it('ignore le cache en lecture mais le rafraîchit quand `BYPASS_CACHE` est vrai (forceRefresh)', async () => {
        const store = new HttpCacheStore();
        const context = new HttpContext().set(BYPASS_CACHE, true);
        const req = new HttpRequest('GET', '/api/regions', { context });
        const stale = new HttpResponse({ body: { id: 'stale' }, status: 200 });
        store.set(req.urlWithParams, stale);
        const fresh = new HttpResponse({ body: { id: 'fresh' }, status: 200 });
        const handler = vi.fn(next(of(fresh)));

        const result = await run(req, handler, store);

        expect(handler).toHaveBeenCalledOnce();
        expect(result).toBe(fresh);
        expect(store.get(req.urlWithParams)).toBe(fresh);
    });

    it('deux URLs différentes (query params inclus) sont mises en cache séparément', async () => {
        const store = new HttpCacheStore();
        const req1 = new HttpRequest('GET', '/api/regions?page=1');
        const req2 = new HttpRequest('GET', '/api/regions?page=2');
        const resp1 = new HttpResponse({ body: { page: 1 }, status: 200 });
        const resp2 = new HttpResponse({ body: { page: 2 }, status: 200 });

        await run(req1, next(of(resp1)), store);
        await run(req2, next(of(resp2)), store);

        expect(store.get(req1.urlWithParams)).toBe(resp1);
        expect(store.get(req2.urlWithParams)).toBe(resp2);
    });

    it("n'écrase pas le cache si `next` renvoie un événement qui n'est pas une HttpResponse (ex. HttpSentEvent)", async () => {
        const store = new HttpCacheStore();
        const req = new HttpRequest('GET', '/api/regions');
        const sentEvent = { type: 0 } as unknown as HttpEvent<unknown>;
        const handler = next(of(sentEvent));

        await run(req, handler, store);

        expect(store.get(req.urlWithParams)).toBeUndefined();
    });
});
