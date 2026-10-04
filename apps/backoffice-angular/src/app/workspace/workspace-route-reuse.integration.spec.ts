import { Component, OnDestroy, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import {
    RouteReuseStrategy,
    Router,
    RouterOutlet,
    provideRouter,
    withAutoCleanupInjectors,
} from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import {
    WORKSPACE_CONFIG,
    WorkspaceRouteReuseStrategy,
    WorkspaceService,
} from '@cmz/shared-ui';
import { beforeEach, describe, expect, it } from 'vitest';

@Component({
    selector: 'app-test-workspace-shell',
    imports: [RouterOutlet],
    template: '<router-outlet />',
})
class TestShellComponent {}

let pageACreations = 0;
let pageADestructions = 0;

@Component({ selector: 'app-test-page-a', template: '{{ value() }}' })
class TestPageAComponent implements OnDestroy {
    readonly instance = ++pageACreations;
    readonly value = signal('initial');

    ngOnDestroy(): void {
        pageADestructions += 1;
    }
}

@Component({ selector: 'app-test-page-b', template: 'B' })
class TestPageBComponent {}

describe('WorkspaceRouteReuseStrategy avec le Router réel', () => {
    beforeEach(() => {
        pageACreations = 0;
        pageADestructions = 0;
        TestBed.configureTestingModule({
            providers: [
                provideRouter(
                    [
                        {
                            path: '',
                            component: TestShellComponent,
                            data: { workspaceRoot: true },
                            children: [
                                { path: 'a', component: TestPageAComponent },
                                { path: 'b', component: TestPageBComponent },
                            ],
                        },
                    ],
                    withAutoCleanupInjectors()
                ),
                WorkspaceRouteReuseStrategy,
                {
                    provide: RouteReuseStrategy,
                    useExisting: WorkspaceRouteReuseStrategy,
                },
                { provide: WORKSPACE_CONFIG, useValue: { maxOpenViews: 8 } },
                WorkspaceService,
            ],
        });
    });

    it('rattache la même instance et son signal sans reconstruction', async () => {
        const harness = await RouterTestingHarness.create();
        await harness.navigateByUrl('/a');
        const first = harness.fixture.debugElement.query(
            By.directive(TestPageAComponent)
        ).componentInstance as TestPageAComponent;
        first.value.set('brouillon conservé');

        await harness.navigateByUrl('/b');
        await harness.navigateByUrl('/a');
        const restored = harness.fixture.debugElement.query(
            By.directive(TestPageAComponent)
        ).componentInstance as TestPageAComponent;

        expect(restored).toBe(first);
        expect(restored.instance).toBe(1);
        expect(restored.value()).toBe('brouillon conservé');
        expect(pageACreations).toBe(1);
        expect(pageADestructions).toBe(0);
    });

    it('détruit réellement la vue active quand sa fermeture est préparée', async () => {
        const harness = await RouterTestingHarness.create();
        const strategy = TestBed.inject(WorkspaceRouteReuseStrategy);
        await harness.navigateByUrl('/a');

        strategy.prepareForClosure('/a');
        await harness.navigateByUrl('/b');
        strategy.finishClosure('/a');

        expect(pageACreations).toBe(1);
        expect(pageADestructions).toBe(1);
        expect(strategy.has('/a')).toBe(false);
    });

    it('ne laisse aucun handle fermé après 100 cycles Router', async () => {
        const harness = await RouterTestingHarness.create();
        const strategy = TestBed.inject(WorkspaceRouteReuseStrategy);
        await harness.navigateByUrl('/b');

        for (let cycle = 0; cycle < 100; cycle += 1) {
            await harness.navigateByUrl('/a');
            strategy.prepareForClosure('/a');
            await harness.navigateByUrl('/b');
            strategy.finishClosure('/a');
        }

        expect(pageACreations).toBe(100);
        expect(pageADestructions).toBe(100);
        expect(strategy.has('/a')).toBe(false);
    });

    it('détruit le handle réel d’une vue suspendue après révocation', async () => {
        const harness = await RouterTestingHarness.create();
        const strategy = TestBed.inject(WorkspaceRouteReuseStrategy);
        const workspace = TestBed.inject(WorkspaceService);

        await harness.navigateByUrl('/a');
        workspace.registerNavigation({
            id: '/a',
            url: '/a',
            title: 'A',
            accessPath: '/a',
        });
        await harness.navigateByUrl('/b');
        workspace.registerNavigation({
            id: '/b',
            url: '/b',
            title: 'B',
            pinned: true,
        });

        expect(strategy.has('/a')).toBe(true);
        await expect(workspace.revokeAccess(['/a'])).resolves.toBe(true);

        expect(pageADestructions).toBe(1);
        expect(strategy.has('/a')).toBe(false);
        expect(workspace.views().map(({ id }) => id)).toEqual(['/b']);
    });

    it('détruit la vraie instance active révoquée malgré un brouillon dirty', async () => {
        const harness = await RouterTestingHarness.create();
        const workspace = TestBed.inject(WorkspaceService);

        await harness.navigateByUrl('/b');
        workspace.registerNavigation({
            id: '/b',
            url: '/b',
            title: 'B',
            pinned: true,
        });
        await harness.navigateByUrl('/a');
        workspace.registerNavigation({
            id: '/a',
            url: '/a',
            title: 'A',
            accessPath: '/a',
        });
        workspace.markDirty('/a', true);

        await expect(workspace.revokeAccess(['/a'])).resolves.toBe(true);

        expect(TestBed.inject(Router).url).toBe('/b');
        expect(pageADestructions).toBe(1);
        expect(workspace.views().map(({ id }) => id)).toEqual(['/b']);
    });
});
