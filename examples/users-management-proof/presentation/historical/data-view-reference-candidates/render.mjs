import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { chromium } from '@playwright/test';

const root = dirname(fileURLToPath(import.meta.url));
const source = resolve(root, 'mockup.proposed.html');
const cases = [
    {
        name: 'expanded-filter-workspace.proposed.png',
        layout: 'expanded',
        mode: 'filters',
        viewport: { width: 1484, height: 1060 },
    },
    {
        name: 'expanded-row-actions.proposed.png',
        layout: 'expanded',
        mode: 'actions-closed',
        viewport: { width: 1484, height: 1060 },
    },
    {
        name: 'expanded-row-actions-with-filters.proposed.png',
        layout: 'expanded',
        mode: 'actions-open',
        viewport: { width: 1484, height: 1060 },
    },
    {
        name: 'medium-filter-workspace.proposed.png',
        layout: 'medium',
        mode: 'filters',
        viewport: { width: 1448, height: 1086 },
    },
    {
        name: 'medium-row-actions.proposed.png',
        layout: 'medium',
        mode: 'actions-closed',
        viewport: { width: 1448, height: 1086 },
    },
    {
        name: 'medium-row-actions-with-filters.proposed.png',
        layout: 'medium',
        mode: 'actions-open',
        viewport: { width: 1448, height: 1086 },
    },
];

if (process.env.CMZ_WRITE_PRESENTATION_REFERENCES !== '1') {
    throw new Error(
        'Refus d’écrire les références sans CMZ_WRITE_PRESENTATION_REFERENCES=1.'
    );
}

await mkdir(root, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
    for (const renderCase of cases) {
        const context = await browser.newContext({
            viewport: renderCase.viewport,
            deviceScaleFactor: 1,
            colorScheme: 'light',
            reducedMotion: 'reduce',
            locale: 'fr-FR',
        });
        const page = await context.newPage();
        const target = new URL(pathToFileURL(source));
        target.searchParams.set('layout', renderCase.layout);
        target.searchParams.set('mode', renderCase.mode);
        await page.goto(target.href, { waitUntil: 'load' });
        await page.waitForFunction(
            () => document.documentElement.dataset.ready === 'true'
        );
        await page.screenshot({
            path: resolve(root, renderCase.name),
            fullPage: false,
            animations: 'disabled',
            caret: 'hide',
            scale: 'css',
        });
        await context.close();
    }
} finally {
    await browser.close();
}

console.log(`Rendered ${cases.length} deterministic references in ${root}`);
