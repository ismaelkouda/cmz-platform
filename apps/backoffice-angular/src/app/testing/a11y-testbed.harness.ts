import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
    HttpTestingController,
    provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { APP_CONFIG } from '@cmz/core';
import { appConfig } from '../app.config';
import { expectNoAxeViolations } from './axe-a11y.util';

/**
 * Configuration de test partagée pour les specs a11y page-level.
 *
 * Pratiques Meta / Google Engineering (Shift-Left a11y) :
 * 1. **Même composition root** que la prod (`appConfig.providers`) — pas de
 *    double vérité DI.
 * 2. **HTTP mocké** (`provideHttpClientTesting`) — 0 réseau réel.
 * 3. **APP_CONFIG** synthétique — `window.__env` absent sous jsdom.
 * 4. **Router** minimal — pages qui naviguent (dashboard cards).
 *
 * Ordre providers : `appConfig` puis overrides (dernière inscription gagne).
 */
export const A11Y_TEST_APP_CONFIG = {
    authenticationUrl: 'https://test.invalid/auth/',
    reportUrl: 'https://test.invalid/reports/',
    settingUrl: 'https://test.invalid/settings/',
    fileUrl: 'https://test.invalid/files/',
    environmentDeployment: 'DEV',
    enableDebug: false,
} as const;

export async function configureA11yTestBed(
    components: Type<unknown>[]
): Promise<void> {
    await TestBed.configureTestingModule({
        imports: components,
        providers: [
            ...appConfig.providers,
            provideHttpClientTesting(),
            provideRouter([]),
            {
                provide: APP_CONFIG,
                useValue: { ...A11Y_TEST_APP_CONFIG },
            },
            {
                provide: ActivatedRoute,
                useValue: {
                    snapshot: { params: {}, queryParams: {}, data: {} },
                    params: {
                        // eslint-disable-next-line @typescript-eslint/no-empty-function -- stub ActivatedRoute, aucun cleanup requis en test
                        subscribe: () => ({ unsubscribe() {} }),
                    },
                    queryParams: {
                        // eslint-disable-next-line @typescript-eslint/no-empty-function -- stub ActivatedRoute, aucun cleanup requis en test
                        subscribe: () => ({ unsubscribe() {} }),
                    },
                },
            },
        ],
    }).compileComponents();
}

/**
 * Stabilise le rendu après flushes HTTP (resource / rxResource async).
 */
export async function stabilizeFixture(fixture: {
    detectChanges(): void;
    whenStable(): Promise<unknown>;
}): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    // microtask extra pour rxResource → signals
    await Promise.resolve();
    fixture.detectChanges();
}

/**
 * Envelope Laravel-like vide — shape minimale partagée des listes paginées.
 */
export function emptyLaravelPage<T = never>(items: T[] = []) {
    return {
        current_page: 1,
        data: items,
        first_page_url: '',
        from: 0,
        last_page: 1,
        last_page_url: '',
        links: [],
        next_page_url: '',
        path: '',
        per_page: 10,
        prev_page_url: '',
        to: 0,
        total: items.length,
    };
}

export function simpleOkEnvelope<T>(data: T) {
    return { error: false as const, message: '', data };
}

/**
 * Flush **toutes** les requêtes HTTP en attente avec le même payload.
 * (Pages mono-GET ; multi-GET : utiliser `http.match` manuellement.)
 */
export function flushAllPending(
    http: HttpTestingController,
    body: object | string | number | boolean | null
): number {
    const pending = http.match(() => true);
    for (const req of pending) {
        req.flush(body);
    }
    return pending.length;
}

export { expectNoAxeViolations };
