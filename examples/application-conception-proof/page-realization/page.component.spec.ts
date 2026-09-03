import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PageComponent } from './page.component';

describe('PageComponent', () => {
    let fixture: ComponentFixture<PageComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        fixture = TestBed.createComponent(PageComponent);
    });

    it('exposes the contract controls with accessible native semantics', async () => {
        await fixture.whenStable();

        const root = fixture.nativeElement as HTMLElement;
        const field = root.querySelector<HTMLTextAreaElement>(
            '[data-cmz-id="message"]'
        );
        const action = root.querySelector<HTMLButtonElement>(
            '[data-cmz-id="submit-note"]'
        );

        expect(field?.required).toBe(true);
        expect(field?.maxLength).toBe(500);
        expect(action?.type).toBe('submit');
    });

    it('emits normalized input without performing network access', () => {
        const emitted: string[] = [];
        fixture.componentInstance.noteSubmitted.subscribe((value) =>
            emitted.push(value)
        );

        fixture.componentInstance.submit(
            new SubmitEvent('submit'),
            '  reviewed note  '
        );

        expect(emitted).toEqual(['reviewed note']);
    });
});
