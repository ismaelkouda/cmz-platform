// X4-sécurité-3, N4 (conception v2 §3.4, O-S-V) : trois témoins natifs, sans
// code adverse, construits par les outils du produit et mesurés dans son
// Chromium, à chaque exécution (donc à chaque montée d'Angular proposée).
//   1. écouteur `(submit)` qui rend `false`      → 0 soumission native ;
//   2. écouteur qui lève une Error              → 0 soumission native, erreur
//                                                 journalisée par l'ErrorHandler ;
//   3. écouteur qui rend `undefined`            → 1 soumission native (le
//                                                 témoin prouve que la mesure
//                                                 est sensible).
// Les témoins vivent dans une copie jetable d'un produit construit de la
// preuve native ; le produit lui-même n'est jamais modifié.
// Usage : --proof-root <racine d'une preuve native>.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { constants } from 'node:fs';
import {
    cp,
    mkdir,
    mkdtemp,
    readdir,
    readFile,
    rm,
    writeFile,
} from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const WITNESSES = Object.freeze([
    { id: 'false', method: 'returnsFalse', expected: 0, logged: false },
    { id: 'throws', method: 'throwsError', expected: 0, logged: true },
    { id: 'undefined', method: 'returnsUndefined', expected: 1, logged: false },
]);

// Page témoin : écrite par l'atelier, hors de la grammaire de page (ce n'est
// pas une réalisation), à la place de la page d'entrée dans la copie.
export function witnessPage(selector) {
    const forms = WITNESSES.map(
        ({ id, method }) =>
            `<form id="w-${id}" action="/cmz-witness/${id}" (submit)="${method}()"><input name="w" value="1"><button id="b-${id}" type="submit">${id}</button></form>`
    ).join('\n');
    return {
        'page.component.ts': `import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: '${selector}',
    template: \`<main>${forms.replaceAll('`', '')}</main>\`,
})
export class PageComponent {
    protected returnsFalse(): false {
        return false;
    }

    protected throwsError(): false {
        throw new Error('cmz-witness');
    }

    protected returnsUndefined(): void {
        return undefined;
    }
}
`,
    };
}

// Premier produit de la preuve dont l'application porte une page d'entrée
// réalisée et une sortie construite.
export async function witnessTarget(root) {
    for (const product of (await readdir(root))
        .filter((name) => name.startsWith('product-'))
        .sort()) {
        const apps = join(root, product, 'apps');
        for (const app of (await readdir(apps).catch(() => [])).sort()) {
            const pages = join(apps, app, 'src', 'app', 'pages');
            for (const page of (await readdir(pages).catch(() => [])).sort()) {
                const component = join(pages, page, 'page.component.ts');
                const html = await readFile(
                    join(pages, page, 'page.component.html'),
                    'utf8'
                ).catch(() => '');
                if (!html.includes('(submit)')) continue;
                const source = await readFile(component, 'utf8');
                const selector = /selector: '([^']+)'/.exec(source)?.[1];
                const contract = JSON.parse(
                    await readFile(
                        join(apps, app, '.cmz', 'pages', `${page}.json`),
                        'utf8'
                    )
                );
                const route = contract.experience?.session?.routes?.find(
                    (entry) => entry.page_id === page
                );
                if (selector && route)
                    return {
                        product: join(root, product),
                        app,
                        page,
                        selector,
                        path: route.path,
                    };
            }
        }
    }
    throw new Error('aucune page réalisée avec (submit) dans la preuve');
}

function build(copy, app) {
    const result = spawnSync(
        join(copy, 'node_modules', '.bin', 'nx'),
        [
            'build',
            app,
            '--configuration=production',
            '--skip-nx-cache',
            '--output-style=static',
        ],
        {
            cwd: copy,
            encoding: 'utf8',
            env: { ...process.env, NX_DAEMON: 'false', NX_NO_CLOUD: 'true' },
            timeout: 600_000,
        }
    );
    assert.equal(
        result.status,
        0,
        `construction des témoins : exit ${result.status} ${result.error?.code ?? ''} ${`${result.stdout ?? ''}${result.stderr ?? ''}`
            .split('\n')
            .filter((line) => /error|ERROR|✘/.test(line))
            .slice(0, 5)
            .join(' | ')}`
    );
}

const TYPES = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.webmanifest': 'application/manifest+json',
    '.svg': 'image/svg+xml',
};

export async function measureWitnesses({ dist, path, browser }) {
    const hits = [];
    const server = createServer(async (request, response) => {
        const pathname = new URL(request.url ?? '/', 'http://localhost')
            .pathname;
        if (pathname.startsWith('/cmz-witness/'))
            hits.push(pathname.slice('/cmz-witness/'.length));
        const file = resolve(dist, '.' + pathname);
        let bytes;
        let extension = extname(file);
        try {
            assert.ok(file.startsWith(dist + '/'));
            bytes = await readFile(file);
        } catch {
            bytes = await readFile(join(dist, 'index.html'));
            extension = '.html';
        }
        response.writeHead(200, {
            'content-type': TYPES[extension] ?? 'application/octet-stream',
        });
        response.end(bytes);
    });
    await new Promise((done) => server.listen(0, '127.0.0.1', done));
    const origin = `http://127.0.0.1:${server.address().port}`;
    const { chromium } = await import('@playwright/test');
    const launched = await chromium.launch({
        executablePath: browser,
        headless: true,
    });
    const results = [];
    try {
        for (const witness of WITNESSES) {
            const context = await launched.newContext({
                serviceWorkers: 'block',
            });
            const page = await context.newPage();
            const documents = [];
            const errors = [];
            page.on('request', (request) => {
                if (
                    request.isNavigationRequest() &&
                    request.frame().parentFrame() === null
                )
                    documents.push(new URL(request.url()).pathname);
            });
            page.on('console', (message) => {
                if (message.type() === 'error') errors.push(message.text());
            });
            await page.goto(origin + path);
            await page.locator(`#b-${witness.id}`).waitFor();
            const before = hits.filter((hit) => hit === witness.id).length;
            await page.locator(`#b-${witness.id}`).click();
            await page.waitForTimeout(1500);
            const submissions =
                hits.filter((hit) => hit === witness.id).length - before;
            const logged = errors.some((text) => text.includes('cmz-witness'));
            results.push({
                id: witness.id,
                submissions,
                documents: documents.length,
                logged,
            });
            await context.close();
        }
    } finally {
        await launched.close();
        await new Promise((done) => server.close(done));
    }
    return results;
}

export function judge(results) {
    const lines = [];
    let failed = 0;
    for (const witness of WITNESSES) {
        const measured = results.find((entry) => entry.id === witness.id);
        const ok =
            measured &&
            measured.submissions === witness.expected &&
            measured.documents === 1 + witness.expected &&
            (!witness.logged || measured.logged);
        if (!ok) failed += 1;
        lines.push(
            `${ok ? 'PASS' : 'FAIL'} page-submit-witness/${witness.id} native_submissions=${measured?.submissions} documents=${measured?.documents}${witness.logged ? ` error_logged=${measured?.logged}` : ''} (attendu ${witness.expected})`
        );
    }
    return { lines, failed };
}

async function main() {
    const index = process.argv.indexOf('--proof-root');
    const root = index > 0 ? resolve(process.argv[index + 1] ?? '') : '';
    assert.ok(root, 'usage : --proof-root <racine>');
    const target = await witnessTarget(root);
    const browsers = (await readdir(join(root, 'browser'), { recursive: true }))
        .filter((path) => /(?:^|\/)chrome-headless-shell$/.test(path))
        .map((path) => join(root, 'browser', path));
    assert.equal(browsers.length, 1, 'Chromium de la preuve introuvable');
    const angular = JSON.parse(
        await readFile(
            join(
                target.product,
                'node_modules',
                '@angular',
                'core',
                'package.json'
            ),
            'utf8'
        )
    ).version;
    const copy = await mkdtemp(join(tmpdir(), 'cmz-submit-witnesses-'));
    try {
        await cp(target.product, copy, {
            recursive: true,
            verbatimSymlinks: true,
            mode: constants.COPYFILE_FICLONE,
            filter: (source) =>
                !/^[\\/](?:dist|\.nx|\.angular)(?:[\\/]|$)/.test(
                    source.slice(target.product.length)
                ),
        });
        const pageRoot = join(
            copy,
            'apps',
            target.app,
            'src',
            'app',
            'pages',
            target.page
        );
        await rm(pageRoot, { recursive: true, force: true });
        await mkdir(pageRoot, { recursive: true });
        for (const [name, content] of Object.entries(
            witnessPage(target.selector)
        ))
            await writeFile(join(pageRoot, name), content);
        build(copy, target.app);
        const results = await measureWitnesses({
            dist: join(copy, 'dist', 'apps', target.app, 'browser'),
            path: target.path,
            browser: browsers[0],
        });
        const { lines, failed } = judge(results);
        console.log(`page-submit-witnesses @angular/core=${angular}`);
        for (const line of lines) console.log(line);
        process.exitCode = failed ? 1 : 0;
    } finally {
        await rm(copy, { recursive: true, force: true });
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
