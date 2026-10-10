import { expect, test, type Locator, type Page } from '@playwright/test';
import * as axe from 'axe-core';

import {
    COMPACT,
    EXPANDED,
    MEDIUM_CONSTRAINED,
    command,
    installLayoutBackend,
    openReadyPage,
    settle,
} from './layout-binding.support';
import { expectFailureWhileLegacy } from './c5-realization-baseline.support';

// ADAPT-11c, section 17 : « tests accessibilité automatisés sans violation
// sérieuse/critique » avant fusion ; FOCUS-03 : cibles d'au moins 48 × 48 px.
// Axe ne remplace ni un lecteur d'écran ni une inspection clavier humaine.

const CLASSES = [
    { name: 'Compact', viewport: COMPACT },
    { name: 'Medium contraint', viewport: MEDIUM_CONSTRAINED },
    { name: 'Expanded', viewport: EXPANDED },
] as const;
const MIN_TARGET = 48;

// Seuil de l'autorité, pas davantage : une violation `minor` ou `moderate`
// n'est pas un critère de fusion C5.
async function seriousAxeViolations(root: Locator) {
    await root.page().addScriptTag({ content: axe.source });
    return root.evaluate(async (element) => {
        const runtime = (window as unknown as { axe: typeof axe }).axe;
        const result = await runtime.run(element, {
            runOnly: {
                type: 'tag',
                values: [
                    'wcag2a',
                    'wcag2aa',
                    'wcag21a',
                    'wcag21aa',
                    'wcag22aa',
                ],
            },
        });
        return result.violations
            .filter(
                ({ impact }) => impact === 'serious' || impact === 'critical'
            )
            .map(({ id, impact, nodes }) => ({
                id,
                impact,
                targets: nodes.map(({ target }) => target),
            }));
    });
}

// Une case ou un bouton radio hérite de la cible de son libellé, qu'il
// l'enveloppe ou lui soit associé par `for` (`HTMLInputElement.labels`) ; tout
// autre contrôle est mesuré sur sa propre boîte.
async function undersizedTargets(page: Page) {
    return page.evaluate((minimum) => {
        const controls = Array.from(
            document.querySelectorAll<HTMLElement>(
                'button, a[href], input, select, textarea, [role="button"], [role="menuitem"], [role="tab"]'
            )
        );
        return controls
            .filter((control) => {
                if (control.closest('[inert], [hidden], [aria-hidden="true"]'))
                    return false;
                const style = getComputedStyle(control);
                if (style.visibility === 'hidden' || style.display === 'none')
                    return false;
                const { width, height } = control.getBoundingClientRect();
                return width > 0 && height > 0;
            })
            .map((control) => {
                const candidates =
                    control instanceof HTMLInputElement &&
                    (control.type === 'radio' || control.type === 'checkbox')
                        ? [control, ...Array.from(control.labels ?? [])]
                        : [control];
                // La cible activable la plus généreuse fait foi.
                const { width, height } = candidates
                    .map((candidate) => candidate.getBoundingClientRect())
                    .reduce((best, box) =>
                        Math.min(box.width, box.height) >
                        Math.min(best.width, best.height)
                            ? box
                            : best
                    );
                // Diagnostic seulement : sans nom propre, le premier libellé
                // associé non vide identifie le contrôle fautif.
                const labelText = (
                    control instanceof HTMLInputElement
                        ? Array.from(control.labels ?? [])
                        : []
                )
                    .map(
                        (label) =>
                            label.textContent?.replace(/\s+/g, ' ').trim() ?? ''
                    )
                    .find((text) => text !== '');
                return {
                    name: (
                        control.getAttribute('aria-label') ||
                        control.textContent?.trim() ||
                        labelText ||
                        control.tagName
                    ).slice(0, 40),
                    tag: control.tagName.toLowerCase(),
                    width: Math.round(width * 10) / 10,
                    height: Math.round(height * 10) / 10,
                };
            })
            .filter(({ width, height }) => width < minimum || height < minimum);
    }, MIN_TARGET);
}

for (const { name, viewport } of CLASSES) {
    test(`${name} : liste prête sans violation axe sérieuse ou critique et cibles d'au moins 48 px`, async ({
        page,
    }) => {
        expectFailureWhileLegacy(
            'C5 : la liste prête contient encore des cibles interactives de moins de 48 px.'
        );
        await installLayoutBackend(page);
        await page.setViewportSize(viewport);
        await openReadyPage(page);

        expect(await seriousAxeViolations(page.locator('body'))).toEqual([]);
        expect(await undersizedTargets(page)).toEqual([]);
    });

    test(`${name} : filtres ouverts sans violation axe sérieuse ou critique et cibles d'au moins 48 px`, async ({
        page,
    }) => {
        expectFailureWhileLegacy(
            'C5 : les filtres ouverts contiennent encore des cibles interactives de moins de 48 px.'
        );
        await installLayoutBackend(page);
        await page.setViewportSize(viewport);
        await openReadyPage(page);
        await command(page, 'filters').click();
        await expect(page.locator('#user-filter-panel')).toBeVisible();
        await settle(page);

        expect(await seriousAxeViolations(page.locator('body'))).toEqual([]);
        expect(await undersizedTargets(page)).toEqual([]);
    });

    test(`${name} : dialogue de création sans violation axe sérieuse ou critique et cibles d'au moins 48 px`, async ({
        page,
    }) => {
        expectFailureWhileLegacy(
            'C5 : le dialogue de création contient encore des cibles interactives de moins de 48 px.'
        );
        await installLayoutBackend(page);
        await page.setViewportSize(viewport);
        await openReadyPage(page);
        await command(page, 'create').click();
        await expect(page.getByRole('dialog')).toBeVisible();
        await settle(page);

        expect(await seriousAxeViolations(page.locator('body'))).toEqual([]);
        expect(await undersizedTargets(page)).toEqual([]);
    });
}

// Preuve autonome de la mesure, sans la page C5 : une case associée par
// `label[for]` n'est pas un descendant de son libellé.
test('mesure de cible : une case associée par label[for] hérite de la cible de son libellé', async ({
    page,
}) => {
    await page.setContent(`
        <!doctype html>
        <input id="active" type="checkbox"
            style="width: 16px; height: 16px; margin: 0" />
        <label for="active"
            style="display: inline-block; width: 48px; height: 48px">
            Actif
        </label>
    `);
    expect(await undersizedTargets(page)).toEqual([]);

    await page.locator('label').evaluate((label) => {
        label.style.height = '40px';
    });
    expect(await undersizedTargets(page)).toEqual([
        { name: 'Actif', tag: 'input', width: 48, height: 40 },
    ]);
});
