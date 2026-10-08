import { expect, test, type Locator, type Page } from '@playwright/test';
import * as axe from 'axe-core';
import { writeFile } from 'node:fs/promises';

import {
    installBrowserHost,
    openReadyPage,
    serveDeterministicApi,
} from './users-management.support';

const VIEWPORTS = [
    { name: 'compact', width: 390, height: 844 },
    { name: 'medium', width: 900, height: 900 },
    { name: 'expanded', width: 1440, height: 900 },
] as const;
const MAX_ENCODED_RESOURCE_BYTES = 512 * 1024;

async function axeViolations(root: Locator) {
    await root.page().addScriptTag({ content: axe.source });
    return root.evaluate(async (element) => {
        const runtime = (
            window as unknown as {
                axe: typeof axe;
            }
        ).axe;
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
        return result.violations.map(({ id, impact, nodes }) => ({
            id,
            impact,
            targets: nodes.map(({ target }) => target),
        }));
    });
}

async function documentWidth(page: Page) {
    return page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
    }));
}

test('rend les trois classes adaptatives sans débordement et produit leurs preuves', async ({
    page,
}) => {
    await installBrowserHost(page);
    await serveDeterministicApi(page);
    const browserErrors: string[] = [];
    page.on('pageerror', (error) => browserErrors.push(error.message));
    page.on('console', (message) => {
        if (message.type() === 'error') browserErrors.push(message.text());
    });
    const evidence: Record<string, unknown> = {};

    for (const viewport of VIEWPORTS) {
        await page.setViewportSize(viewport);
        await openReadyPage(page);
        const width = await documentWidth(page);
        expect(width.scrollWidth).toBeLessThanOrEqual(width.clientWidth + 1);
        expect(await axeViolations(page.locator('main'))).toEqual([]);

        await page.screenshot({
            path: test
                .info()
                .outputPath(
                    `${viewport.name}-users-management-ready.actual.png`
                ),
            animations: 'disabled',
            caret: 'hide',
        });

        const filterToggle = page.getByRole('button', { name: 'Filtres' });
        await filterToggle.click();
        const panel = page.getByRole('complementary', {
            name: 'Filtres des utilisateurs',
        });
        const panelBox = await panel.boundingBox();
        const regionBox = await page
            .locator('[class*="dataRegion"]')
            .boundingBox();
        expect(panelBox).not.toBeNull();
        expect(regionBox).not.toBeNull();
        if (!panelBox || !regionBox) throw new Error('géométrie indisponible');

        if (viewport.name === 'compact') {
            expect(panelBox.x).toBeLessThanOrEqual(1);
            expect(panelBox.width).toBeGreaterThanOrEqual(viewport.width - 1);
            expect(panelBox.y + panelBox.height).toBeGreaterThanOrEqual(
                viewport.height - 1
            );
        } else {
            expect(Math.abs(panelBox.y - regionBox.y)).toBeLessThanOrEqual(1);
            expect(
                Math.abs(
                    panelBox.y +
                        panelBox.height -
                        (regionBox.y + regionBox.height)
                )
            ).toBeLessThanOrEqual(1);
            expect(
                Math.abs(
                    panelBox.x +
                        panelBox.width -
                        (regionBox.x + regionBox.width)
                )
            ).toBeLessThanOrEqual(1);
        }
        expect(await axeViolations(panel)).toEqual([]);
        await page.screenshot({
            path: test
                .info()
                .outputPath(
                    `${viewport.name}-users-management-filters-open.actual.png`
                ),
            animations: 'disabled',
            caret: 'hide',
        });
        await filterToggle.click();

        await page
            .getByRole('button', { name: 'Créer un utilisateur' })
            .click();
        const dialog = page.getByRole('dialog', {
            name: 'Créer un utilisateur',
        });
        await expect(dialog).toBeVisible();
        expect(await axeViolations(dialog)).toEqual([]);
        const dialogBox = await dialog.boundingBox();
        expect(dialogBox).not.toBeNull();
        if (!dialogBox) throw new Error('géométrie du dialogue indisponible');
        if (viewport.name === 'compact') {
            expect(dialogBox.x).toBeLessThanOrEqual(1);
            expect(dialogBox.width).toBeGreaterThanOrEqual(viewport.width - 1);
            expect(dialogBox.y).toBeLessThanOrEqual(1);
            expect(dialogBox.height).toBeGreaterThanOrEqual(
                viewport.height - 1
            );
        } else {
            const leftGap = dialogBox.x;
            const rightGap = viewport.width - dialogBox.x - dialogBox.width;
            expect(Math.abs(leftGap - rightGap)).toBeLessThanOrEqual(2);
        }
        await page.screenshot({
            path: test
                .info()
                .outputPath(
                    `${viewport.name}-users-management-create-open.actual.png`
                ),
            animations: 'disabled',
            caret: 'hide',
        });
        await dialog
            .getByRole('button', {
                name: 'Fermer le formulaire de création',
            })
            .click();

        evidence[viewport.name] = {
            viewport,
            document: width,
            filterPanel: panelBox,
            createDialog: dialogBox,
        };
    }

    const resources = await page.evaluate(() =>
        performance
            .getEntriesByType('resource')
            .map((entry) => entry as PerformanceResourceTiming)
            .filter(
                ({ initiatorType }) =>
                    initiatorType === 'script' || initiatorType === 'link'
            )
            .map(
                ({
                    name,
                    initiatorType,
                    encodedBodySize,
                    decodedBodySize,
                }) => ({
                    name: new URL(name).pathname,
                    initiatorType,
                    encodedBodySize,
                    decodedBodySize,
                })
            )
    );
    const encodedBytes = resources.reduce(
        (sum, resource) => sum + resource.encodedBodySize,
        0
    );
    expect(encodedBytes).toBeGreaterThan(0);
    expect(encodedBytes).toBeLessThanOrEqual(MAX_ENCODED_RESOURCE_BYTES);
    expect(browserErrors).toEqual([]);

    const evidencePath = test.info().outputPath('browser-layout-evidence.json');
    await writeFile(
        evidencePath,
        JSON.stringify(
            {
                schema_version: '1.0.0',
                viewports: evidence,
                resources,
                encodedBytes,
                axeViolations: 0,
                browserErrors,
            },
            null,
            2
        ),
        'utf8'
    );
    await test.info().attach('browser-layout-evidence.json', {
        path: evidencePath,
        contentType: 'application/json',
    });
});

test('conserve focus, clavier et reflow à 320 px et texte à 200 %', async ({
    page,
}) => {
    await installBrowserHost(page);
    await serveDeterministicApi(page);
    await page.setViewportSize({ width: 320, height: 900 });
    await openReadyPage(page);
    let width = await documentWidth(page);
    expect(width.scrollWidth).toBeLessThanOrEqual(width.clientWidth + 1);

    const trigger = page.getByRole('button', {
        name: 'Créer un utilisateur',
    });
    await trigger.click();
    const dialog = page.getByRole('dialog', {
        name: 'Créer un utilisateur',
    });
    await expect(dialog.getByLabel('Nom', { exact: true })).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(
        dialog.getByRole('button', {
            name: 'Fermer le formulaire de création',
        })
    ).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();

    await page.setViewportSize({ width: 640, height: 900 });
    await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
    width = await documentWidth(page);
    expect(width.scrollWidth).toBeLessThanOrEqual(width.clientWidth + 1);
    const clippedControls = await page
        .locator('button, input, select')
        .evaluateAll((controls) =>
            controls
                .filter(
                    (control) =>
                        control.scrollWidth > control.clientWidth + 1 ||
                        control.scrollHeight > control.clientHeight + 1
                )
                .map(
                    (control) =>
                        control.getAttribute('aria-label') ??
                        control.textContent?.trim()
                )
        );
    expect(clippedControls).toEqual([]);
});
