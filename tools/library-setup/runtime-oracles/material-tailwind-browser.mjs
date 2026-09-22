import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import {
    cssFiles,
    nxBuild,
    projectOutputPath,
    removeTree,
    safePath,
} from './support.mjs';

const BROWSER_PROBE = 'cmz-coexistence-probe.html';
const SOURCE_PROBE = 'cmz-coexistence-source-probe.html';

function fail(message) {
    throw new Error(`library runtime proof: ${message}`);
}

export function browserProbeHtml(compiledCss) {
    if (typeof compiledCss !== 'string' || compiledCss.length === 0) {
        fail('aucun CSS compilé à donner au moteur');
    }
    if (compiledCss.includes('</style')) {
        fail('CSS compilé contenant une fermeture de balise style');
    }
    return `<!doctype html><html><head><style>${compiledCss}</style><style>
#unlayered { border-width: 7px; border-style: solid }
</style></head><body>
<button id="unlayered" class="mat-mdc-button">M</button>
<div id="utility" class="text-[#123456]">T</div>
<pre id="cmz-result"></pre>
<script>
const html = getComputedStyle(document.documentElement);
const button = getComputedStyle(document.getElementById('unlayered'));
const utility = getComputedStyle(document.getElementById('utility'));
const tokens = Array.from(document.styleSheets)
    .flatMap((sheet) => { try { return Array.from(sheet.cssRules); } catch { return []; } })
    .flatMap((rule) => (rule.style ? Array.from(rule.style) : []))
    .filter((property) => property.startsWith('--mat-'));
document.getElementById('cmz-result').textContent = JSON.stringify({
    tokenCount: new Set(tokens).size,
    tokenResolved: html.getPropertyValue(tokens[0] || '--absent').trim(),
    unlayeredBorderWidth: button.borderTopWidth,
    utilityColor: utility.color,
});
</script></body></html>`;
}

export function assertBrowserCoexistence(raw) {
    const match = /<pre id="cmz-result">([^<]*)<\/pre>/.exec(raw);
    if (!match || !match[1].trim()) {
        fail('la sonde navigateur n’a produit aucun résultat exploitable');
    }
    let observed;
    try {
        observed = JSON.parse(match[1]);
    } catch {
        fail('résultat de sonde navigateur illisible');
    }
    if (!Number.isInteger(observed.tokenCount) || observed.tokenCount === 0) {
        fail('aucun jeton --mat-* dans le CSS chargé par le moteur');
    }
    if (!observed.tokenResolved) {
        fail('le moteur ne résout aucun jeton --mat-* sur <html>');
    }
    if (observed.unlayeredBorderWidth !== '7px') {
        fail(
            `le preflight Tailwind écrase une règle hors couche (border-width calculé = ${observed.unlayeredBorderWidth})`
        );
    }
    if (
        !['rgb(18, 52, 86)', '#123456'].includes(
            String(observed.utilityColor).trim()
        )
    ) {
        fail(
            `l'utilitaire Tailwind ne s'applique plus (color calculée = ${observed.utilityColor})`
        );
    }
    return observed;
}

export function proveMaterialTailwindBrowser(context) {
    if (!context.browserExecutable) {
        fail('aucun moteur de rendu approvisionné pour cette acceptance');
    }
    const output = projectOutputPath(context.workspace, context.app);
    if (existsSync(output)) fail('sortie de build préexistante');
    const probe = join(output, BROWSER_PROBE);
    const sourceProbe = safePath(
        context.workspace,
        `apps/${context.app}/src/${SOURCE_PROBE}`
    );
    if (existsSync(sourceProbe)) fail('fixture de coexistence déjà présente');
    writeFileSync(
        sourceProbe,
        '<div class="text-[#123456]">preuve coexistence</div>\n',
        { flag: 'wx' }
    );
    try {
        nxBuild(context, context.app);
        const compiledCss = cssFiles(output)
            .map((path) => readFileSync(path, 'utf8'))
            .join('\n');
        writeFileSync(probe, browserProbeHtml(compiledCss), { flag: 'wx' });
        const result = context.run({
            backend: context.backend,
            profile: 'execution',
            candidate: context.workspace,
            cache: context.cache,
            home: context.home,
            repository: context.repository,
            hostExecutable: context.browserExecutable,
            containerExecutable: `{{readonly:0}}/${relative(
                context.browserRoot,
                context.browserExecutable
            )}`,
            readOnlyPaths: [context.browserRoot],
            renderer: true,
            argv: [
                '--headless',
                '--disable-gpu',
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--user-data-dir={{candidate}}/node_modules/.cmz-browser-profile',
                '--dump-dom',
                `file://{{candidate}}/${relative(context.workspace, probe)}`,
            ],
            policy: context.policy,
            timeoutMs: 5 * 60_000,
        });
        if (result.status !== 0) {
            fail(
                `moteur de rendu en échec (code ${result.status}) : ${result.stderr.slice(0, 500)}`
            );
        }
        return assertBrowserCoexistence(result.stdout);
    } finally {
        if (existsSync(sourceProbe)) unlinkSync(sourceProbe);
        removeTree(output);
    }
}
