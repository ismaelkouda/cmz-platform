import { describe, expect, it } from 'vitest';
import {
    DEFAULT_AXE_BLOCKING_IMPACTS,
    expectNoAxeViolations,
    formatAxeViolations,
    partitionAxeViolations,
    runAxeGate,
} from './axe-a11y.util';
import type { Result } from 'axe-core';

function makeViolation(
    id: string,
    impact: Result['impact']
): Result {
    return {
        id,
        impact,
        help: `help-${id}`,
        helpUrl: `https://example.test/${id}`,
        description: '',
        tags: [],
        nodes: [
            {
                target: [`#${id}`],
                html: `<div id="${id}">`,
                impact,
                any: [],
                all: [],
                none: [],
                failureSummary: '',
            },
        ],
    } as Result;
}

/**
 * Politique de gate a11y (T12-8) — prouvable **sans** bundler de page Angular.
 * Les specs archétype (crud / WA / RO-view) prouvent le rendu réel.
 */
describe('axe-a11y.util — politique de gate Big Tech', () => {
    it('DEFAULT_AXE_BLOCKING_IMPACTS = critical + serious uniquement', () => {
        expect([...DEFAULT_AXE_BLOCKING_IMPACTS]).toEqual([
            'critical',
            'serious',
        ]);
    });

    it('partitionAxeViolations sépare bloquantes / non bloquantes', () => {
        const { blocking, nonBlocking } = partitionAxeViolations(
            [
                makeViolation('button-name', 'critical'),
                makeViolation('label', 'serious'),
                makeViolation('region', 'moderate'),
                makeViolation('landmark', 'minor'),
            ],
            DEFAULT_AXE_BLOCKING_IMPACTS
        );
        expect(blocking.map((v) => v.id)).toEqual(['button-name', 'label']);
        expect(nonBlocking.map((v) => v.id)).toEqual(['region', 'landmark']);
    });

    it('formatAxeViolations inclut impact, id, nœuds, helpUrl', () => {
        const text = formatAxeViolations([
            makeViolation('image-alt', 'critical'),
        ]);
        expect(text).toContain('[critical]');
        expect(text).toContain('image-alt');
        expect(text).toContain('#image-alt');
        expect(text).toContain('https://example.test/image-alt');
    });

    it('détecte des violations bloquantes sur un fragment inaccessible', async () => {
        const host = document.createElement('div');
        host.innerHTML = `
            <img src="x.png">
            <button type="button"></button>
        `;
        document.body.appendChild(host);
        try {
            await expect(
                expectNoAxeViolations(host, { reportNonBlocking: false })
            ).rejects.toThrow(/BLOQUANTES|image-alt|button-name/i);
        } finally {
            host.remove();
        }
    });

    it('passe un fragment structurellement conforme (WCAG tags, hors color-contrast)', async () => {
        const host = document.createElement('div');
        host.innerHTML = `
            <section>
              <h1>Titre page</h1>
              <button type="button">Enregistrer</button>
              <label for="email">Email</label>
              <input id="email" type="email" />
              <img src="ok.png" alt="Illustration" />
            </section>
        `;
        document.body.appendChild(host);
        try {
            await expect(
                expectNoAxeViolations(host, { reportNonBlocking: false })
            ).resolves.toBeUndefined();
            const gate = await runAxeGate(host);
            expect(gate.blocking).toEqual([]);
        } finally {
            host.remove();
        }
    });
});
