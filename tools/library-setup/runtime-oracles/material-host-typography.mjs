import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import {
    cssFiles,
    nxBuild,
    projectOutputPath,
    removeTree,
} from './support.mjs';

const EXPECTED_TYPOGRAPHY = Object.freeze({
    fontFamily: '"CMZ Host Sentinel", serif',
    fontSize: '19px',
    lineHeight: '31px',
    fontWeight: '700',
});
const TYPOGRAPHY_MUTATIONS = Object.freeze([
    Object.freeze({
        id: 'font-shorthand',
        css: 'body { font: var(--mat-sys-body-medium); }',
        properties: Object.freeze([
            'fontFamily',
            'fontSize',
            'lineHeight',
            'fontWeight',
        ]),
    }),
    Object.freeze({
        id: 'font-size',
        css: 'body { font-size: 13px; }',
        properties: Object.freeze(['fontSize']),
    }),
    Object.freeze({
        id: 'line-height',
        css: 'body { line-height: 17px; }',
        properties: Object.freeze(['lineHeight']),
    }),
]);

function fail(message) {
    throw new Error(`library runtime proof: ${message}`);
}

function parseProbe(raw) {
    const match = /<pre id="cmz-result">([^<]*)<\/pre>/.exec(raw);
    if (!match || !match[1].trim()) {
        fail('la sonde de typographie n’a produit aucun résultat exploitable');
    }
    try {
        return JSON.parse(match[1]);
    } catch {
        fail('résultat de sonde de typographie illisible');
    }
}

function assertTypography(label, observed) {
    if (!observed || typeof observed !== 'object' || Array.isArray(observed)) {
        fail(`${label} sans typographie calculée`);
    }
    for (const [property, expected] of Object.entries(EXPECTED_TYPOGRAPHY)) {
        if (observed[property] !== expected) {
            fail(
                `${label}.${property} = ${String(observed[property])}, attendu ${expected}`
            );
        }
    }
}

function assertTypographyShape(label, observed) {
    if (!observed || typeof observed !== 'object' || Array.isArray(observed)) {
        fail(`${label} sans typographie calculée`);
    }
    for (const property of Object.keys(EXPECTED_TYPOGRAPHY)) {
        if (
            typeof observed[property] !== 'string' ||
            observed[property].length === 0
        ) {
            fail(`${label}.${property} sans valeur calculée`);
        }
    }
}

export function assertHostTypography(raw) {
    const observed = parseProbe(raw);
    assertTypography('racine', observed.root);
    assertTypography('body', observed.body);
    assertTypography('enfant', observed.child);
    return observed;
}

export function assertHostTypographyMutation(raw, mutation) {
    const observed = parseProbe(raw);
    assertTypography('racine', observed.root);
    for (const scope of ['body', 'child']) {
        const label = scope === 'child' ? 'enfant' : scope;
        assertTypographyShape(label, observed[scope]);
        if (
            mutation.properties.every(
                (property) =>
                    observed[scope][property] === EXPECTED_TYPOGRAPHY[property]
            )
        ) {
            fail(`mutation ${mutation.id} non détectée sur ${label}`);
        }
    }
    return observed;
}

export function hostTypographyProbeHtml(compiledCss) {
    if (typeof compiledCss !== 'string' || compiledCss.length === 0) {
        fail('aucun CSS compilé à donner à la sonde de typographie');
    }
    if (compiledCss.includes('</style')) {
        fail('CSS compilé contenant une fermeture de balise style');
    }
    return `<!doctype html><html><head><style>
html, body {
    font-family: "CMZ Host Sentinel", serif;
    font-size: 19px;
    line-height: 31px;
    font-weight: 700;
}
</style><style>${compiledCss}</style></head><body>
<span id="cmz-typography-child">preuve typographique</span>
<pre id="cmz-result"></pre>
<script>
const typography = (element) => {
    const style = getComputedStyle(element);
    return {
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        lineHeight: style.lineHeight,
        fontWeight: style.fontWeight,
    };
};
document.getElementById('cmz-result').textContent = JSON.stringify({
    root: typography(document.documentElement),
    body: typography(document.body),
    child: typography(document.getElementById('cmz-typography-child')),
});
</script></body></html>`;
}

function renderProbe(context, output, compiledCss, id) {
    const probe = join(output, `cmz-host-typography-${id}.html`);
    writeFileSync(probe, hostTypographyProbeHtml(compiledCss), { flag: 'wx' });
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
    return result.stdout;
}

export function proveMaterialHostTypography(context) {
    if (!context.browserExecutable) {
        fail('aucun moteur de rendu approvisionné pour cette acceptance');
    }
    const output = projectOutputPath(context.workspace, context.app);
    if (existsSync(output)) fail('sortie de build préexistante');
    try {
        nxBuild(context, context.app);
        const compiledCss = cssFiles(output)
            .map((path) => readFileSync(path, 'utf8'))
            .join('\n');
        const healthy = assertHostTypography(
            renderProbe(context, output, compiledCss, 'healthy')
        );
        for (const mutation of TYPOGRAPHY_MUTATIONS) {
            assertHostTypographyMutation(
                renderProbe(
                    context,
                    output,
                    `${compiledCss}\n${mutation.css}`,
                    mutation.id
                ),
                mutation
            );
        }
        return healthy;
    } finally {
        removeTree(output);
    }
}
