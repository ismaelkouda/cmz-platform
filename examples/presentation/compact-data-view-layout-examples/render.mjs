import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { chromium } from '@playwright/test';

const root = dirname(fileURLToPath(import.meta.url));
const source = resolve(root, 'mockup.html');
const cases = [
    { name: 'compact-list.proposed.png', mode: 'list' },
    {
        name: 'compact-search-active.proposed.png',
        mode: 'search-active',
    },
    {
        name: 'compact-list-with-card-actions.proposed.png',
        mode: 'actions',
    },
    {
        name: 'compact-filter-summary.proposed.png',
        mode: 'filter-summary',
    },
    {
        name: 'compact-filter-detail.proposed.png',
        mode: 'filter-detail',
    },
];

if (process.env.CMZ_WRITE_COMPACT_LAYOUT_EXAMPLES !== '1') {
    throw new Error(
        'Refus d’écrire les exemples Compact sans CMZ_WRITE_COMPACT_LAYOUT_EXAMPLES=1.'
    );
}

await mkdir(root, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
    for (const renderCase of cases) {
        const context = await browser.newContext({
            viewport: { width: 390, height: 844 },
            deviceScaleFactor: 1,
            colorScheme: 'light',
            reducedMotion: 'reduce',
            locale: 'fr-FR',
        });
        const page = await context.newPage();
        const target = new URL(pathToFileURL(source));
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

console.log(`Rendered ${cases.length} Compact layout examples in ${root}`);
