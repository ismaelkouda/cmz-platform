import { expect, test, type Locator, type Page } from '@playwright/test';
import * as axe from 'axe-core';

import {
    expectControlsFitWithoutOverlap,
    applyAndExpectTextReflow,
    fulfillUsersPage,
    installBrowserHost,
    openReadyPage,
    serveDeterministicApi,
    USERS_PATH,
} from './users-management.support';
import { installDeterministicReflowFonts } from './users-management-reflow-fonts.support';

const COMPACT = { width: 390, height: 844 } as const;
const MEDIUM = { width: 900, height: 900 } as const;

function filterTrigger(page: Page): Locator {
    return page.getByRole('button', { name: /^Filtres(?:, \d+ actifs?)?$/ });
}

async function openCompactFilters(page: Page): Promise<Locator> {
    await filterTrigger(page).click();
    const dialog = page.locator('#users-filter-panel');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAccessibleName('Filtres');
    return dialog;
}

function userReads(
    requests: readonly {
        readonly method: string;
        readonly pathname: string;
    }[]
): number {
    return requests.filter(
        ({ method, pathname }) =>
            method === 'GET' && pathname.endsWith(USERS_PATH)
    ).length;
}

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
            rules: {
                'label-content-name-mismatch': { enabled: true },
            },
        });
        return result.violations.map(({ id, impact, nodes }) => ({
            id,
            impact,
            targets: nodes.map(({ target }) => target),
        }));
    });
}

test.beforeEach(async ({ page }) => {
    await page.setViewportSize(COMPACT);
    await installBrowserHost(page);
});

test('compact conserve un dialogue unique du sommaire au détail et maîtrise le focus', async ({
    page,
}) => {
    await serveDeterministicApi(page);
    await openReadyPage(page);

    const trigger = filterTrigger(page);
    const dialog = await openCompactFilters(page);
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(
        dialog.getByRole('button', { name: /^Profil\b/ })
    ).toBeFocused();
    await expect(page.getByRole('dialog')).toHaveCount(1);

    const identity = await dialog.evaluate((element) => {
        element.dataset.testIdentity = 'compact-filter-dialog';
        return element.dataset.testIdentity;
    });
    expect(identity).toBe('compact-filter-dialog');

    for (const name of [
        'Profil Tous les profils',
        'Rôle Tous les rôles',
        'Statut Tous',
    ]) {
        const summaryButton = dialog.getByRole('button', {
            name,
            exact: true,
        });
        await expect(summaryButton).toBeVisible();
        await expect(summaryButton).not.toHaveAttribute('aria-label');
    }

    const statusSummary = dialog.getByRole('button', { name: /^Statut\b/ });
    await statusSummary.click();
    await expect(dialog).toHaveAccessibleName('Statut');
    await expect(dialog.getByRole('heading', { name: 'Statut' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Retour' })).toBeVisible();
    await expect(dialog.getByRole('radio', { name: 'Tous' })).toBeFocused();
    await expect(dialog).toHaveAttribute(
        'data-test-identity',
        'compact-filter-dialog'
    );
    await expect(page.getByRole('dialog')).toHaveCount(1);

    await dialog.getByRole('button', { name: 'Retour' }).click();
    await expect(dialog).toHaveAccessibleName('Filtres');
    const initialStatusSummary = dialog.getByRole('button', {
        name: 'Statut Tous',
        exact: true,
    });
    await expect(initialStatusSummary).toBeFocused();
    expect(await axeViolations(dialog)).toEqual([]);

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
});

test('compact sépare brouillon et filtres appliqués puis émet un seul GET', async ({
    page,
}) => {
    const api = await serveDeterministicApi(page, {
        usersResponder: ({ route, pageNumber }) =>
            fulfillUsersPage(route, {
                users: [
                    {
                        id: 'user-1',
                        firstName: 'Mariam',
                        lastName: 'Koné',
                    },
                ],
                currentPage: pageNumber,
                lastPage: 1,
                total: 1,
            }),
    });
    await openReadyPage(page);
    const initialReads = userReads(api.requests);

    let dialog = await openCompactFilters(page);
    await dialog.getByRole('button', { name: /^Statut\b/ }).click();
    await dialog.getByRole('radio', { name: 'Inactifs' }).check();
    expect(userReads(api.requests)).toBe(initialReads);

    await dialog.getByRole('button', { name: 'Réinitialiser' }).click();
    await expect(dialog.getByRole('radio', { name: 'Tous' })).toBeChecked();
    expect(userReads(api.requests)).toBe(initialReads);

    await dialog.getByRole('radio', { name: 'Inactifs' }).check();
    await dialog.getByRole('button', { name: 'Fermer les filtres' }).click();
    expect(userReads(api.requests)).toBe(initialReads);

    dialog = await openCompactFilters(page);
    await dialog.getByRole('button', { name: /^Statut\b/ }).click();
    await expect(dialog.getByRole('radio', { name: 'Tous' })).toBeChecked();
    await dialog.getByRole('radio', { name: 'Inactifs' }).check();
    await dialog.getByRole('button', { name: 'Retour' }).click();
    const inactiveStatusSummary = dialog.getByRole('button', {
        name: 'Statut Inactifs',
        exact: true,
    });
    await expect(inactiveStatusSummary).toBeVisible();
    await expect(inactiveStatusSummary).not.toHaveAttribute('aria-label');
    await dialog.getByRole('button', { name: 'Appliquer' }).click();

    await expect.poll(() => userReads(api.requests)).toBe(initialReads + 1);
    await page.waitForTimeout(250);
    expect(userReads(api.requests)).toBe(initialReads + 1);
    const parameters = new URLSearchParams(api.requests.at(-1)?.search);
    expect(Object.fromEntries(parameters)).toEqual({
        page: '1',
        is_active: 'false',
    });
    await expect(dialog).toHaveCount(0);
    await expect(filterTrigger(page)).toHaveAccessibleName('Filtres, 1 actif');
});

test('compact borne le sheet, conserve le brouillon au resize et reflow à 200 %', async ({
    page,
}) => {
    const api = await serveDeterministicApi(page);
    await openReadyPage(page);
    const dialog = await openCompactFilters(page);
    const box = await dialog.boundingBox();
    expect(box).not.toBeNull();
    if (!box) throw new Error('Géométrie du bottom sheet indisponible.');
    expect(box.x).toBeLessThanOrEqual(1);
    expect(box.width).toBeGreaterThanOrEqual(COMPACT.width - 1);
    expect(box.height).toBeLessThanOrEqual(COMPACT.height * 0.8 + 1);
    expect(box.y + box.height).toBeGreaterThanOrEqual(COMPACT.height - 1);

    await dialog.getByRole('button', { name: /^Statut\b/ }).click();
    await dialog.getByRole('radio', { name: 'Inactifs' }).check();
    const readsBeforeResize = userReads(api.requests);

    await page.setViewportSize(MEDIUM);
    const mediumPanel = page.getByRole('complementary', {
        name: 'Filtres des utilisateurs',
    });
    await expect(mediumPanel).toBeVisible();
    await expect(
        mediumPanel.getByRole('radio', { name: 'Inactifs' })
    ).toBeChecked();
    expect(userReads(api.requests)).toBe(readsBeforeResize);

    await page.setViewportSize({ width: 320, height: 640 });
    const compactAgain = page.getByRole('dialog', { name: 'Statut' });
    await expect(compactAgain).toBeVisible();
    const resetButton = compactAgain.getByRole('button', {
        name: 'Réinitialiser',
    });
    const applyButton = compactAgain.getByRole('button', {
        name: 'Appliquer',
    });
    await expectControlsFitWithoutOverlap(resetButton, applyButton);
    await installDeterministicReflowFonts(page, { resetButton });
    await applyAndExpectTextReflow(page);
    const reflow = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        overflowingElements: Array.from(
            document.querySelectorAll<HTMLElement>('body *')
        )
            .filter((element) => {
                const bounds = element.getBoundingClientRect();
                return (
                    bounds.width > 0 &&
                    (bounds.left < -1 || bounds.right > window.innerWidth + 1)
                );
            })
            .slice(0, 10)
            .map((element) => ({
                className: element.className,
                tagName: element.tagName,
                text: element.textContent?.trim().slice(0, 80),
            })),
    }));
    const clippedControls = await compactAgain
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
    await expectControlsFitWithoutOverlap(resetButton, applyButton);
    expect(
        reflow.scrollWidth,
        `Éléments hors viewport : ${JSON.stringify(reflow.overflowingElements)}`
    ).toBeLessThanOrEqual(reflow.clientWidth + 1);
    expect(reflow.overflowingElements).toEqual([]);
    expect(clippedControls).toEqual([]);
    expect(userReads(api.requests)).toBe(readsBeforeResize);
});
