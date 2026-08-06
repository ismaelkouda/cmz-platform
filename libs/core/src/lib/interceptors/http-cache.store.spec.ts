import { describe, expect, it } from 'vitest';
import { HttpResponse } from '@angular/common/http';
import { HttpCacheStore } from './http-cache.store';

describe('HttpCacheStore', () => {
    it('retourne undefined pour une clé jamais posée', () => {
        const store = new HttpCacheStore();
        expect(store.get('/api/regions')).toBeUndefined();
    });

    it('restitue la réponse posée pour la même clé', () => {
        const store = new HttpCacheStore();
        const response = new HttpResponse({ body: { id: 1 }, status: 200 });
        store.set('/api/regions?page=1', response);
        expect(store.get('/api/regions?page=1')).toBe(response);
    });

    it('distingue deux clés différentes (URL + query params)', () => {
        const store = new HttpCacheStore();
        const page1 = new HttpResponse({ body: { page: 1 }, status: 200 });
        const page2 = new HttpResponse({ body: { page: 2 }, status: 200 });
        store.set('/api/regions?page=1', page1);
        store.set('/api/regions?page=2', page2);
        expect(store.get('/api/regions?page=1')).toBe(page1);
        expect(store.get('/api/regions?page=2')).toBe(page2);
    });

    it('clear() vide entièrement le cache', () => {
        const store = new HttpCacheStore();
        store.set('/api/regions', new HttpResponse({ status: 200 }));
        store.clear();
        expect(store.get('/api/regions')).toBeUndefined();
    });
});
