import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import {
    HttpTestingController,
    provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { APP_CONFIG } from '@cmz/core';
import { InfrastructureListComponent } from '@cmz/administrative-infrastructure-ui';
import type { InfrastructureResponseApiDto } from '@cmz/administrative-infrastructure-data';
import type { InfrastructureTypeSelectResponseApiDto } from '@cmz/administrative-infrastructure-data';
import { appConfig } from '../app.config';
import { expectNoAxeViolations } from '../testing/axe-a11y.util';

/**
 * Audit M-9 (revue finale 2026-08-02) — premier test a11y du dépôt, un par
 * archétype de page (`docs/architecture/patterns/*.pattern.json`). Celui-ci
 * couvre **crud-entity** via `InfrastructureListComponent`
 * (`administrative-infrastructure`), le module de référence choisi pour
 * `crud-entity.pattern.json` Nx-shaped (N-7, même passe).
 *
 * Réutilise `appConfig.providers` (même technique que `app.spec.ts`, I-*) —
 * pas une reconstruction manuelle de l'arbre de DI qui pourrait diverger
 * silencieusement de la composition root réelle. Deux ajouts propres au
 * test : `provideHttpClientTesting()` (après `provideHttpClient(...)` dans
 * `appConfig.providers` — la dernière inscription du token l'emporte,
 * comportement Angular documenté) pour intercepter les 2 requêtes GET que
 * le constructeur du composant déclenche (liste + select des types), et un
 * `APP_CONFIG` de test (le vrai passe par `window.__env`, jamais peuplé
 * sous jsdom — aucun test existant ne l'avait rencontré avant celui-ci
 * car aucun ne va jusqu'à instancier un service consommateur d'API réel).
 */
describe('a11y crud-entity — InfrastructureListComponent', () => {
    it('ne produit aucune violation axe-core détectable sous jsdom (hors color-contrast, cf. axe-a11y.util.ts)', async () => {
        await TestBed.configureTestingModule({
            imports: [InfrastructureListComponent],
            providers: [
                ...appConfig.providers,
                provideHttpClientTesting(),
                {
                    provide: APP_CONFIG,
                    useValue: {
                        authenticationUrl: 'https://test.invalid/auth/',
                        reportUrl: 'https://test.invalid/reports/',
                        settingUrl: 'https://test.invalid/settings/',
                        fileUrl: 'https://test.invalid/files/',
                        environmentDeployment: 'DEV',
                        enableDebug: false,
                    },
                },
                {
                    provide: ActivatedRoute,
                    useValue: { snapshot: {}, params: {}, queryParams: {} },
                },
            ],
        }).compileComponents();

        const http = TestBed.inject(HttpTestingController);
        const fixture = TestBed.createComponent(InfrastructureListComponent);

        fixture.detectChanges();

        const listResponse: InfrastructureResponseApiDto = {
            error: false,
            message: '',
            data: {
                current_page: 1,
                data: [],
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
                total: 0,
            },
        };
        const typeSelectResponse: InfrastructureTypeSelectResponseApiDto = {
            error: false,
            message: '',
            data: [],
        };

        const pending = http.match(() => true);
        expect(pending.length).toBe(2);
        for (const req of pending) {
            if (req.request.url.includes('equipment-types')) {
                req.flush(typeSelectResponse);
            } else {
                req.flush(listResponse);
            }
        }

        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        await expectNoAxeViolations(fixture.nativeElement as Element);

        http.verify();
    });
});
