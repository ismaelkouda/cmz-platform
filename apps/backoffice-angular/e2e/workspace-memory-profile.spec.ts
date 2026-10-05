import {
    expect,
    test,
    type CDPSession,
    type Page,
    type TestInfo,
} from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { fillLogin, gotoLogin, submitLogin } from './login.page';

const TYPE_LIST_PATH = '/equipments/types/list';
const TYPE_FORM_PATH = '/equipments/types/form?ref=create';
const TYPE_FORM_TITLE =
    /Formulaire de type d'infrastructure|ADMINISTRATIVE_INFRASTRUCTURE\.INFRASTRUCTURE_TYPE\.TABS\.FORM\.LABEL/;
const WARMUP_CYCLES = 50;
const PROFILE_CYCLES = 100;
const CHECKPOINT_INTERVAL = 25;
const MAX_CYCLE_HEAP_GROWTH_BYTES = 1024 * 1024;
const MAX_LAST_CHECKPOINT_GROWTH_BYTES = 384 * 1024;
const MAX_EIGHT_VIEW_HEAP_GROWTH_BYTES = 8 * 1024 * 1024;
const REPRESENTATIVE_VIEW_PATHS = [
    '/monitoring/processing-status',
    '/reporting/reports',
    '/interactive-map/interactive',
    '/processing/queues',
    '/processing/tasks',
    '/processing/all',
    TYPE_LIST_PATH,
] as const;

interface MemorySample {
    readonly cycle: number;
    readonly usedHeapBytes: number;
    readonly totalHeapBytes: number;
    readonly documents: number;
    readonly nodes: number;
    readonly jsEventListeners: number;
}

async function login(page: Page): Promise<void> {
    await gotoLogin(page);
    await fillLogin(page);
    await submitLogin(page);
    await expect(page).toHaveURL(/\/dashboard\/?$/, { timeout: 30_000 });
}

async function waitForDashboardReady(page: Page): Promise<void> {
    await expect(
        page.getByRole('link', {
            name: /En cours de traitement|DASHBOARD\.SECTIONS\.TASK_STATUS\.IN_PROGRESS\.LABEL/,
        })
    ).toBeVisible();
}

function workspaceFormItem(page: Page) {
    return page
        .locator('.workspace__item')
        .filter({ hasText: TYPE_FORM_TITLE });
}

async function runCleanFormCycle(page: Page): Promise<void> {
    await page.getByRole('button', { name: /Créer|COMMON\.CREATE/ }).click();
    await expect(page).toHaveURL(
        new RegExp(`${TYPE_FORM_PATH.replace('?', '\\?')}$`)
    );

    const formItem = workspaceFormItem(page);
    await expect(formItem).toHaveCount(1);
    await formItem.locator('.workspace__close').click();

    await expect(page).toHaveURL(new RegExp(`${TYPE_LIST_PATH}/?$`));
    await expect(formItem).toHaveCount(0);
}

async function dispatchRouterNavigation(
    page: Page,
    path: string
): Promise<void> {
    await page.evaluate((nextPath) => {
        window.history.pushState({}, '', nextPath);
        window.dispatchEvent(
            new PopStateEvent('popstate', { state: window.history.state })
        );
    }, path);
}

async function navigateThroughRouterHistory(
    page: Page,
    path: string
): Promise<void> {
    await dispatchRouterNavigation(page, path);
    await expect(page).toHaveURL(new RegExp(`${path}/?$`));
}

async function closeAllWorkspaceViews(page: Page): Promise<void> {
    const commands = page.locator('.workspace__commands');
    if ((await commands.getAttribute('open')) === null) {
        await page
            .getByLabel(/Actions des vues ouvertes|WORKSPACE\.ACTIONS/)
            .click();
    }
    await commands
        .getByRole('button', {
            name: /Tout fermer sauf Tableau de bord|WORKSPACE\.CLOSE_ALL_EXCEPT_DASHBOARD/,
        })
        .click();
    await expect(page).toHaveURL(/\/dashboard\/?$/);
    await expect(page.locator('.workspace__item')).toHaveCount(1);
    await expect(
        page.getByRole('toolbar', {
            name: /Défilement des vues|WORKSPACE\.SCROLL_LABEL/,
        })
    ).toHaveCount(0);
}

async function sampleMemory(
    page: Page,
    cdp: CDPSession,
    cycle: number
): Promise<MemorySample> {
    await page.evaluate(
        () =>
            new Promise<void>((resolve) =>
                requestAnimationFrame(() =>
                    requestAnimationFrame(() => resolve())
                )
            )
    );
    // Deux passages rendent les objets devenus inaccessibles observables avant
    // la mesure, sans appeler Memory.prepareForLeakDetection qui perturbe les
    // workers et caches de l'application inspectée.
    await cdp.send('HeapProfiler.collectGarbage');
    await cdp.send('HeapProfiler.collectGarbage');

    const heap = await cdp.send('Runtime.getHeapUsage');
    const dom = await cdp.send('Memory.getDOMCounters');
    return {
        cycle,
        usedHeapBytes: heap.usedSize,
        totalHeapBytes: heap.totalSize,
        documents: dom.documents,
        nodes: dom.nodes,
        jsEventListeners: dom.jsEventListeners,
    };
}

async function attachProfile(
    testInfo: TestInfo,
    name: string,
    profile: object,
    samples: readonly MemorySample[]
): Promise<void> {
    const path = testInfo.outputPath(name);
    await writeFile(
        path,
        JSON.stringify(
            { browser: 'chromium-cdp', ...profile, samples },
            null,
            2
        ),
        'utf8'
    );
    await testInfo.attach(name, {
        path,
        contentType: 'application/json',
    });
}

test.describe('profil mémoire du workspace vivant', () => {
    test('mesure 100 cycles Router réels après échauffement', async ({
        page,
    }, testInfo) => {
        await login(page);
        await page.goto(TYPE_LIST_PATH);
        await expect(page).toHaveURL(new RegExp(`${TYPE_LIST_PATH}/?$`));
        await expect(
            page.getByRole('heading', {
                name: /Types d'infrastructure|ADMINISTRATIVE_INFRASTRUCTURE\.INFRASTRUCTURE_TYPE\.TITLE/,
            })
        ).toBeVisible();

        const cdp = await page.context().newCDPSession(page);
        await cdp.send('HeapProfiler.enable');

        try {
            for (let cycle = 0; cycle < WARMUP_CYCLES; cycle += 1) {
                await runCleanFormCycle(page);
            }

            const samples: MemorySample[] = [await sampleMemory(page, cdp, 0)];
            for (let cycle = 1; cycle <= PROFILE_CYCLES; cycle += 1) {
                await runCleanFormCycle(page);
                if (cycle % CHECKPOINT_INTERVAL === 0) {
                    samples.push(await sampleMemory(page, cdp, cycle));
                }
            }

            await attachProfile(
                testInfo,
                'workspace-memory-profile.json',
                {
                    warmupCycles: WARMUP_CYCLES,
                    measuredCycles: PROFILE_CYCLES,
                    thresholds: {
                        maxHeapGrowthBytes: MAX_CYCLE_HEAP_GROWTH_BYTES,
                        maxLastCheckpointGrowthBytes:
                            MAX_LAST_CHECKPOINT_GROWTH_BYTES,
                    },
                },
                samples
            );
            console.info(`WORKSPACE_MEMORY_PROFILE=${JSON.stringify(samples)}`);
            expect(samples).toHaveLength(5);
            await expect(workspaceFormItem(page)).toHaveCount(0);
            await expect(page.locator('.workspace__item')).toHaveCount(1);
            const baseline = samples[0];
            const final = samples.at(-1) as MemorySample;
            const previous = samples.at(-2) as MemorySample;
            for (const sample of samples) {
                expect(sample.documents).toBe(baseline.documents);
                expect(sample.nodes).toBe(baseline.nodes);
                expect(sample.jsEventListeners).toBe(baseline.jsEventListeners);
            }
            expect(
                final.usedHeapBytes - baseline.usedHeapBytes
            ).toBeLessThanOrEqual(MAX_CYCLE_HEAP_GROWTH_BYTES);
            expect(
                final.usedHeapBytes - previous.usedHeapBytes
            ).toBeLessThanOrEqual(MAX_LAST_CHECKPOINT_GROWTH_BYTES);
        } finally {
            await cdp.detach();
        }
    });

    test('profile huit vues représentatives et refuse la neuvième', async ({
        page,
    }, testInfo) => {
        await login(page);
        await waitForDashboardReady(page);
        const cdp = await page.context().newCDPSession(page);
        await cdp.send('HeapProfiler.enable');

        try {
            const samples: MemorySample[] = [await sampleMemory(page, cdp, 1)];
            for (const [index, path] of REPRESENTATIVE_VIEW_PATHS.entries()) {
                await navigateThroughRouterHistory(page, path);
                await expect(page.locator('.workspace__item')).toHaveCount(
                    index + 2
                );
                samples.push(await sampleMemory(page, cdp, index + 2));
            }
            const firstPeak = samples.at(-1) as MemorySample;

            const activeUrl = page.url();
            await dispatchRouterNavigation(page, '/monitoring/services-states');
            await expect(page).toHaveURL(activeUrl);
            await expect(page.locator('.workspace__item')).toHaveCount(8);
            const capacityToast = page.getByRole('status').filter({
                hasText: /limite de vues ouvertes|WORKSPACE\.CAPACITY_REACHED/,
            });
            await expect(capacityToast).toBeVisible();
            await capacityToast.getByRole('button', { name: 'Fermer' }).click();
            await expect(capacityToast).toHaveCount(0);

            await closeAllWorkspaceViews(page);
            const firstAfterClose = await sampleMemory(page, cdp, 1);
            samples.push(firstAfterClose);

            // Trois passes supplémentaires séparent les coûts one-shot
            // (chunks lazy, JIT) et le remplissage borné des métriques de soft
            // navigation Chromium d'une rétention qui continuerait ensuite.
            const warmedCloseSamples = [firstAfterClose];
            for (let pass = 2; pass <= 4; pass += 1) {
                for (const [
                    index,
                    path,
                ] of REPRESENTATIVE_VIEW_PATHS.entries()) {
                    await navigateThroughRouterHistory(page, path);
                    await expect(page.locator('.workspace__item')).toHaveCount(
                        index + 2
                    );
                }
                const repeatedPeak = await sampleMemory(page, cdp, 8);
                samples.push(repeatedPeak);
                await closeAllWorkspaceViews(page);
                const repeatedAfterClose = await sampleMemory(page, cdp, 1);
                const previousAfterClose = warmedCloseSamples.at(-1);
                if (!previousAfterClose) {
                    throw new Error(
                        'Le profil doit conserver la fermeture précédente.'
                    );
                }
                samples.push(repeatedAfterClose);
                warmedCloseSamples.push(repeatedAfterClose);

                expect(repeatedAfterClose.usedHeapBytes).toBeLessThan(
                    repeatedPeak.usedHeapBytes
                );
                expect(
                    repeatedAfterClose.usedHeapBytes -
                        previousAfterClose.usedHeapBytes
                ).toBeLessThanOrEqual(MAX_CYCLE_HEAP_GROWTH_BYTES);
            }

            await attachProfile(
                testInfo,
                'workspace-capacity-profile.json',
                {
                    paths: ['/dashboard', ...REPRESENTATIVE_VIEW_PATHS],
                    thresholds: {
                        maxEightViewHeapGrowthBytes:
                            MAX_EIGHT_VIEW_HEAP_GROWTH_BYTES,
                    },
                },
                samples
            );
            console.info(
                `WORKSPACE_CAPACITY_PROFILE=${JSON.stringify(samples)}`
            );
            const baseline = samples[0];
            expect(
                firstPeak.usedHeapBytes - baseline.usedHeapBytes
            ).toBeLessThanOrEqual(MAX_EIGHT_VIEW_HEAP_GROWTH_BYTES);
            expect(firstAfterClose.usedHeapBytes).toBeLessThan(
                firstPeak.usedHeapBytes
            );
            const [penultimateClose, finalClose] = warmedCloseSamples.slice(-2);
            if (!penultimateClose || !finalClose) {
                throw new Error(
                    'Le profil doit produire deux fermetures échauffées.'
                );
            }
            expect(finalClose.documents).toBe(penultimateClose.documents);
            expect(finalClose.nodes).toBe(penultimateClose.nodes);
            expect(finalClose.jsEventListeners).toBe(
                penultimateClose.jsEventListeners
            );
        } finally {
            await cdp.detach();
        }
    });
});
