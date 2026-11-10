// X4-sécurité : chaque page interdite du validateur est bloquée par un
// mécanisme nommé, chaque règle du bon de travail a son cas, et une page
// réalisée est signalée quand sa commande est republiée (I-3). Les mécanismes
// navigateur (politique de la coque) et confinement sont prouvés par
// check:external-application-shells et application-workspace.test.mjs.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

import {
    computeOwnershipSeal,
    inventoryTreeSha,
} from './core/application-ownership.mjs';
import {
    planExternalActionRequest,
    publishExternalActionRequest,
} from './core/external-action-request.mjs';
import { dependentPagesNotice } from './core/external-cli.mjs';
import {
    planExternalPageComposition,
    publishExternalPageComposition,
} from './core/external-page-composition.mjs';
import {
    planExternalPagePlan,
    publishExternalPagePlan,
} from './core/external-page-plan.mjs';
import {
    planExternalPageRealization,
    planExternalPageRealizationWorkOrder,
    publishExternalPageRealization,
} from './core/external-page-realization.mjs';
import { FORBIDDEN_PATTERNS } from './core/external-page-realization-rules.mjs';
import { pagePlanPath } from './core/external-publication-paths.mjs';
import { EXTERNAL_CSP_DIRECTIVES } from './renderers/external-content-security-policy.mjs';
import { snapshotTree } from './test-support/external-application-fixture.mjs';
import { MANIFEST } from './test-support/external-publication-fixture.mjs';
import {
    composedProduct,
    prepare,
    publish,
    realization,
    realizationChecker,
    workOrderOf,
    writeDraft,
} from './test-support/external-realization-product.mjs';
import {
    probedFiles,
    VALIDATOR_PROBES,
} from './test-support/external-realization-probes.mjs';
import { SECOND_PROBES } from './test-support/external-realization-second-probes.mjs';

const TS = 'page.component.ts';
const HTML = 'page.component.html';
const SCSS = 'page.component.scss';
const SPEC = 'page.component.spec.ts';

test('X4-sécurité : les 74 pages interdites du validateur (et 3 témoins) rejouées, chacune bloquée par un mécanisme nommé', async (t) => {
    const product = await composedProduct(t, 'observatory');
    await prepare(product);
    const workOrder = await workOrderOf(product);
    const good = await realization(product, workOrder);
    await writeDraft(product, workOrder, good);
    await planExternalPageRealization(product.options);
    const directives = new Map(EXTERNAL_CSP_DIRECTIVES);
    const counts = {};
    for (const probe of VALIDATOR_PROBES) {
        await writeDraft(product, workOrder, probedFiles(good, probe));
        const failure = await planExternalPageRealization(product.options).then(
            () => null,
            (error) => error
        );
        counts[probe.mechanism] = (counts[probe.mechanism] ?? 0) + 1;
        if (probe.mechanism === 'static') {
            assert.ok(failure?.violations?.length, `${probe.id} accepté`);
            continue;
        }
        // Apparence libre : acceptée par les règles, gouvernée par la
        // politique de la coque (mesurée dans le navigateur par la preuve
        // native), ou ressource de même origine sans sortie.
        assert.equal(failure, null, `${probe.id} : ${failure?.message}`);
        if (probe.mechanism === 'same-origin') continue;
        const directive = probe.mechanism.slice('csp:'.length);
        assert.match(
            directives.get(directive) ?? '',
            /^'self'(?: data:| 'unsafe-inline')?$/
        );
    }
    assert.deepEqual(counts, {
        static: 64,
        'csp:img-src': 8,
        'csp:style-src': 2,
        'csp:font-src': 1,
        'same-origin': 2,
    });
    assert.equal(
        VALIDATOR_PROBES.filter((probe) => probe.id.startsWith('C-')).length,
        3
    );
});

// X4-sécurité 2 : les 127 nouvelles pages du validateur, rejouées à l'octet
// près. Aucune navigation, aucun appel réseau, aucun accès au stockage ne
// reste accepté : une page acceptée l'est pour son apparence (politique de
// la coque, mesurée), parce qu'elle ne demande rien, ou parce qu'elle reste
// dans l'application.
test('X4-sécurité 2 : les 127 nouvelles pages du validateur rejouées, chacune refusée ou nommée', async (t) => {
    const product = await composedProduct(t, 'equipment-hire');
    await prepare(product);
    const workOrder = await workOrderOf(product);
    const good = await realization(product, workOrder);
    const directives = new Map(EXTERNAL_CSP_DIRECTIVES);
    const counts = {};
    assert.equal(SECOND_PROBES.length, 127);
    for (const probe of SECOND_PROBES) {
        await writeDraft(product, workOrder, probedFiles(good, probe));
        const failure = await planExternalPageRealization(product.options).then(
            () => null,
            (error) => error
        );
        counts[probe.mechanism] = (counts[probe.mechanism] ?? 0) + 1;
        if (probe.mechanism === 'static') {
            assert.ok(failure?.violations?.length, `${probe.id} accepté`);
            continue;
        }
        assert.equal(failure, null, `${probe.id} : ${failure?.message}`);
        if (probe.mechanism.startsWith('csp:'))
            assert.match(
                directives.get(probe.mechanism.slice('csp:'.length)) ?? '',
                /^'self'(?: data:| 'unsafe-inline')?$/
            );
    }
    assert.deepEqual(counts, {
        static: 112,
        'csp:img-src': 8,
        'in-app': 3,
        'csp:style-src': 1,
        inert: 3,
    });
});

test('X4-sécurité : chaque règle de la réalisation refuse sa violation et accepte la page de référence', async (t) => {
    const product = await composedProduct(t, 'observatory');
    const { workOrder, good, violationsOf } = await realizationChecker(product);
    assert.deepEqual(violationsOf(good), []);
    const module = workOrder.composition.module;
    const [literal] = workOrder.forbidden_literals;
    const edit = (name, change) => ({ ...good, [name]: change(good[name]) });
    const append = (name, text) => edit(name, (source) => source + text);
    const prepend = (name, text) => edit(name, (source) => text + source);
    // Un cas par motif lexical : le message nomme le motif lui-même.
    const patternCases = {
        HttpClient: '\nvoid inject(HttpClient);\n',
        XMLHttpRequest: '\nvoid new XMLHttpRequest();\n',
        'fetch\\s*\\(': "\nvoid fetch('/x');\n",
        axios: '\nconst client = axios;\n',
        WebSocket: "\nvoid new WebSocket('/x');\n",
        EventSource: "\nvoid new EventSource('/x');\n",
        sendBeacon: "\nnavigator.sendBeacon('/x');\n",
        'https?:\\/\\/': "\nexport const u = 'https://exemple.invalid';\n",
        localStorage: '\nvoid localStorage;\n',
        sessionStorage: '\nvoid sessionStorage;\n',
        indexedDB: '\nvoid indexedDB;\n',
        'document\\.cookie': '\nvoid document.cookie;\n',
        'eval\\s*\\(': "\nvoid eval('1');\n",
        'new\\s+Function\\s*\\(': "\nvoid new Function('return 1');\n",
        bypassSecurityTrust: "\nsanitizer.bypassSecurityTrustHtml('x');\n",
    };
    assert.equal(Object.keys(patternCases).length, FORBIDDEN_PATTERNS.length);
    for (const [label, pattern] of FORBIDDEN_PATTERNS) {
        const key = Object.keys(patternCases).find((entry) =>
            String(pattern).includes(entry)
        );
        assert.ok(key, String(pattern));
        assert.ok(
            violationsOf(append(TS, patternCases[key])).includes(
                `${label} forbidden in ${TS}: ${pattern}`
            ),
            String(pattern)
        );
    }
    const utf16 = Buffer.concat([
        Buffer.from([0xff, 0xfe]),
        Buffer.from(
            `${good[SCSS]}\n.x{background:url(https://exemple.invalid/x.png);}\n`,
            'utf16le'
        ),
    ]);
    const cases = [
        // Fichiers et encodage.
        [
            'fichier non UTF-8 (UTF-16)',
            { ...good, [SCSS]: utf16 },
            `page file is not UTF-8 text: ${SCSS}`,
        ],
        // Littéral d'endpoint, sur ses frontières de segment (M-5).
        [
            'littéral d’endpoint',
            append(TS, `\nexport const p = '${literal}';\n`),
            `endpoint literal forbidden in ${TS}: ${literal}`,
        ],
        [
            'littéral d’endpoint suivi d’un segment',
            append(TS, `\nexport const p = '${literal}/x';\n`),
            `endpoint literal forbidden in ${TS}: ${literal}`,
        ],
        // Imports, lus dans la syntaxe.
        [
            'réexportation',
            append(TS, "\nexport * from 'rxjs';\n"),
            `re-export forbidden in ${TS}`,
        ],
        [
            'réexportation hors liste',
            append(TS, "\nexport { fromFetch } from 'rxjs/fetch';\n"),
            `import not allowed by the work order in ${TS}: "rxjs/fetch"`,
        ],
        [
            'import = require',
            prepend(TS, "import rx = require('rxjs');\n"),
            `dynamic import forbidden in ${TS}`,
        ],
        [
            'require',
            append(TS, "\nconst loaded = require('rxjs');\n"),
            `dynamic import forbidden in ${TS}`,
        ],
        [
            'paquet de test dans la page',
            prepend(TS, "import { describe } from 'vitest';\n"),
            `import not allowed by the work order in ${TS}: "vitest"`,
        ],
        [
            'nœud de commande par la composition (I-2)',
            prepend(TS, `import { EnterNode } from '${module}';\n`),
            `composition name not importable in ${TS}: EnterNode`,
        ],
        [
            'import de toute la composition',
            prepend(TS, `import * as composition from '${module}';\n`),
            `namespace import forbidden in ${TS}: ${JSON.stringify(module)}`,
        ],
        [
            'import par défaut',
            prepend(TS, "import core from '@angular/core';\n"),
            `default import forbidden in ${TS}: "@angular/core"`,
        ],
        [
            'DOCUMENT',
            prepend(TS, "import { DOCUMENT } from '@angular/common';\n"),
            `symbol not allowed in ${TS}: angular @angular/core:DOCUMENT`,
        ],
        [
            'Renderer2',
            prepend(TS, "import { Renderer2 } from '@angular/core';\n"),
            `symbol not allowed in ${TS}: angular @angular/core:Renderer2`,
        ],
        [
            'ElementRef',
            prepend(TS, "import { ElementRef } from '@angular/core';\n"),
            `symbol not allowed in ${TS}: angular @angular/core:ElementRef`,
        ],
        [
            'symbole privé',
            prepend(TS, "import { ɵglobal } from '@angular/core';\n"),
            `symbol not allowed in ${TS}: angular @angular/core:_global`,
        ],
        // Montage lu dans le décorateur (M-2), pas dans un nom importé.
        [
            'composition importée mais non fournie',
            edit(TS, (text) =>
                text.replace(
                    '    providers: [...PAGE_COMPOSITION_PROVIDERS],\n',
                    ''
                )
            ),
            'page does not mount its composition (PAGE_COMPOSITION_PROVIDERS in @Component providers)',
        ],
        [
            'montage compté dans la seule spec',
            {
                ...edit(TS, (text) =>
                    text
                        .replace(
                            '    providers: [...PAGE_COMPOSITION_PROVIDERS],\n',
                            ''
                        )
                        .replace('    PAGE_COMPOSITION_PROVIDERS,\n', '')
                ),
                [SPEC]: `import { PAGE_COMPOSITION_PROVIDERS } from '${module}';\nvoid PAGE_COMPOSITION_PROVIDERS;\n${good[SPEC]}`,
            },
            'page does not mount its composition (PAGE_COMPOSITION_PROVIDERS in @Component providers)',
        ],
        [
            'jeton hors composition par l’injecteur',
            edit(TS, (text) =>
                text.replace(
                    'this.injector.get(PageComposition)',
                    'this.injector.get(Injector) as unknown as PageComposition'
                )
            ),
            `injector lookup forbidden in ${TS}: only composition tokens`,
        ],
        [
            'gabarit en ligne',
            edit(TS, (text) =>
                text.replace(
                    "templateUrl: './page.component.html',",
                    "template: '<p></p>',"
                )
            ),
            '@Component template is not allowed; use the page files',
        ],
        [
            'second décorateur',
            append(
                TS,
                "\n@Component({ selector: 'app-other', template: '' })\nexport class Other {}\n"
            ),
            'page.component.ts must declare exactly one @Component and no other decorator',
        ],
        [
            'décorateur hors composant',
            edit(
                TS,
                (text) =>
                    text.replace(
                        '    Injector,\n',
                        '    Injectable,\n    Injector,\n'
                    ) + '\n@Injectable()\nexport class Helper {}\n'
            ),
            'page.component.ts must declare exactly one @Component and no other decorator',
        ],
        [
            'gabarit hors page',
            edit(TS, (text) =>
                text.replace(
                    "templateUrl: './page.component.html',",
                    "templateUrl: './other.html',"
                )
            ),
            "@Component templateUrl must be './page.component.html'",
        ],
        [
            'styles hors page',
            edit(TS, (text) =>
                text.replace(
                    "styleUrl: './page.component.scss',",
                    "styleUrl: './other.scss',"
                )
            ),
            "@Component styleUrl must be './page.component.scss'",
        ],
        [
            'fournisseurs sans import de la composition',
            edit(TS, (text) =>
                text.replace('    PAGE_COMPOSITION_PROVIDERS,\n', '')
            ),
            'page does not mount its composition (PAGE_COMPOSITION_PROVIDERS in @Component providers)',
        ],
        [
            'table non constante',
            append(
                TS,
                '\nlet table: Record<string, number> = { a: 1 };\nexport const read = (k: string) => table[k];\n'
            ),
            `computed key without a literal type forbidden in ${TS}`,
        ],
        [
            'clé littérale refusée dans le gabarit',
            append(HTML, "<p>{{ fieldErrors()['location'] }}</p>\n"),
            `property access forbidden in ${HTML}: location`,
        ],
        [
            'clé hôte non permise',
            edit(TS, (text) =>
                text.replace(
                    "'(window:online)': 'online.set(true)',",
                    "'(window:online)': 'online.set(true)',\n        '[innerHTML]': 'announcement()',"
                )
            ),
            '@Component host key not allowed: "[innerHTML]"',
        ],
        [
            'expression hôte vers la fenêtre',
            edit(TS, (text) =>
                text.replace(
                    "'(window:online)': 'online.set(true)',",
                    "'(window:online)': '$any($event).target.location.reload()',"
                )
            ),
            `property access forbidden in ${TS} host: location`,
        ],
        [
            'identifiant dans page.component.ts',
            edit(TS, (text) =>
                text.replace(
                    "selector: 'app-",
                    "// data-cmz-id\n    selector: 'app-"
                )
            ),
            'data-cmz-id belongs to the template, not page.component.ts',
        ],
        // Globaux, propriétés, clés calculées, chaînes assemblées.
        [
            'global',
            append(TS, '\nvoid globalThis;\n'),
            `unresolved symbol in ${TS}: globalThis`,
        ],
        [
            'navigator hors onLine',
            append(TS, '\nvoid navigator.language;\n'),
            `symbol not allowed in ${TS}: dom NavigatorLanguage.language`,
        ],
        [
            'propriété refusée',
            append(
                TS,
                '\nexport const host = (event: Event) => event.composedPath();\n'
            ),
            `symbol not allowed in ${TS}: dom Event.composedPath`,
        ],
        [
            'clé littérale refusée',
            append(
                TS,
                "\nexport const host = (event: UIEvent) => event['view'];\n"
            ),
            `symbol not allowed in ${TS}: dom UIEvent.view`,
        ],
        [
            'clé calculée',
            append(
                TS,
                '\nexport const read = (x: Record<string, unknown>, k: string) => x[k];\n'
            ),
            `computed key without a literal type forbidden in ${TS}`,
        ],
        [
            'chaîne assemblée',
            append(TS, "\nexport const p = '/a' + 'b';\n"),
            `string assembled from literals forbidden in ${TS}`,
        ],
        [
            'gabarit de chaîne assemblé',
            append(TS, "\nexport const p = `/a${'b'}`;\n"),
            `string assembled from literals forbidden in ${TS}`,
        ],
        // Gabarit.
        [
            'élément script',
            append(HTML, '<script>1</script>\n'),
            `element forbidden in ${HTML}: <script>`,
        ],
        [
            'élément style',
            append(HTML, '<style>p{}</style>\n'),
            `element forbidden in ${HTML}: <style>`,
        ],
        [
            'attribut de ressource',
            append(HTML, '<img src="/x.png" alt="">\n'),
            `resource attribute forbidden in ${HTML}: src`,
        ],
        [
            'lien externe',
            append(HTML, '<a href="/x">x</a>\n'),
            `resource attribute forbidden in ${HTML}: href`,
        ],
        [
            'liaison HTML',
            append(HTML, '<p [innerHTML]="announcement()"></p>\n'),
            `property binding forbidden in ${HTML}: innerHTML`,
        ],
        [
            'liaison d’attribut hors aria',
            append(HTML, '<p [attr.title]="announcement()"></p>\n'),
            `attribute binding forbidden in ${HTML}: attr.title (aria-* only)`,
        ],
        [
            'identifiant lié, autre casse (M-1)',
            append(HTML, '<p [attr.Data-Cmz-Id]="announcement()"></p>\n'),
            `attribute binding forbidden in ${HTML}: attr.Data-Cmz-Id (aria-* only)`,
        ],
        [
            'identifiant lié en propriété',
            append(HTML, '<p [data-cmz-id]="announcement()"></p>\n'),
            `property binding forbidden in ${HTML}: data-cmz-id`,
        ],
        [
            'identifiant statique, autre casse (M-1)',
            append(HTML, '<p DATA-CMZ-ID="remember-me"></p>\n'),
            `data-cmz-id not declared by the page contract in ${HTML}: "remember-me"`,
        ],
        [
            'gestionnaire en ligne',
            append(HTML, '<p onclick="x()">x</p>\n'),
            `event handler attribute forbidden in ${HTML}: onclick`,
        ],
        [
            'lien de routeur hors application',
            append(HTML, '<a routerLink="//exemple.invalid">x</a>\n'),
            `routerLink must be an application path in ${HTML}: "//exemple.invalid"`,
        ],
        [
            'lien de routeur lié',
            append(HTML, '<a [routerLink]="announcement()">x</a>\n'),
            `property binding forbidden in ${HTML}: routerLink`,
        ],
        [
            'clé calculée dans le gabarit',
            append(HTML, '<p>{{ fieldErrors()[announcement()] }}</p>\n'),
            `computed member access forbidden in ${HTML}`,
        ],
        [
            'propriété refusée dans le gabarit',
            append(
                HTML,
                '<p (click)="$any($event).target.ownerDocument">x</p>\n'
            ),
            `property access forbidden in ${HTML}: ownerDocument`,
        ],
        [
            'gabarit illisible',
            append(HTML, '<p>{{ a( }}</p>\n'),
            /^template does not parse in page\.component\.html: Parser Error/,
        ],
        // Preuve.
        [
            'preuve incomplète',
            edit('realization-evidence.json', (text) => {
                const evidence = JSON.parse(text);
                evidence.states.pop();
                return JSON.stringify(evidence, null, 2) + '\n';
            }),
            '$.states: ids must match the page contract exactly',
        ],
        [
            'preuve illisible',
            { ...good, 'realization-evidence.json': '{' },
            'realization evidence is not JSON',
        ],
    ];
    for (const [label, files, expected] of cases) {
        const violations = violationsOf(files);
        if (expected instanceof RegExp)
            assert.ok(
                violations.some((violation) => expected.test(violation)),
                label
            );
        else
            assert.ok(
                violations.includes(expected),
                `${label} : ${violations.join(' | ')}`
            );
    }
    // Acceptés : apparence, fragment, image en ligne, chemin d'application,
    // table locale, onLine, frontière de segment du littéral.
    for (const [label, files] of [
        ['lien d’évitement', append(HTML, '<a href="#main">x</a>\n')],
        [
            'image en ligne',
            append(
                HTML,
                '<img src="data:image/svg+xml,%3Csvg%3E%3C/svg%3E" alt="">\n'
            ),
        ],
        ['lien de routeur', append(HTML, '<a routerLink="/aide">x</a>\n')],
        [
            'style lié',
            append(
                HTML,
                '<p [style.color]="announcement()" [class.x]="true">x</p>\n'
            ),
        ],
        [
            'segment voisin du littéral',
            append(SCSS, `\n/* ${literal}ibility */\n`),
        ],
    ])
        assert.deepEqual(violationsOf(files), [], label);
});

// Validation X4, X4-plan-publie : registre scellé et cohérent où le plan de
// page est attribué à un autre outil. Le bon de travail n'est pas préparé.
test('X4-sécurité : plan de page attribué à un autre outil sous registre scellé, refusé au montage', async (t) => {
    const product = await composedProduct(t, 'equipment-hire');
    const path = join(product.app, MANIFEST);
    const original = await readFile(path);
    const manifest = JSON.parse(original.toString('utf8'));
    manifest.ownership.publications.findLast((record) =>
        record.files.some((file) => file.path === pagePlanPath(product.pageId))
    ).tool = 'generate:page-composition';
    manifest.tree_sha256 = inventoryTreeSha(manifest.generated_files);
    manifest.ownership.seal_sha256 = computeOwnershipSeal(manifest);
    await writeFile(path, JSON.stringify(manifest, null, 2) + '\n');
    const before = await snapshotTree(product.root, []);
    await assert.rejects(
        planExternalPageRealizationWorkOrder(product.options),
        /page execution plan is not published/
    );
    assert.deepEqual(await snapshotTree(product.root, []), before);
    await writeFile(path, original);
    await planExternalPageRealizationWorkOrder(product.options);
});

// I-3 : une commande republiée après la page réalisée nomme la page comme
// réalisée, l'avertissement nomme prepare:/verify:page-realization, et le bon
// de travail périmé est refusé jusqu'à sa préparation.
test('X4-sécurité : page réalisée signalée quand sa commande est republiée (I-3)', async (t) => {
    const product = await composedProduct(t, 'observatory');
    await prepare(product);
    const workOrder = await workOrderOf(product);
    await writeDraft(product, workOrder, await realization(product, workOrder));
    await publish(
        planExternalPageRealization,
        publishExternalPageRealization,
        product.options
    );
    const definitionPath = join(product.root, product.action.definitionPath);
    const definition = JSON.parse(await readFile(definitionPath, 'utf8'));
    definition.feature.description =
        'Synthetic fixture, revised after the page.';
    await writeFile(definitionPath, JSON.stringify(definition, null, 2) + '\n');
    const plan = await planExternalActionRequest(product.action);
    assert.deepEqual(plan.dependent_pages, [
        { page_id: product.pageId, composition: true, realization: true },
    ]);
    const lines = [];
    const error = console.error;
    console.error = (line) => lines.push(line);
    try {
        dependentPagesNotice(plan.dependent_pages);
    } finally {
        console.error = error;
    }
    assert.deepEqual(lines, [
        `⚠ Pages qui consomment cette commande : ${product.pageId} (plan, composition, page réalisée). Après publication, relancer compile:page-execution-plan puis generate:page-composition pour chacune, puis prepare:page-realization et verify:page-realization --dry-run pour une page réalisée.`,
    ]);
    await publish(
        planExternalActionRequest,
        publishExternalActionRequest,
        product.action
    );
    await publish(
        planExternalPagePlan,
        publishExternalPagePlan,
        product.options
    );
    await publish(
        planExternalPageComposition,
        publishExternalPageComposition,
        product.options
    );
    await assert.rejects(
        planExternalPageRealization(product.options),
        /page realization work order is stale; prepare it again with prepare:page-realization/
    );
    // Bon de travail préparé à nouveau : les règles sont rejouées sur la page
    // publiée ; conforme, elle n'a rien à republier.
    await prepare(product);
    await assert.rejects(
        planExternalPageRealization(product.options),
        (failure) =>
            !failure.violations &&
            /publication without change/.test(failure.message)
    );
});
