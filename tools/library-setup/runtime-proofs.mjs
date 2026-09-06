import {
    existsSync,
    lstatSync,
    readFileSync,
    readdirSync,
    rmdirSync,
    unlinkSync,
    writeFileSync,
} from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

import postcss from 'postcss';

import { snapshotFilesystem, snapshotSha256 } from './filesystem-snapshot.mjs';
import { runConfined } from './sandbox.mjs';

const SENTINEL = 'cmz-proof-text-[#123456]';

function fail(message) {
    throw new Error(`library runtime proof: ${message}`);
}

function safePath(workspace, path) {
    const target = resolve(workspace, ...path.split('/'));
    const rel = relative(resolve(workspace), target);
    if (rel === '..' || rel.startsWith(`..${sep}`))
        fail(`chemin hors candidat : ${path}`);
    return target;
}

function removeTree(path) {
    if (!existsSync(path)) return;
    const stats = lstatSync(path);
    if (stats.isDirectory() && !stats.isSymbolicLink()) {
        for (const name of readdirSync(path)) removeTree(join(path, name));
        rmdirSync(path);
    } else {
        unlinkSync(path);
    }
}

function runNode(context, argv, label) {
    const result = context.run({
        backend: context.backend,
        profile: 'execution',
        candidate: context.workspace,
        cache: context.cache,
        home: context.home,
        repository: context.repository,
        hostExecutable: process.execPath,
        containerExecutable: '/usr/local/bin/node',
        argv,
        policy: context.policy,
        timeoutMs: 10 * 60_000,
    });
    if (result.status !== 0)
        fail(`${label} en échec (code ${result.status}) : ${result.stderr}`);
}

function projectOutputPath(workspace, app) {
    const project = JSON.parse(
        readFileSync(safePath(workspace, `apps/${app}/project.json`), 'utf8')
    );
    const output = project.targets?.build?.options?.outputPath;
    if (typeof output !== 'string' || !output.startsWith('dist/apps/')) {
        fail(`outputPath Nx non reconnu pour ${app}`);
    }
    return safePath(workspace, output);
}

function cssFiles(root) {
    const found = [];
    function visit(path) {
        const stats = lstatSync(path);
        if (stats.isSymbolicLink())
            fail('lien symbolique dans la sortie de build');
        if (stats.isDirectory()) {
            for (const name of readdirSync(path)) visit(join(path, name));
        } else if (stats.isFile() && path.endsWith('.css')) found.push(path);
        else if (!stats.isFile())
            fail('fichier spécial dans la sortie de build');
    }
    visit(root);
    return found;
}

function nxBuild(context, app) {
    runNode(
        context,
        [
            'node_modules/nx/dist/bin/nx.js',
            'run',
            `${app}:build:development`,
            '--skip-nx-cache',
        ],
        `build Angular ${app}`
    );
}

function buildAndClean(context, app) {
    const output = projectOutputPath(context.workspace, app);
    if (existsSync(output)) fail('sortie de build préexistante');
    nxBuild(context, app);
    if (!existsSync(output) || !lstatSync(output).isDirectory()) {
        fail(`le build de ${app} n'a produit aucune sortie régulière`);
    }
    removeTree(output);
}

function proveMaterial(context) {
    runNode(
        context,
        [
            'node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js',
            '-p',
            'tools/library-setup/runtime-fixtures/tsconfig.material.json',
        ],
        'compilation stricte du composant Material'
    );
}

function proveTransloco(context) {
    runNode(
        context,
        [
            'node_modules/vitest/vitest.mjs',
            'run',
            '--config',
            'tools/library-setup/vitest.runtime.config.mjs',
        ],
        'rendu réel Transloco'
    );
}

function proveTailwind(context, app) {
    const probe = safePath(
        context.workspace,
        `apps/${app}/src/${SENTINEL}.html`
    );
    if (existsSync(probe)) fail('fixture Tailwind déjà présente');
    const output = projectOutputPath(context.workspace, app);
    if (existsSync(output)) fail('sortie de build préexistante');
    writeFileSync(probe, '<div class="text-[#123456]">preuve</div>\n', {
        flag: 'wx',
    });
    try {
        nxBuild(context, app);
        const styles = cssFiles(output)
            .map((path) => readFileSync(path, 'utf8'))
            .join('\n');
        if (
            !/(?:color:\s*#123456|color:\s*rgb\(18[ ,]+52[ ,]+86\))/.test(
                styles
            )
        ) {
            fail('la classe sentinelle Tailwind n’a émis aucune règle CSS');
        }
    } finally {
        if (existsSync(probe)) unlinkSync(probe);
        removeTree(output);
    }
}

function isBareButtonSelector(selector) {
    const part = selector.trim();
    return /^button(?![\w-])/.test(part) && !part.includes('.');
}

function insideLayer(node) {
    for (let parent = node.parent; parent; parent = parent.parent) {
        if (parent.type === 'atrule' && parent.name === 'layer') return true;
    }
    return false;
}

/**
 * Le conflit réel entre Material et Tailwind n'est pas « les deux fichiers
 * existent » : c'est le preflight Tailwind, qui remet `button` à plat et
 * effacerait l'apparence des composants Material s'il l'emportait.
 *
 * Une couche perd TOUJOURS contre du CSS hors couche, quelle que soit la
 * spécificité. La relation est donc décidable sur l'artefact compilé, sans
 * navigateur — c'est elle, et non un rendu, qui décide qui gagne.
 *
 * Ce que le CSS contient VRAIMENT à l'installation, mesuré sur un candidat réel
 * le 2026-09-06 : `mat.theme()` émet 168 jetons `--mat-sys-*` dans UNE règle
 * `html` hors couche, et Tailwind émet 2 règles de preflight, toutes deux dans
 * `@layer base`. En revanche **zéro** règle `.mat-*` : les styles de composants
 * ne sont embarqués que si un composant Material est réellement utilisé, ce qui
 * n'est pas le cas d'une app qui vient de recevoir `ng-add`. L'oracle juge donc
 * les jetons — que tout composant Material lira — et non des règles de
 * composants absentes du bundle.
 *
 * Conséquence assumée, portée par la même relation : une utilitaire Tailwind
 * (`@layer utilities`) ne peut pas davantage surcharger Material. Surcharger un
 * composant Material demande du CSS applicatif hors couche.
 *
 * Ce que cette preuve NE couvre PAS : la mise en page, la peinture, les états
 * focus/ripple, les polices. Elle est nommée `compiled-css-rule`, pas
 * `browser-coexistence` — l'acceptance navigateur reste déclarée, sans oracle,
 * donc bloquante.
 */
export function assertMaterialTailwindCascade(css, parse) {
    const root = parse(css);
    let resets = 0;
    const unlayeredResets = [];
    let tokenRules = 0;
    let unlayeredTokenRules = 0;
    root.walkRules((rule) => {
        if (rule.selectors.some(isBareButtonSelector)) {
            resets += 1;
            if (!insideLayer(rule)) unlayeredResets.push(rule.selector);
        }
        if (
            rule.nodes?.some(
                (node) => node.type === 'decl' && node.prop.startsWith('--mat-')
            )
        ) {
            tokenRules += 1;
            if (!insideLayer(rule)) unlayeredTokenRules += 1;
        }
    });
    if (resets === 0 || tokenRules === 0) {
        fail(
            `coexistence : CSS compilé incomplet (preflight Tailwind=${resets}, règles portant des jetons --mat-*=${tokenRules})`
        );
    }
    if (unlayeredResets.length > 0) {
        fail(
            `coexistence : preflight Tailwind hors couche, il écraserait Material (${unlayeredResets
                .slice(0, 3)
                .join(' / ')})`
        );
    }
    if (unlayeredTokenRules === 0) {
        fail(
            'coexistence : jetons --mat-* uniquement dans une couche, du CSS hors couche les écraserait'
        );
    }
    return { resets, tokenRules, unlayeredTokenRules };
}

function proveMaterialTailwindCascade(context, app) {
    const output = projectOutputPath(context.workspace, app);
    if (existsSync(output)) fail('sortie de build préexistante');
    nxBuild(context, app);
    try {
        const css = cssFiles(output)
            .map((path) => readFileSync(path, 'utf8'))
            .join('\n');
        assertMaterialTailwindCascade(css, postcss.parse);
    } finally {
        removeTree(output);
    }
}

const BROWSER_PROBE = 'cmz-coexistence-probe.html';

/**
 * Page sonde : elle charge le CSS RÉELLEMENT COMPILÉ de l'app, place côte à
 * côte un bouton et une utilitaire Tailwind, puis demande au moteur ses styles
 * CALCULÉS et les dépose dans le DOM. `--dump-dom` les rend lisibles sans CDP,
 * sans websocket et donc sans le moindre accès réseau.
 *
 * La règle `#unlayered` tient la place des styles de composants Material :
 * à l'installation le bundle n'en contient aucun (aucun composant utilisé), or
 * c'est exactement cette relation — hors couche contre `@layer` — dont ils
 * dépendront. Le moteur tranche, on ne l'infère plus du texte CSS.
 */
export function browserProbeHtml(compiledCss) {
    if (typeof compiledCss !== 'string' || compiledCss.length === 0) {
        fail('aucun CSS compilé à donner au moteur');
    }
    if (compiledCss.includes('</style')) {
        fail('CSS compilé contenant une fermeture de balise style');
    }
    // Le CSS est INTÉGRÉ, pas lié : en `file://` Chrome refuse d'énumérer les
    // règles d'une feuille externe (origine opaque) et `cssRules` lève, ce qui
    // rendrait la sonde aveugle aux jetons. Le contenu reste celui du build.
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

function proveMaterialTailwindBrowser(context, app) {
    if (!context.browserExecutable) {
        fail('aucun moteur de rendu approvisionné pour cette acceptance');
    }
    const output = projectOutputPath(context.workspace, app);
    if (existsSync(output)) fail('sortie de build préexistante');
    const probe = join(output, BROWSER_PROBE);
    nxBuild(context, app);
    try {
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
            containerExecutable: context.browserExecutable,
            readOnlyPaths: [context.browserRoot],
            renderer: true,
            argv: [
                '--headless',
                '--disable-gpu',
                '--no-sandbox',
                '--disable-dev-shm-usage',
                `--user-data-dir=${join(context.workspace, 'node_modules/.cmz-browser-profile')}`,
                '--dump-dom',
                `file://${probe}`,
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
        removeTree(output);
    }
}

/**
 * Un oracle par acceptance DÉCLARÉE, adressé par (plateforme, bibliothèque, id).
 * La règle « Material + Tailwind » était auparavant écrite en dur ici : retirer
 * le bloc `coexistence` de la recette ne changeait rien à l'échec, donc la
 * recette n'était pas la source de vérité. Elle l'est désormais — une
 * acceptance déclarée sans oracle enregistré échoue en la nommant, et aucune
 * acceptance non déclarée n'est exécutée.
 */
const RUNTIME_ORACLES = new Map([
    [
        'angular/angular-material#material-component-compiles',
        (context) => proveMaterial(context),
    ],
    [
        'angular/tailwind#sentinel-class-emits-rule',
        (context) => proveTailwind(context, context.app),
    ],
    [
        'angular/transloco#key-renders-translation',
        (context) => proveTransloco(context),
    ],
    [
        'angular/angular-material#material-tailwind-cascade-order',
        (context) => proveMaterialTailwindCascade(context, context.app),
    ],
    [
        'angular/angular-material#material-tailwind-render-together',
        (context) => proveMaterialTailwindBrowser(context, context.app),
    ],
]);

/** Clés lisibles par le gate statique, sans exécuter aucun oracle. */
export const RUNTIME_ORACLE_KEYS = new Set(RUNTIME_ORACLES.keys());

export function requiredAcceptances(recipe, installedLibraries = []) {
    const entries = (recipe.runtime_acceptance ?? []).map((entry) => ({
        ...entry,
        scope: 'library',
    }));
    for (const block of recipe.coexistence ?? []) {
        if (!installedLibraries.includes(block.with)) continue;
        for (const entry of block.runtime_acceptance ?? []) {
            entries.push({ ...entry, scope: `coexistence:${block.with}` });
        }
    }
    return entries;
}

export function proveLibraryRuntime({
    repository,
    candidate,
    recipe,
    app,
    policy,
    backend,
    cache,
    home,
    installedLibraries = [],
    browserExecutable,
    browserRoot,
    run = runConfined,
}) {
    const before = snapshotFilesystem(candidate.workspace, {
        excludedDirectories: ['node_modules'],
    });
    const context = {
        repository,
        workspace: candidate.workspace,
        app,
        policy,
        backend,
        cache,
        home,
        browserExecutable,
        browserRoot,
        run,
    };
    const required = requiredAcceptances(recipe, installedLibraries);
    if (required.length === 0) {
        fail(
            `aucune acceptance runtime déclarée pour ${recipe.platform}/${recipe.library}`
        );
    }
    buildAndClean(context, app);
    const executed = [];
    for (const entry of required) {
        const key = `${recipe.platform}/${recipe.library}#${entry.id}`;
        const oracle = RUNTIME_ORACLES.get(key);
        if (!oracle) {
            fail(
                `oracle runtime absent pour ${key} (preuve ${entry.proof}, ${entry.scope})`
            );
        }
        oracle(context);
        executed.push(entry.id);
    }
    const after = snapshotFilesystem(candidate.workspace, {
        excludedDirectories: ['node_modules'],
    });
    if (snapshotSha256(before) !== snapshotSha256(after)) {
        fail('les preuves runtime ont laissé des artefacts gouvernés');
    }
    return { proofs: executed };
}
