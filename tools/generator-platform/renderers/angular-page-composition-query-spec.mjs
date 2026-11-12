// X5 C4 (D-X5-3, P-A3) : spec de contrat des nœuds de LECTURE de la
// composition extérieure, générée et lancée par `<app>:test`. Le serveur est
// simulé ; chaque requête reste en attente et son annulation est observée.
// Elle prouve le sens de « commande » (intention acceptée) et la Donnée gelée.
export function renderCompositionQuerySpec(descriptors, hostBindings) {
    const queries = descriptors.filter(({ kind }) => kind === 'query');
    const tokens = [
        ...new Set(descriptors.map((descriptor) => descriptor.serviceToken)),
    ].sort();
    const entries = queries
        .map(
            ({ propertyName, responseSample, node }) =>
                `    { name: ${JSON.stringify(propertyName)}, initial: ${node.trigger === 'page-enter'}, input: {}, response: ${JSON.stringify(responseSample)} },`
        )
        .join('\n');
    return `import { HttpBackend, HttpErrorResponse, HttpResponse, provideHttpClient, type HttpEvent, type HttpRequest } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Observable, config, type Subscriber } from 'rxjs';
import { afterEach, describe, expect, it } from 'vitest';

import { ${['APPLICATION_SESSION', ...tokens].join(', ')} } from '${hostBindings.session.module}';
import { PageComposition } from './page-composition';
import { PAGE_COMPOSITION_API } from './page-composition.api';
import { PAGE_COMPOSITION_PROVIDERS } from './page-composition.providers';

const TOKENS = [${tokens.join(', ')}];
const QUERIES = [
${entries}
] as const;
type Command = (input: unknown) => Observable<unknown>;

function isData(value: unknown, seen: Set<unknown> = new Set()): boolean {
    if (value === null || value === undefined || typeof value === 'boolean' || typeof value === 'string') return true;
    if (typeof value === 'number') return Number.isFinite(value);
    if (typeof value !== 'object' || seen.has(value)) return false;
    seen.add(value);
    if (!Object.isFrozen(value)) return false;
    if (Array.isArray(value)) return value.every((item) => isData(item, seen));
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return false;
    return Reflect.ownKeys(value).every((key) => {
        const entry = Object.getOwnPropertyDescriptor(value, key);
        return typeof key === 'string' && entry !== undefined && Object.hasOwn(entry, 'value') && isData(entry.value, seen);
    });
}

interface Pending {
    readonly request: HttpRequest<unknown>;
    readonly subscriber: Subscriber<HttpEvent<unknown>>;
    cancelled: boolean;
}

// Serveur simulé : chaque requête attend sa réponse ; l'annulation est notée.
class QueryBackend implements HttpBackend {
    readonly pending: Pending[] = [];
    handle(request: HttpRequest<unknown>): Observable<HttpEvent<unknown>> {
        return new Observable<HttpEvent<unknown>>((subscriber) => {
            const entry: Pending = { request, subscriber, cancelled: false };
            this.pending.push(entry);
            return () => {
                entry.cancelled = true;
            };
        });
    }
    respond(entry: Pending, status: number, body: unknown): void {
        if (status >= 200 && status < 300) {
            entry.subscriber.next(new HttpResponse({ body, status, statusText: String(status), url: entry.request.url }));
            entry.subscriber.complete();
        } else entry.subscriber.error(new HttpErrorResponse({ error: body, status, statusText: String(status), url: entry.request.url }));
    }
}

function setup(options: { readonly address?: boolean } = {}) {
    const epoch = signal(0);
    const backend = new QueryBackend();
    TestBed.configureTestingModule({
        providers: [
            provideHttpClient(),
            { provide: HttpBackend, useValue: backend },
            { provide: APPLICATION_SESSION, useValue: { epoch: () => epoch(), connected: () => true } },
            { provide: Router, useValue: { navigateByUrl: () => Promise.resolve(true) } },
            ...TOKENS.map((token) => ({
                provide: token,
                useFactory: (): string => {
                    if (options.address === false) throw new Error('SESSION_ENDPOINT');
                    return '/api/contrat';
                },
            })),
            ...PAGE_COMPOSITION_PROVIDERS,
        ],
    });
    const composition = TestBed.inject(PageComposition);
    const at = (path: string): unknown =>
        path.split('.').reduce<unknown>((value, key) => (value as Readonly<Record<string, unknown>>)[key], composition);
    const read = (path: string): unknown => (at(path) as () => unknown)();
    return { composition, backend, at, read };
}

type Context = ReturnType<typeof setup>;

// Commande froide acceptée : rien avant \`subscribe\`, puis une seule valeur et
// la fin, aussitôt.
function accept(context: Context, path: string, input: unknown): void {
    const observable = (context.at(path) as Command)(input);
    TestBed.tick();
    const before = context.backend.pending.length;
    const values: unknown[] = [];
    let complete = false;
    observable.subscribe({ next: (value) => values.push(value), complete: () => (complete = true) });
    expect(complete).toBe(true);
    expect(values).toEqual([undefined]);
    expect(context.backend.pending.length).toBe(before);
}

// Requête la plus récente : celle que la façade garde (latest-wins).
function latest(context: Context): Pending {
    const entry = context.backend.pending[context.backend.pending.length - 1];
    if (!entry) throw new Error('aucune requête');
    return entry;
}

const settle = async (): Promise<void> => {
    TestBed.tick();
    await new Promise((resolve) => setTimeout(resolve));
    TestBed.tick();
};

// Toute écriture sur une Donnée gelée échoue (module strict).
function expectReadOnly(value: unknown): void {
    if (Array.isArray(value)) {
        expect(() => (value as unknown[]).push(undefined)).toThrow();
        for (const item of value) expectReadOnly(item);
    } else if (value !== null && typeof value === 'object') {
        expect(() => {
            (value as Record<string, unknown>)['conformance_write'] = 1;
        }).toThrow();
        for (const item of Object.values(value)) expectReadOnly(item);
    }
}

describe('PageComposition : contrat des lectures (X5, D-X5-3)', () => {
    afterEach(() => TestBed.resetTestingModule());

    // Contrôles généraux (aussi présents dans la spec des commandes, absente
    // d'une page de lectures seules).
    it('garde la gestion asynchrone des erreurs de rxjs', () => {
        expect(config.useDeprecatedSynchronousErrorHandling).toBe(false);
    });

    it('expose exactement la table api, en Données lisibles', () => {
        const context = setup();
        TestBed.tick();
        const published = PAGE_COMPOSITION_API.map((entry) => entry.path.split('.')[0]);
        expect(Object.keys(context.composition).filter((key) => !key.startsWith('_') && published.includes(key)).sort()).toEqual([...new Set(published)].sort());
        // Chemin lu AVANT tout rétrécissement par genre : une page sans
        // constante ne laisse aucun genre à la dernière branche.
        for (const entry of PAGE_COMPOSITION_API) {
            const path: string = entry.path;
            const kind: string = entry.kind;
            const member = context.at(path);
            if (kind === 'command') expect(typeof member).toBe('function');
            else expect(isData(kind === 'signal' ? (member as () => unknown)() : member), path).toBe(true);
        }
    });

    for (const query of QUERIES) {
        // Décision du pilote (X5 C4) : un nœud \`page-enter\` est lu une fois à
        // la construction, sans que la page n'appelle rien.
        it(query.name + ' : construction, lecture initiale sans rien appeler', () => {
            const context = setup();
            TestBed.tick();
            expect(context.backend.pending.length).toBe(query.initial ? 1 : 0);
        });

        it(query.name + ' : load sans subscribe, aucune requête de plus', () => {
            const context = setup();
            TestBed.tick();
            const before = context.backend.pending.length;
            (context.at(query.name + '.load') as Command)(query.input);
            TestBed.tick();
            expect(context.backend.pending.length).toBe(before);
        });

        it(query.name + ' : load accepté se termine aussitôt, puis une seule requête de plus', () => {
            const context = setup();
            TestBed.tick();
            const before = context.backend.pending.length;
            accept(context, query.name + '.load', query.input);
            TestBed.tick();
            expect(context.backend.pending.length).toBe(before + 1);
        });

        it(query.name + ' : deux load, les requêtes précédentes sont annulées', () => {
            const context = setup();
            TestBed.tick();
            accept(context, query.name + '.load', query.input);
            TestBed.tick();
            accept(context, query.name + '.load', query.input);
            TestBed.tick();
            const cancelled = context.backend.pending.map((entry) => entry.cancelled);
            expect(cancelled.slice(-1)).toEqual([false]);
            expect(cancelled.slice(0, -1).every(Boolean)).toBe(true);
        });

        it(query.name + ' : destruction, la requête en vol est annulée', () => {
            const context = setup();
            TestBed.tick();
            accept(context, query.name + '.load', query.input);
            TestBed.tick();
            const entry = latest(context);
            TestBed.resetTestingModule();
            expect(entry.cancelled).toBe(true);
        });

        it(query.name + ' : adresse de service absente, erreur 0 sans requête', async () => {
            const context = setup({ address: false });
            accept(context, query.name + '.load', query.input);
            await settle();
            expect(context.backend.pending).toEqual([]);
            expect(context.read(query.name + '.state')).toBe('error');
            expect(context.read(query.name + '.error')).toBe(0);
            expect(context.read(query.name + '.items')).toEqual([]);
        });

        it(query.name + ' : succès, lignes et pagination en Données gelées', async () => {
            const context = setup();
            accept(context, query.name + '.load', query.input);
            await settle();
            context.backend.respond(latest(context), 200, query.response);
            await settle();
            expect(context.read(query.name + '.state')).toBe('success');
            const items = context.read(query.name + '.items');
            const pagination = context.read(query.name + '.pagination');
            expect((items as readonly unknown[]).length).toBe(1);
            for (const path of ['items', 'state', 'error', 'pagination'])
                expect(isData(context.read(query.name + '.' + path)), path).toBe(true);
            expectReadOnly(items);
            expectReadOnly(pagination);
        });

        it(query.name + ' : échec après succès, aucune ligne et statut seul', async () => {
            const context = setup();
            accept(context, query.name + '.load', query.input);
            await settle();
            context.backend.respond(latest(context), 200, query.response);
            await settle();
            accept(context, query.name + '.reload', {});
            await settle();
            context.backend.respond(latest(context), 500, { message: 'secret serveur' });
            await settle();
            expect(context.read(query.name + '.state')).toBe('error');
            expect(context.read(query.name + '.error')).toBe(500);
            expect(context.read(query.name + '.items')).toEqual([]);
            expect(isData(context.read(query.name + '.items'))).toBe(true);
        });
    }
});
`;
}
