import {
    expect,
    test,
    type CDPSession,
    type Page,
    type TestInfo,
} from '@playwright/test';
import { writeFile } from 'node:fs/promises';

const PROFILE_ENDPOINT = '/api/workspace/profile';
const WARMUP_CYCLES = 50;
const PROFILE_CYCLES = 100;
const CHECKPOINT_INTERVAL = 25;

// Budgets calibrés sur cinq campagnes de production indépendantes :
// 324–341 KiB sur 100 cycles, 99–102 KiB sur le dernier quart et
// 1,35 MiB au pic maximal à deux vues. Les marges absorbent la variance CI
// sans rendre invisibles une rétention ou un doublement du coût représentatif.
const MAX_CYCLE_HEAP_GROWTH_BYTES = 768 * 1024;
const MAX_LAST_CHECKPOINT_GROWTH_BYTES = 256 * 1024;
const MAX_TWO_VIEW_HEAP_GROWTH_BYTES = 2 * 1024 * 1024;
const MAX_CLOSE_PASS_GROWTH_BYTES = 256 * 1024;

interface MemorySample {
    readonly phase: 'baseline' | 'cycle' | 'open' | 'closed';
    readonly sequence: number;
    readonly usedHeapBytes: number;
    readonly totalHeapBytes: number;
    readonly documents: number;
    readonly nodes: number;
    readonly jsEventListeners: number;
}

async function fulfillProfile(page: Page): Promise<() => number> {
    let reads = 0;
    await page.route(`**${PROFILE_ENDPOINT}`, async (route) => {
        reads += 1;
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                name: 'Soumaila Kouda',
                role: 'Administrateur',
            }),
        });
    });
    return () => reads;
}

async function runCleanProfileCycle(page: Page): Promise<void> {
    await page.getByRole('button', { name: 'Ouvrir le profil' }).click();
    await expect(page).toHaveURL(/\/workspace\/profile$/);
    await expect(page.getByText('Soumaila Kouda')).toBeVisible();
    await page.getByRole('button', { name: 'Fermer Profil' }).click();
    await expect(page).toHaveURL(/\/workspace\/dashboard$/);
    await expect(page.getByRole('tab', { name: 'Profil' })).toHaveCount(0);
    await expect(page.locator('[data-instance-id]')).toHaveCount(0);
}

async function sampleMemory(
    page: Page,
    cdp: CDPSession,
    phase: MemorySample['phase'],
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
        phase,
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

test.describe('profil mémoire du workspace React vivant', () => {
    test('mesure 100 cycles réels de création et destruction après échauffement', async ({
        page,
    }, testInfo) => {
        const profileReads = await fulfillProfile(page);
        await page.goto('/workspace/dashboard');
        await expect(
            page.getByRole('heading', { name: 'Tableau de bord' })
        ).toBeVisible();

        const cdp = await page.context().newCDPSession(page);
        await cdp.send('HeapProfiler.enable');
        try {
            for (let cycle = 0; cycle < WARMUP_CYCLES; cycle += 1) {
                await runCleanProfileCycle(page);
            }

            const samples: MemorySample[] = [
                await sampleMemory(page, cdp, 'baseline', 0),
            ];
            for (let cycle = 1; cycle <= PROFILE_CYCLES; cycle += 1) {
                await runCleanProfileCycle(page);
                if (cycle % CHECKPOINT_INTERVAL === 0) {
                    samples.push(await sampleMemory(page, cdp, 'cycle', cycle));
                }
            }

            await attachProfile(
                testInfo,
                'workspace-react-memory-profile.json',
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
            console.info(
                `REACT_WORKSPACE_MEMORY_PROFILE=${JSON.stringify(samples)}`
            );

            expect(samples).toHaveLength(5);
            expect(profileReads()).toBe(1);
            await expect(page.getByRole('tab')).toHaveCount(1);
            await expect(page.locator('[data-instance-id]')).toHaveCount(0);
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

    test('profile la capacité fermée du catalogue sur quatre passes 1 → 2 → 1', async ({
        page,
    }, testInfo) => {
        const profileReads = await fulfillProfile(page);
        await page.goto('/workspace/dashboard');
        const cdp = await page.context().newCDPSession(page);
        await cdp.send('HeapProfiler.enable');

        try {
            const samples: MemorySample[] = [
                await sampleMemory(page, cdp, 'baseline', 1),
            ];
            const closedSamples: MemorySample[] = [];
            for (let pass = 1; pass <= 4; pass += 1) {
                await page
                    .getByRole('button', { name: 'Ouvrir le profil' })
                    .click();
                await expect(page.getByText('Soumaila Kouda')).toBeVisible();
                await expect(page.getByRole('tab')).toHaveCount(2);
                samples.push(await sampleMemory(page, cdp, 'open', pass));

                await page
                    .getByRole('button', { name: 'Fermer Profil' })
                    .click();
                await expect(page.getByRole('tab')).toHaveCount(1);
                await expect(page.locator('[data-instance-id]')).toHaveCount(0);
                const closed = await sampleMemory(page, cdp, 'closed', pass);
                samples.push(closed);
                closedSamples.push(closed);
            }

            await attachProfile(
                testInfo,
                'workspace-react-capacity-profile.json',
                {
                    paths: ['/workspace/dashboard', '/workspace/profile'],
                    configuredCapacity: 2,
                    passes: 4,
                    thresholds: {
                        maxTwoViewHeapGrowthBytes:
                            MAX_TWO_VIEW_HEAP_GROWTH_BYTES,
                        maxClosePassGrowthBytes: MAX_CLOSE_PASS_GROWTH_BYTES,
                    },
                },
                samples
            );
            console.info(
                `REACT_WORKSPACE_CAPACITY_PROFILE=${JSON.stringify(samples)}`
            );

            expect(profileReads()).toBe(1);
            const baseline = samples[0];
            const peakHeapBytes = Math.max(
                ...samples
                    .filter((sample) => sample.phase === 'open')
                    .map((sample) => sample.usedHeapBytes)
            );
            expect(peakHeapBytes - baseline.usedHeapBytes).toBeLessThanOrEqual(
                MAX_TWO_VIEW_HEAP_GROWTH_BYTES
            );
            const [penultimateClose, finalClose] = closedSamples.slice(-2);
            if (!penultimateClose || !finalClose) {
                throw new Error('Le profil attend deux fermetures échauffées.');
            }
            expect(finalClose.documents).toBe(penultimateClose.documents);
            expect(finalClose.nodes).toBe(penultimateClose.nodes);
            expect(finalClose.jsEventListeners).toBe(
                penultimateClose.jsEventListeners
            );
            expect(
                finalClose.usedHeapBytes - penultimateClose.usedHeapBytes
            ).toBeLessThanOrEqual(MAX_CLOSE_PASS_GROWTH_BYTES);
        } finally {
            await cdp.detach();
        }
    });
});
