// X4-sécurité-3, mode extérieur seulement : connectivité détenue par la coque
// (G1) et specs scellées de la coque (connectivité, P-A4). Le mode atelier ne
// reçoit aucun de ces fichiers.
// X4-sécurité-3, G1, mode extérieur seulement : la coque détient la
// connectivité ; la composition l'expose et la page ne lit que la composition.
// Valeur initiale lue dans `navigator.onLine`, puis suivie par les événements
// `online` et `offline` de la fenêtre. Hors navigateur, la valeur reste vraie.
export function renderExternalConnectivity() {
    return `import { DOCUMENT } from '@angular/common';
import { DestroyRef, Service, inject, signal, type Signal } from '@angular/core';

@Service({ autoProvided: true })
export class ApplicationConnectivity {
    private readonly state = signal(true);
    readonly online: Signal<boolean> = this.state.asReadonly();

    constructor() {
        const view = inject(DOCUMENT).defaultView;
        if (!view) return;
        this.state.set(view.navigator.onLine !== false);
        const online = (): void => this.state.set(true);
        const offline = (): void => this.state.set(false);
        view.addEventListener('online', online);
        view.addEventListener('offline', offline);
        inject(DestroyRef).onDestroy(() => {
            view.removeEventListener('online', online);
            view.removeEventListener('offline', offline);
        });
    }
}
`;
}

export function renderExternalConnectivitySpec() {
    return `import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApplicationConnectivity } from './connectivity';

describe('ApplicationConnectivity', () => {
    afterEach(() => {
        TestBed.resetTestingModule();
        vi.restoreAllMocks();
    });

    it('part de navigator.onLine', () => {
        Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => false });
        try {
            expect(TestBed.inject(ApplicationConnectivity).online()).toBe(false);
        } finally {
            Reflect.deleteProperty(window.navigator, 'onLine');
        }
    });

    it('suit les événements offline puis online de la fenêtre', () => {
        const connectivity = TestBed.inject(ApplicationConnectivity);
        window.dispatchEvent(new Event('offline'));
        expect(connectivity.online()).toBe(false);
        window.dispatchEvent(new Event('online'));
        expect(connectivity.online()).toBe(true);
    });

    it('retire ses écouteurs à la destruction', () => {
        const removed = vi.spyOn(window, 'removeEventListener');
        TestBed.inject(ApplicationConnectivity);
        TestBed.resetTestingModule();
        expect(removed.mock.calls.map(([name]) => name).sort()).toEqual(['offline', 'online']);
    });

    it('n’expose qu’un signal en lecture seule', () => {
        const online = TestBed.inject(ApplicationConnectivity).online as unknown as Record<string, unknown>;
        expect(online['set']).toBeUndefined();
        expect(online['update']).toBeUndefined();
    });
});
`;
}

// X4-sécurité-3, P-A4, mode extérieur seulement : pour toutes les
// combinaisons d'étapes et de prédicats, la session ne rend qu'un chemin de
// `routes[]`, conforme au motif de route du schéma d'application.
export function renderExternalSessionNavigationSpec(routePattern) {
    return `import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vitest';

import { ApplicationSession, SESSION_CONFIGURATION } from './session.store';

const ROUTES: readonly string[] = SESSION_CONFIGURATION.routes.map((route) => route.path);
const ROUTE_PATTERN = new RegExp(${JSON.stringify(routePattern)});
const STAGES = SESSION_CONFIGURATION.stages;

function place(target: Record<string, unknown>, path: string, value: unknown): void {
    const keys = path.slice(1).split('/').map((key) => key.replaceAll('~1', '/').replaceAll('~0', '~'));
    let current = target;
    for (const key of keys.slice(0, -1)) {
        const next = current[key];
        if (!next || typeof next !== 'object') current[key] = {};
        current = current[key] as Record<string, unknown>;
    }
    current[keys[keys.length - 1]] = value;
}

function sessionResult(pending: readonly boolean[]): Record<string, unknown> {
    const projection = SESSION_CONFIGURATION.projection;
    const value: Record<string, unknown> = {};
    place(value, projection.subject_pointer, {});
    place(value, projection.token_pointer, 'jeton-de-contrat');
    place(value, projection.allowed_paths_pointer, [...ROUTES]);
    if (projection.permissions_pointer !== undefined) place(value, projection.permissions_pointer, []);
    place(value, projection.menu_pointer, []);
    STAGES.forEach((stage, index) =>
        place(value, stage.predicate.pointer, stage.predicate.operator === 'is-null' ? (pending[index] ? null : 'fait') : pending[index])
    );
    return value;
}

function expectDeclared(path: string | null): void {
    if (path === null) return;
    expect(ROUTES).toContain(path);
    expect(ROUTE_PATTERN.test(path)).toBe(true);
}

const COMBINATIONS: readonly (readonly boolean[])[] = Array.from({ length: 2 ** Math.min(STAGES.length, 8) }, (_, mask) =>
    STAGES.map((_stage, index) => (mask & (1 << index)) !== 0)
);

describe('ApplicationSession : navigation bornée aux routes déclarées', () => {
    afterEach(() => TestBed.resetTestingModule());

    it('déclare des chemins conformes au motif de route du schéma', () => {
        for (const path of ROUTES) expect(ROUTE_PATTERN.test(path)).toBe(true);
    });

    it('sans session, rend la route de reconnexion et des destinations déclarées', () => {
        const session = TestBed.inject(ApplicationSession);
        expect(session.nextPath()).toBe(session.path(SESSION_CONFIGURATION.reconnect_page_id));
        expectDeclared(session.nextPath());
        for (const route of SESSION_CONFIGURATION.routes) expectDeclared(session.destination(route.page_id));
        expectDeclared(session.destination('page-absente'));
    });

    for (const pending of COMBINATIONS) {
        it('étapes en attente ' + JSON.stringify(pending) + ' : établir puis compléter ne rend que des routes déclarées', () => {
            const session = TestBed.inject(ApplicationSession);
            expectDeclared(session.establish(SESSION_CONFIGURATION.producer, sessionResult(pending), session.epoch()));
            for (const route of SESSION_CONFIGURATION.routes) expectDeclared(session.destination(route.page_id));
            for (let step = 0; step <= STAGES.length; step++) {
                const stage = session.stage();
                if (!stage) break;
                const completion: Record<string, unknown> = {};
                const condition = stage.completion.result_condition;
                if (condition) place(completion, condition.pointer, condition.equals);
                expectDeclared(session.complete(stage.id, stage.completion.producer, completion, session.epoch()));
                expectDeclared(session.nextPath());
                if (!session.connected()) break;
            }
            expect(session.stage()).toBeNull();
        });
    }
});
`;
}
