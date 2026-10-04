import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { chromium } from '@playwright/test';

const root = dirname(fileURLToPath(import.meta.url));
const source = resolve(root, 'mockup.html');
const cases = [
    {
        name: 'expanded-filter-panel.proposed.png',
        layout: 'expanded',
        mode: 'filters',
        viewport: { width: 1440, height: 1024 },
    },
    {
        name: 'expanded-row-actions.proposed.png',
        layout: 'expanded',
        mode: 'actions-closed',
        viewport: { width: 1440, height: 1024 },
    },
    {
        name: 'expanded-row-actions-with-filters.proposed.png',
        layout: 'expanded',
        mode: 'actions-open',
        viewport: { width: 1440, height: 1024 },
    },
    {
        name: 'medium-constrained-filter-panel.proposed.png',
        layout: 'medium',
        mode: 'filters',
        viewport: { width: 960, height: 900 },
    },
    {
        name: 'medium-constrained-row-actions.proposed.png',
        layout: 'medium',
        mode: 'actions-closed',
        viewport: { width: 960, height: 900 },
    },
    {
        name: 'medium-constrained-row-actions-with-filters.proposed.png',
        layout: 'medium',
        mode: 'actions-open',
        viewport: { width: 960, height: 900 },
    },
];

if (process.env.CMZ_WRITE_LAYOUT_EXAMPLES !== '1') {
    throw new Error(
        'Refus d’écrire les exemples sans CMZ_WRITE_LAYOUT_EXAMPLES=1.'
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

console.log(
    `Rendered ${cases.length} deterministic layout examples in ${root}`
);
