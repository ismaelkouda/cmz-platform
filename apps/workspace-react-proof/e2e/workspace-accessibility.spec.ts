import { expect, test, type Page } from '@playwright/test';
import * as axe from 'axe-core';

const PROFILE_ENDPOINT = '/api/workspace/profile';

async function serveProfile(page: Page): Promise<void> {
    await page.route(`**${PROFILE_ENDPOINT}`, async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                name: 'Soumaila Kouda',
                role: 'Administrateur',
            }),
        });
    });
}

test('respecte Tabs APG, l’activation manuelle et la fermeture au clavier', async ({
    page,
}) => {
    await serveProfile(page);
    await page.goto('/workspace/profile');
    await expect(page.getByText('Soumaila Kouda')).toBeVisible();

    const tablist = page.getByRole('tablist', { name: 'Vues ouvertes' });
    const dashboardTab = page.getByRole('tab', {
        name: 'Tableau de bord',
    });
    const profileTab = page.getByRole('tab', { name: 'Profil' });
    const panels = page.locator('[role="tabpanel"]');

    await expect(tablist).toBeVisible();
    await expect(page.getByRole('tab')).toHaveCount(2);
    await expect(panels).toHaveCount(2);
    await expect(page.getByRole('tabpanel')).toHaveCount(1);
    const ownedTabIds = await page
        .getByRole('tab')
        .evaluateAll((tabs) => tabs.map(({ id }) => id).join(' '));
    await expect(tablist).toHaveAttribute('aria-owns', ownedTabIds);

    for (const tab of [dashboardTab, profileTab]) {
        const id = await tab.getAttribute('id');
        const controlledId = await tab.getAttribute('aria-controls');
        expect(id).toBeTruthy();
        expect(controlledId).toBeTruthy();
        await expect(page.locator(`#${controlledId}`)).toHaveAttribute(
            'aria-labelledby',
            id ?? ''
        );
    }

    await expect(profileTab).toHaveAttribute('aria-selected', 'true');
    await expect(profileTab).toHaveAttribute('tabindex', '0');
    await expect(dashboardTab).toHaveAttribute('tabindex', '-1');
    await expect(page.getByRole('tabpanel')).toHaveAttribute('tabindex', '0');

    // Axe borne les erreurs automatisables. La validation lecteur d’écran
    // VoiceOver/NVDA reste une preuve humaine distincte.
    await page.addScriptTag({ content: axe.source });
    const violations = await page.locator('main').evaluate(async (root) => {
        const runtime = (
            window as unknown as {
                axe: typeof axe;
            }
        ).axe;
        const result = await runtime.run(root, {
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
    expect(violations).toEqual([]);

    await profileTab.focus();
    await profileTab.press('Home');
    await expect(dashboardTab).toBeFocused();
    await expect(profileTab).toHaveAttribute('aria-selected', 'true');
    await expect(page).toHaveURL(/\/workspace\/profile$/);

    await dashboardTab.press('End');
    await expect(profileTab).toBeFocused();
    await profileTab.press('ArrowLeft');
    await expect(dashboardTab).toBeFocused();
    await expect(profileTab).toHaveAttribute('aria-selected', 'true');

    await dashboardTab.press('Enter');
    await expect(page).toHaveURL(/\/workspace\/dashboard$/);
    await expect(dashboardTab).toHaveAttribute('aria-selected', 'true');

    await dashboardTab.press('ArrowRight');
    await expect(profileTab).toBeFocused();
    await profileTab.press('Space');
    await expect(page).toHaveURL(/\/workspace\/profile$/);
    await expect(profileTab).toHaveAttribute('aria-selected', 'true');

    await profileTab.press('Delete');
    await expect(profileTab).toHaveCount(0);
    await expect(page).toHaveURL(/\/workspace\/dashboard$/);
    await expect(dashboardTab).toBeFocused();
});

test('conserve reflow, focus visible et commandes sous texte à 200 % et RTL', async ({
    page,
}) => {
    await serveProfile(page);
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto('/workspace/profile');
    await expect(page.getByText('Soumaila Kouda')).toBeVisible();

    const documentOverflow = async () =>
        page.evaluate(() => ({
            clientWidth: document.documentElement.clientWidth,
            scrollWidth: document.documentElement.scrollWidth,
        }));
    const narrow = await documentOverflow();
    expect(narrow.scrollWidth).toBeLessThanOrEqual(narrow.clientWidth + 1);

    await page.setViewportSize({ width: 640, height: 900 });
    await page.addStyleTag({
        content: 'html { font-size: 200% !important; }',
    });
    const enlarged = await documentOverflow();
    expect(enlarged.scrollWidth).toBeLessThanOrEqual(enlarged.clientWidth + 1);

    const clippedControls = await page
        .locator('button, input')
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
                        control.textContent
                )
        );
    expect(clippedControls).toEqual([]);

    const profileTab = page.getByRole('tab', { name: 'Profil' });
    await profileTab.focus();
    const focusStyle = await profileTab.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
            width: Number.parseFloat(style.outlineWidth),
            style: style.outlineStyle,
        };
    });
    expect(focusStyle.width).toBeGreaterThanOrEqual(2);
    expect(focusStyle.style).not.toBe('none');

    await page.locator('html').evaluate((element) => {
        element.dir = 'rtl';
    });
    await expect(profileTab).toHaveCSS('direction', 'rtl');
    await profileTab.press('ArrowRight');
    await expect(
        page.getByRole('tab', { name: 'Tableau de bord' })
    ).toBeFocused();
    const rtlGeometry = await page.locator('main').evaluate((element) => {
        const box = element.getBoundingClientRect();
        return {
            left: box.left,
            right: box.right,
            viewportWidth: document.documentElement.clientWidth,
        };
    });
    expect(rtlGeometry.left).toBeGreaterThanOrEqual(0);
    expect(rtlGeometry.right).toBeLessThanOrEqual(rtlGeometry.viewportWidth);
});
