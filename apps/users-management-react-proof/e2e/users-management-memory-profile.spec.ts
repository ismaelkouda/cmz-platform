import {
    expect,
    test,
    type CDPSession,
    type Page,
    type TestInfo,
} from '@playwright/test';
import { writeFile } from 'node:fs/promises';

import {
    installBrowserHost,
    openReadyPage,
    serveDeterministicApi,
} from './users-management.support';

const WARMUP_CYCLES = 30;
const MEASURED_CYCLES = 100;
const CHECKPOINT_INTERVAL = 25;
// Trois campagnes locales indépendantes donnent 225–227 Kio sur 100 cycles et
// 35–36 Kio sur le dernier quart, avec DOM/listeners strictement constants.
// Les marges restent >2x et >3x sans rendre invisible une vraie rétention.
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

async function runCreateDialogCycle(page: Page): Promise<void> {
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

test('borne la création et destruction répétée du dialogue React', async ({
    page,
}, testInfo) => {
    await installBrowserHost(page);
    const api = await serveDeterministicApi(page);
    await openReadyPage(page);

    const cdp = await page.context().newCDPSession(page);
    await cdp.send('HeapProfiler.enable');
    try {
        for (let cycle = 0; cycle < WARMUP_CYCLES; cycle += 1) {
            await runCreateDialogCycle(page);
        }

        const samples: MemorySample[] = [await sampleMemory(page, cdp, 0)];
        for (let cycle = 1; cycle <= MEASURED_CYCLES; cycle += 1) {
            await runCreateDialogCycle(page);
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
