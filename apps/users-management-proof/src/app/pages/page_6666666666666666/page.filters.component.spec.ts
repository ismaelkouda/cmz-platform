import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { AccordionGroupHarness } from '@angular/aria/accordion/testing';
import { MenuHarness } from '@angular/aria/menu/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PageFiltersComponent } from './page.filters.component';

describe('PageFiltersComponent', () => {
    afterEach(() => {
        TestBed.resetTestingModule();
        vi.restoreAllMocks();
    });

    it('compose Menu et Accordion Angular Aria sans soumettre implicitement', async () => {
        await TestBed.configureTestingModule({
            imports: [PageFiltersComponent],
        }).compileComponents();
        const fixture = TestBed.createComponent(PageFiltersComponent);
        fixture.componentRef.setInput('layout', 'medium');
        fixture.componentRef.setInput('open', true);
        fixture.componentRef.setInput('applied', {
            profile: '',
            role: '',
            status: '',
        });
        fixture.componentRef.setInput('profiles', [
            { value: 'profile-a', label: 'Profil A' },
        ]);
        const filtersApplied = vi.fn();
        fixture.componentInstance.filtersApplied.subscribe(filtersApplied);
        fixture.detectChanges();
        await fixture.whenStable();

        const root = fixture.nativeElement as HTMLElement;
        const trigger = root.querySelector<HTMLButtonElement>(
            '[data-cmz-id="add-filter-trigger"]'
        );
        if (!trigger) throw new Error('Action Ajouter un filtre introuvable.');
        trigger.click();
        fixture.detectChanges();
        await fixture.whenStable();

        const documentLoader =
            TestbedHarnessEnvironment.documentRootLoader(fixture);
        const menu = await documentLoader.getHarness(
            MenuHarness.with({ selector: '[data-cmz-id="available-filters"]' })
        );
        expect(await menu.isOpen()).toBe(true);
        const status = await menu.getItems({ text: 'Statut' });
        expect(status).toHaveLength(1);
        await status[0]?.click();
        fixture.detectChanges();
        await fixture.whenStable();

        const loader = TestbedHarnessEnvironment.loader(fixture);
        const group = await loader.getHarness(AccordionGroupHarness);
        const accordions = await group.getAccordions({ title: /Statut/ });
        expect(accordions).toHaveLength(1);
        expect(await accordions[0]?.isExpanded()).toBe(true);
        await accordions[0]?.collapse();
        expect(await accordions[0]?.isExpanded()).toBe(false);
        expect(filtersApplied).not.toHaveBeenCalled();
    });
});
