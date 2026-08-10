import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { QueuesProcessingPageComponent } from '@cmz/processing-ui';
import {
    configureA11yTestBed,
    emptyLaravelPage,
    expectNoAxeViolations,
    simpleOkEnvelope,
    stabilizeFixture,
} from '../testing/a11y-testbed.harness';

/**
 * Archétype **workflow-action** (T12-8 / M-9) — liste filtrable + table +
 * actions (prendre / détail). Page de référence : queues processing.
 *
 * Gate : critical + serious (axe WCAG 2.0/2.1 A+AA), hors color-contrast
 * (jsdom). Prouve que le pattern filter + table + toolbar boutons nommés
 * reste accessible après evolution product.
 */
describe('a11y workflow-action — QueuesProcessingPageComponent', () => {
    it('0 violation critical|serious sous jsdom (WCAG 2.0/2.1 A+AA)', async () => {
        await configureA11yTestBed([QueuesProcessingPageComponent]);

        const http = TestBed.inject(HttpTestingController);
        const fixture = TestBed.createComponent(QueuesProcessingPageComponent);

        fixture.detectChanges();

        const listBody = simpleOkEnvelope(emptyLaravelPage());
        const pending = http.match(() => true);
        expect(pending.length).toBeGreaterThanOrEqual(1);
        for (const req of pending) {
            req.flush(listBody);
        }

        await stabilizeFixture(fixture);
        await expectNoAxeViolations(fixture.nativeElement as Element);
        http.verify();
    });
});
