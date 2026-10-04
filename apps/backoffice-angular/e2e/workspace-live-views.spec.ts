import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { fillLogin, gotoLogin, submitLogin } from './login.page';

const DASHBOARD_PATH = '/api/report/statistics';
const TYPE_LIST_PATH = '/equipments/types/list';
const TYPE_FORM_TITLE = "Formulaire de type d'infrastructure";
const TYPE_FORM_TITLE_KEY =
    'ADMINISTRATIVE_INFRASTRUCTURE.INFRASTRUCTURE_TYPE.TABS.FORM.LABEL';

async function login(page: Page): Promise<void> {
    await gotoLogin(page);
    await fillLogin(page);
    await submitLogin(page);
    await expect(page).toHaveURL(/\/dashboard\/?$/, { timeout: 30_000 });
}

async function attachScreenshot(
    page: Page,
    testInfo: TestInfo,
    name: string
): Promise<void> {
    const path = testInfo.outputPath(`${name}.png`);
    await page.screenshot({ path, animations: 'disabled' });
    await testInfo.attach(name, {
        path,
        contentType: 'image/png',
    });
}

function workspaceTab(page: Page, title: RegExp) {
    return page
        .locator('.workspace__item')
        .filter({ hasText: title })
        .locator('[role="tab"]');
}

test.describe('workspace à vues vivantes — session authentifiée', () => {
    test('préserve une instance, le clavier et le comportement adaptatif', async ({
        page,
    }, testInfo) => {
        let dashboardReads = 0;
        let runtimeTranslationRequests = 0;
        page.on('request', (request) => {
            if (new URL(request.url()).pathname === '/i18n/fr.json') {
                runtimeTranslationRequests += 1;
            }
        });
        page.on('request', (request) => {
            if (
                request.method() === 'GET' &&
                new URL(request.url()).pathname === DASHBOARD_PATH
            ) {
                dashboardReads += 1;
            }
        });

        await login(page);
        expect(runtimeTranslationRequests).toBe(0);
        await expect(
            page.getByRole('tab', { name: 'Tableau de bord', exact: true })
        ).toBeVisible();
        await expect.poll(() => dashboardReads).toBe(1);

        const sevenDays = page.getByRole('button', {
            name: /7 derniers jours|DASHBOARD\.FILTER\.PERIOD\.SEVEN_DAYS/,
        });
        await sevenDays.click();
        await expect(sevenDays).toHaveAttribute('aria-pressed', 'true');
        await expect.poll(() => dashboardReads).toBe(2);

        await page
            .getByRole('link', {
                name: /En cours de traitement|DASHBOARD\.SECTIONS\.TASK_STATUS\.IN_PROGRESS\.LABEL/,
            })
            .click();
        await expect(page).toHaveURL(/\/processing\/queues\/?$/);

        const dashboardTab = workspaceTab(
            page,
            /Tableau de bord|WORKSPACE\.DASHBOARD/
        );
        const processingTab = workspaceTab(
            page,
            /Bac à pioche|PROCESSING\.QUEUES\.BREADCRUMB\.LABEL/
        );
        await expect(dashboardTab).toHaveAttribute('aria-selected', 'false');
        await expect(processingTab).toHaveAttribute('aria-selected', 'true');

        await dashboardTab.click();
        await expect(page).toHaveURL(/\/dashboard\/?$/);
        await expect(sevenDays).toHaveAttribute('aria-pressed', 'true');
        await expect.poll(() => dashboardReads).toBe(2);
        await attachScreenshot(page, testInfo, 'workspace-expanded');

        await page.setViewportSize({ width: 390, height: 844 });
        await expect(page.locator('.workspace')).toBeHidden();
        await expect(sevenDays).toHaveAttribute('aria-pressed', 'true');
        await attachScreenshot(page, testInfo, 'workspace-compact');

        await page.setViewportSize({ width: 960, height: 900 });
        await expect(page.locator('.workspace')).toBeVisible();
        await expect(sevenDays).toHaveAttribute('aria-pressed', 'true');
        await expect.poll(() => dashboardReads).toBe(2);

        const constrainedWorkspace = await page.addStyleTag({
            content: '.workspace { width: 15rem !important; }',
        });
        const scrollNext = page.getByRole('button', {
            name: /Voir les vues suivantes|WORKSPACE\.SCROLL_NEXT/,
        });
        await expect(scrollNext).toBeVisible();
        await scrollNext.click();
        await expect(
            page.getByRole('button', {
                name: /Voir les vues précédentes|WORKSPACE\.SCROLL_PREVIOUS/,
            })
        ).toBeVisible();
        await constrainedWorkspace.evaluate((element) => element.remove());

        await dashboardTab.focus();
        await dashboardTab.press('ArrowRight');
        await expect(processingTab).toBeFocused();
        await expect(processingTab).toHaveAttribute('aria-selected', 'false');
        await processingTab.press('Enter');
        await expect(page).toHaveURL(/\/processing\/queues\/?$/);
        await processingTab.press('Delete');

        await expect(processingTab).toHaveCount(0);
        await expect(page).toHaveURL(/\/dashboard\/?$/);
        await expect(dashboardTab).toBeFocused();
        await expect(sevenDays).toHaveAttribute('aria-pressed', 'true');
        await expect.poll(() => dashboardReads).toBe(2);
    });

    test('conserve un formulaire modifié et confirme sa destruction', async ({
        page,
    }, testInfo) => {
        let createRequests = 0;
        page.on('request', (request) => {
            if (
                request.method() === 'POST' &&
                new URL(request.url()).pathname.endsWith(
                    '/infrastructures/equipment-types/store'
                )
            ) {
                createRequests += 1;
            }
        });

        await login(page);
        await page.goto(TYPE_LIST_PATH);
        await expect(page).toHaveURL(new RegExp(`${TYPE_LIST_PATH}/?$`));
        await expect(
            page.getByRole('heading', {
                name: /Types d'infrastructure|ADMINISTRATIVE_INFRASTRUCTURE\.INFRASTRUCTURE_TYPE\.TITLE/,
            })
        ).toBeVisible();

        await page
            .getByRole('button', { name: /Créer|COMMON\.CREATE/ })
            .click();
        await expect(page).toHaveURL(/\/equipments\/types\/form\?ref=create$/);
        await page.locator('#name').fill('Type conservé');
        await page
            .locator('#description')
            .fill('Valeurs conservées dans la même instance');

        const listTab = workspaceTab(
            page,
            /Types d'infrastructure|ADMINISTRATIVE_INFRASTRUCTURE\.INFRASTRUCTURE_TYPE\.TABS\.LIST\.LABEL/
        );
        const formTab = workspaceTab(
            page,
            new RegExp(`${TYPE_FORM_TITLE}|${TYPE_FORM_TITLE_KEY}`)
        );
        await expect(
            formTab.getByLabel(
                /Modifications non enregistrées|WORKSPACE\.DIRTY/
            )
        ).toBeVisible();

        await listTab.click();
        await formTab.click();
        await expect(page).toHaveURL(/\/equipments\/types\/form\?ref=create$/);
        await expect(page.locator('#name')).toHaveValue('Type conservé');
        await expect(page.locator('#description')).toHaveValue(
            'Valeurs conservées dans la même instance'
        );

        await listTab.click();
        const formItem = page.locator('.workspace__item').filter({
            hasText: new RegExp(`${TYPE_FORM_TITLE}|${TYPE_FORM_TITLE_KEY}`),
        });
        await formItem.locator('.workspace__close').click();
        const dialog = page.getByRole('dialog', {
            name: /Modifications non enregistrées|WORKSPACE\.DISCARD\.TITLE/,
        });
        await expect(dialog).toBeVisible();
        await attachScreenshot(page, testInfo, 'workspace-dirty-confirmation');
        await dialog
            .getByRole('button', { name: /Annuler|COMMON\.CANCEL/ })
            .click();
        await expect(formTab).toBeVisible();

        await formTab.click();
        await expect(page.locator('#name')).toHaveValue('Type conservé');
        await listTab.click();
        await formItem.locator('.workspace__close').click();
        await dialog
            .getByRole('button', {
                name: /Fermer|WORKSPACE\.DISCARD\.CONFIRM/,
            })
            .click();

        await expect(formTab).toHaveCount(0);
        await expect(listTab).toBeFocused();
        expect(createRequests).toBe(0);
    });
});
