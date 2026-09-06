import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
    TranslocoPipe,
    TranslocoService,
    TranslocoTestingModule,
} from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { describe, expect, it } from 'vitest';

@Component({
    imports: [TranslocoPipe],
    template: '<span data-proof>{{ "proof.message" | transloco }}</span>',
})
class TranslocoRuntimeProbe {}

describe('Transloco runtime proof', () => {
    it('rend la traduction chargée et jamais la clé brute', async () => {
        await TestBed.configureTestingModule({
            imports: [
                TranslocoRuntimeProbe,
                TranslocoTestingModule.forRoot({
                    langs: { fr: { proof: { message: 'preuve-traduite' } } },
                    translocoConfig: {
                        availableLangs: ['fr'],
                        defaultLang: 'fr',
                    },
                    preloadLangs: true,
                }),
            ],
        }).compileComponents();
        const service = TestBed.inject(TranslocoService);
        await firstValueFrom(service.load('fr'));
        service.setActiveLang('fr');
        const fixture = TestBed.createComponent(TranslocoRuntimeProbe);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
        const rendered = fixture.nativeElement.textContent.trim();
        expect(rendered).toBe('preuve-traduite');
        expect(rendered).not.toContain('proof.message');
    });
});
