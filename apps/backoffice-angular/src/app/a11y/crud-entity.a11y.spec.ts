import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { InfrastructureListComponent } from '@cmz/administrative-infrastructure-ui';
import type { InfrastructureResponseApiDto } from '@cmz/administrative-infrastructure-data';
import type { InfrastructureTypeSelectResponseApiDto } from '@cmz/administrative-infrastructure-data';
import {
    configureA11yTestBed,
    emptyLaravelPage,
    expectNoAxeViolations,
    simpleOkEnvelope,
    stabilizeFixture,
} from '../testing/a11y-testbed.harness';
import { provideAdministrativeInfrastructure } from '../providers/administrative-infrastructure.providers';

/**
 * Archétype **crud-entity** (T12-8 / M-9) — page liste + filtres + table.
 * Référence Nx : `administrative-infrastructure` / InfrastructureListComponent.
 *
 * `provideAdministrativeInfrastructure()` passé explicitement (OPS-25) :
 * depuis la migration lazy-provider, ce repository n'est plus dans
 * `appConfig.providers` — voir le docstring de `configureA11yTestBed`.
 */
describe('a11y crud-entity — InfrastructureListComponent', () => {
    it('0 violation critical|serious sous jsdom (WCAG 2.0/2.1 A+AA)', async () => {
        await configureA11yTestBed(
            [InfrastructureListComponent],
            provideAdministrativeInfrastructure()
        );

        const http = TestBed.inject(HttpTestingController);
        const fixture = TestBed.createComponent(InfrastructureListComponent);

        fixture.detectChanges();

        const listResponse: InfrastructureResponseApiDto =
            simpleOkEnvelope(emptyLaravelPage());
        const typeSelectResponse: InfrastructureTypeSelectResponseApiDto =
            simpleOkEnvelope([]);

        const pending = http.match(() => true);
        expect(pending.length).toBe(2);
        for (const req of pending) {
            if (req.request.url.includes('equipment-types')) {
                req.flush(typeSelectResponse);
            } else {
                req.flush(listResponse);
            }
        }

        await stabilizeFixture(fixture);
        await expectNoAxeViolations(fixture.nativeElement as Element);
        http.verify();
    });
});
