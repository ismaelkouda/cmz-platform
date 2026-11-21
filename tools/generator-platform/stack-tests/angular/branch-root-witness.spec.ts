// X5 C6 F1 : témoin de la pile Angular RÉELLE (compilation du runner natif).
// La grammaire exige, à la racine de chaque branche d'état et de la branche
// hors ligne, un élément RENDU qui porte son data-cmz-id (mesuré par N5).
// Ce témoin observe pourquoi `ng-container` et `ng-template` n'y suffisent
// pas : ils ne produisent aucun élément, donc aucun [data-cmz-id] dans le
// DOM, alors qu'un élément le porte. Le refus est épinglé côté grammaire
// (external-page-read-branch-ids.test.mjs, « F1 »).
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vitest';

@Component({
    selector: 'cmz-branch-root-witness',
    template: `
        @if (shown) {
            <ng-container data-cmz-id="witness-state-container">
                <p class="state">Container branch.</p>
            </ng-container>
        }
        @if (shown) {
            <div data-cmz-id="witness-state-element">
                <p class="state">Element branch.</p>
            </div>
        }
        @if (shown) {
            <ng-template data-cmz-id="witness-state-template">
                <p class="state">Template branch.</p>
            </ng-template>
        }
    `,
})
class BranchRootWitness {
    protected readonly shown = true;
}

describe('F1 : racine de branche rendue (pile Angular réelle)', () => {
    afterEach(() => {
        TestBed.resetTestingModule();
    });

    it('ng-container et ng-template ne rendent aucun [data-cmz-id] ; un élément le porte', () => {
        const fixture = TestBed.createComponent(BranchRootWitness);
        fixture.detectChanges();
        const root = fixture.nativeElement as HTMLElement;
        const carriers = [...root.querySelectorAll('[data-cmz-id]')].map(
            (element) => element.getAttribute('data-cmz-id')
        );
        expect(carriers).toEqual(['witness-state-element']);
        // Le contenu du ng-container est bien rendu, mais sans porteur.
        expect(root.textContent).toContain('Container branch.');
        expect(root.textContent).toContain('Element branch.');
        // Le contenu d'un ng-template n'est pas rendu du tout.
        expect(root.textContent).not.toContain('Template branch.');
    });
});
