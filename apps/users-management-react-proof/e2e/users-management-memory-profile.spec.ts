import {
    expect,
    test,
    type CDPSession,
    type Page,
    type TestInfo,
} from '@playwright/test';
import { writeFile } from 'node:fs/promises';

import {
    fulfillUsersPage,
    installBrowserHost,
    openReadyPage,
    serveDeterministicApi,
} from './users-management.support';

const WARMUP_CYCLES = 30;
const MEASURED_CYCLES = 100;
const CHECKPOINT_INTERVAL = 25;
// Trois campagnes locales indépendantes création + filtres Compact donnent
// 366–367 Kio sur 100 cycles et 64–75 Kio sur le dernier quart, avec
// 1 document / 227 nœuds / 168 listeners strictement constants. Les seuils
// conservent une marge utile sans rendre invisible une vraie rétention.
const MAX_TOTAL_HEAP_GROWTH_BYTES = 512 * 1024;
const MAX_LAST_CHECKPOINT_GROWTH_BYTES = 128 * 1024;

interface MemorySample {
    readonly sequence: number;
    readonly usedHeapBytes: number;
    readonly totalHeapBytes: number;
    readonly documents: number;
    readonly nodes: number;
    readonly jsEventListeners: number;
}

async function runDialogCycle(page: Page): Promise<void> {
    await page.getByRole('button', { name: 'Créer un utilisateur' }).click();
    const dialog = page.getByRole('dialog', {
        name: 'Créer un utilisateur',
    });
    await expect(dialog).toBeVisible();
    await dialog
        .getByRole('button', {
            name: 'Fermer le formulaire de création',
        })
        .click();
    await expect(dialog).toHaveCount(0);

    await page.getByRole('button', { name: 'Filtres', exact: true }).click();
    const filters = page.locator('#users-filter-panel');
    await expect(filters).toBeVisible();
    await expect(filters).toHaveAccessibleName('Filtres');
    await filters.getByRole('button', { name: /^Statut\b/ }).click();
    await expect(filters).toHaveAccessibleName('Statut');
    await filters.getByRole('button', { name: 'Retour' }).click();
    await filters.getByRole('button', { name: 'Fermer les filtres' }).click();
    await expect(filters).toHaveCount(0);
}

async function sampleMemory(
    page: Page,
    cdp: CDPSession,
    sequence: number
): Promise<MemorySample> {
    await page.evaluate(
        () =>
            new Promise<void>((resolve) =>
                requestAnimationFrame(() =>
                    requestAnimationFrame(() => resolve())
                )
            )
    );
    await cdp.send('HeapProfiler.collectGarbage');
    await cdp.send('HeapProfiler.collectGarbage');
    const heap = await cdp.send('Runtime.getHeapUsage');
    const dom = await cdp.send('Memory.getDOMCounters');
    return {
        sequence,
        usedHeapBytes: heap.usedSize,
        totalHeapBytes: heap.totalSize,
        documents: dom.documents,
        nodes: dom.nodes,
        jsEventListeners: dom.jsEventListeners,
    };
}

async function attachProfile(
    testInfo: TestInfo,
    samples: readonly MemorySample[]
): Promise<void> {
    const path = testInfo.outputPath(
        'users-management-react-memory-profile.json'
    );
    await writeFile(
        path,
        JSON.stringify(
            {
                schema_version: '1.0.0',
                browser: 'chromium-cdp',
                warmupCycles: WARMUP_CYCLES,
                measuredCycles: MEASURED_CYCLES,
                checkpointInterval: CHECKPOINT_INTERVAL,
                thresholds: {
                    maxTotalHeapGrowthBytes: MAX_TOTAL_HEAP_GROWTH_BYTES,
                    maxLastCheckpointGrowthBytes:
                        MAX_LAST_CHECKPOINT_GROWTH_BYTES,
                },
                samples,
            },
            null,
            2
        ),
        'utf8'
    );
    await testInfo.attach('users-management-react-memory-profile.json', {
        path,
        contentType: 'application/json',
    });
}

test('borne les dialogues de création et de filtres Compact répétés', async ({
    page,
}, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await installBrowserHost(page);
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

    const cdp = await page.context().newCDPSession(page);
    await cdp.send('HeapProfiler.enable');
    try {
        for (let cycle = 0; cycle < WARMUP_CYCLES; cycle += 1) {
            await runDialogCycle(page);
        }

        const samples: MemorySample[] = [await sampleMemory(page, cdp, 0)];
        for (let cycle = 1; cycle <= MEASURED_CYCLES; cycle += 1) {
            await runDialogCycle(page);
            if (cycle % CHECKPOINT_INTERVAL === 0) {
                samples.push(await sampleMemory(page, cdp, cycle));
            }
        }
        await attachProfile(testInfo, samples);
        console.info(`REACT_C5_MEMORY_PROFILE=${JSON.stringify(samples)}`);

        expect(samples).toHaveLength(5);
        expect(api.userReads()).toBe(1);
        expect(api.profileReads()).toBe(1);
        expect(api.writes()).toBe(0);
        await expect(page.getByRole('dialog')).toHaveCount(0);
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
        ).toBeLessThanOrEqual(MAX_TOTAL_HEAP_GROWTH_BYTES);
        expect(
            final.usedHeapBytes - previous.usedHeapBytes
        ).toBeLessThanOrEqual(MAX_LAST_CHECKPOINT_GROWTH_BYTES);
    } finally {
        await cdp.detach();
    }
});
