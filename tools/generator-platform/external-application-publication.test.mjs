// X1 (ADR-0103) : inventaire d'application scellé et publications sous plan.
// Le runner injecté ne compile rien : la chaîne native est prouvée par
// check:external-application-shells.
import assert from 'node:assert/strict';
import {
    cp,
    mkdir,
    readdir,
    readFile,
    rename,
    rm,
    writeFile,
} from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

import { planApplicationShell } from './core/application-shell-publication.mjs';
import {
    planExternalApplicationShell,
    publishExternalApplicationShell,
} from './core/application-workspace.mjs';
import {
    computeOwnershipSeal,
    verifyApplicationOwnership,
} from './core/application-ownership.mjs';
import {
    planApplicationPublication,
    publishApplicationPublication,
    recoverApplicationPublication,
} from './core/application-publication.mjs';
import { pathExists } from './core/external-application-paths.mjs';
import { sha256 } from './core/generation-manifest.mjs';
import {
    installMetadataOnly,
    prepareFixture,
    schemas,
    snapshotTree,
    TOOLS_ROOT,
} from './test-support/external-application-fixture.mjs';
import {
    SESSION_FIXTURE_DOMAINS,
    sessionShellOptions,
    writeExternalSessionDesign,
} from './test-support/external-session-fixture.mjs';

const MANIFEST = '.cmz/app-manifest.json';
const NOTICE = 'src/app/generated/x1-proof/notice.ts';

async function sessionApp(t, domain) {
    const fixture = await prepareFixture(t);
    const input = await writeExternalSessionDesign(fixture.root, domain);
    await installMetadataOnly(fixture.plan);
    const shell = sessionShellOptions(input);
    const plan = await planExternalApplicationShell(shell);
    await publishExternalApplicationShell(
        { ...shell, expectedPlanId: plan.plan_id },
        { run: () => undefined }
    );
    const app = join(fixture.root, 'apps', shell.appName);
    const page = `src/app/pages/${input.entryPage.id}/page.component.ts`;
    return {
        ...fixture,
        input,
        shell,
        app,
        page,
        workspaceId: plan.workspace.manifest.workspace_id,
        base: {
            workspaceRoot: TOOLS_ROOT,
            targetRoot: fixture.root,
            appName: shell.appName,
        },
    };
}

const readManifest = async (app) =>
    JSON.parse(await readFile(join(app, MANIFEST), 'utf8'));

function publication(product, files, tool = 'generate:action-request') {
    return { ...product.base, tool, files };
}

async function publish(options, dependencies = {}) {
    const plan = await planApplicationPublication(options);
    const labels = [];
    const result = await publishApplicationPublication(
        { ...options, expectedPlanId: plan.plan_id },
        {
            run: (command, args, cwd) => {
                assert.equal(command, process.execPath);
                assert.equal(cwd, options.targetRoot);
                assert.ok(args[0].startsWith(options.targetRoot + '/'));
                labels.push(
                    args[0].endsWith('check-workspace.mjs')
                        ? 'workspace-contract'
                        : args[1] === 'run'
                          ? args[2]
                          : 'native-compiler'
                );
            },
            ...dependencies,
        }
    );
    return { plan, result, labels };
}

const replacedPage = (title) =>
    `import { ChangeDetectionStrategy, Component } from '@angular/core';\n\n@Component({\n    changeDetection: ChangeDetectionStrategy.OnPush,\n    selector: 'app-x1-page',\n    template: '<h1>${title}</h1>',\n})\nexport class PageComponent {}\n`;

test('X1 : create-app --target-root scelle le manifeste d’application au produit', async (t) => {
    for (const domain of SESSION_FIXTURE_DOMAINS) {
        const product = await sessionApp(t, domain);
        const manifest = await readManifest(product.app);
        assert.equal(manifest.ownership.workspace_id, product.workspaceId);
        assert.equal(
            manifest.ownership.shell_tree_sha256,
            manifest.tree_sha256
        );
        assert.deepEqual(manifest.ownership.publications, []);
        assert.equal(
            manifest.ownership.seal_sha256,
            computeOwnershipSeal(manifest)
        );
        verifyApplicationOwnership(manifest, product.workspaceId);
    }
});

test('X1 : ajout et remplacement déclarés acceptés, sous plan, sur deux produits fictifs', async (t) => {
    for (const domain of SESSION_FIXTURE_DOMAINS) {
        const product = await sessionApp(t, domain);
        const workshopBefore = await snapshotTree(TOOLS_ROOT);
        const options = publication(product, {
            [NOTICE]: `export const X1_NOTICE = '${domain}';\n`,
            [product.page]: replacedPage(domain),
        });
        const { plan, result, labels } = await publish(options);
        assert.equal(result.recovered, false);
        assert.deepEqual(labels, [
            'native-compiler',
            `${product.shell.appName}:build:production`,
            `${product.shell.appName}:lint`,
            `${product.shell.appName}:test`,
            'workspace-contract',
        ]);
        assert.deepEqual(
            plan.changes.map(({ path, change }) => [path, change]),
            [
                [NOTICE, 'added'],
                [product.page, 'replaced'],
            ].sort(([left], [right]) => (left < right ? -1 : 1))
        );
        const manifest = await readManifest(product.app);
        const [record] = manifest.ownership.publications;
        assert.equal(record.plan_id, plan.plan_id);
        assert.equal(record.tool, 'generate:action-request');
        const replaced = record.files.find(
            (file) => file.change === 'replaced'
        );
        assert.equal(
            replaced.before.sha256,
            sha256(plan.previousFiles[product.page])
        );
        assert.equal(
            await readFile(join(product.app, NOTICE), 'utf8'),
            `export const X1_NOTICE = '${domain}';\n`
        );
        for (const name of await readdir(join(product.root, 'apps')))
            assert.doesNotMatch(
                name,
                /candidate/,
                'Aucun reste de publication'
            );
        // L'état publié reste vérifiable et une seconde publication s'enchaîne.
        const second = await publish(
            publication(product, {
                [NOTICE]: `export const X1_NOTICE = '${domain}-2';\n`,
            })
        );
        assert.equal(second.plan.changes[0].change, 'replaced');
        assert.equal(
            (await readManifest(product.app)).ownership.publications.length,
            2
        );
        await planExternalApplicationShell({
            ...product.shell,
            appName: `${product.shell.appName}-b`,
        });
        assert.deepEqual(await snapshotTree(TOOLS_ROOT), workshopBefore);
    }
});

test('X1 : plan obligatoire, périmé ou rejoué', async (t) => {
    const product = await sessionApp(t, 'observatory');
    const options = publication(product, { [NOTICE]: 'export {};\n' });
    await assert.rejects(
        publishApplicationPublication(options, { run: () => assert.fail() }),
        /publication requires a reviewed plan/
    );
    const plan = await planApplicationPublication(options);
    await assert.rejects(
        publishApplicationPublication(
            { ...options, expectedPlanId: 'f'.repeat(64) },
            { run: () => assert.fail() }
        ),
        /reviewed publication plan is stale/
    );
    const done = await publishApplicationPublication(
        { ...options, expectedPlanId: plan.plan_id },
        { run: () => undefined }
    );
    assert.equal(done.recovered, false);
    const before = await snapshotTree(product.root, []);
    const again = await publishApplicationPublication(
        { ...options, expectedPlanId: plan.plan_id },
        { run: () => assert.fail('Republication') }
    );
    assert.equal(again.recovered, true);
    assert.deepEqual(await snapshotTree(product.root, []), before);
});

test('X1 : zones non déclarées et changements vides refusés avant toute écriture', async (t) => {
    const product = await sessionApp(t, 'equipment-hire');
    const before = await snapshotTree(product.root, []);
    const cases = [
        [{ 'project.json': '{}\n' }, /outside declared zones/],
        [
            { 'src/app/session/extra.ts': 'export {};\n' },
            /outside declared zones/,
        ],
        [{ 'src/app/app.routes.ts': 'export {};\n' }, /outside declared zones/],
        [{ '.cmz/libraries.json': '{}\n' }, /outside declared zones/],
        [
            { 'src/app/pages/page-absente/page.ts': 'export {};\n' },
            /outside declared zones/,
        ],
        [
            { 'src/app/generated/.hidden.ts': 'export {};\n' },
            /outside declared zones/,
        ],
        [{ '../escape.ts': 'export {};\n' }, /external application:/],
    ];
    for (const [files, pattern] of cases)
        await assert.rejects(
            planApplicationPublication(publication(product, files)),
            pattern
        );
    const current = await readFile(join(product.app, product.page), 'utf8');
    await assert.rejects(
        planApplicationPublication(
            publication(product, { [product.page]: current })
        ),
        /publication without change/
    );
    await assert.rejects(
        planApplicationPublication(
            publication(product, { [NOTICE]: 'x' }, 'outil-inconnu')
        ),
        /publication tool is not declared/
    );
    assert.deepEqual(await snapshotTree(product.root, []), before);
});

test('X1 : fichier ajouté à la main, octet modifié et zone racine non déclarée refusés', async (t) => {
    const product = await sessionApp(t, 'observatory');
    const options = publication(product, { [NOTICE]: 'export {};\n' });
    const hand = join(product.app, 'src/app/generated/hand.ts');
    await mkdir(join(product.app, 'src/app/generated'), { recursive: true });
    await writeFile(hand, 'export const hand = 1;\n', { flag: 'wx' });
    await assert.rejects(
        planApplicationPublication(options),
        /generated inventory drift/
    );
    await rm(join(product.app, 'src/app/generated'), { recursive: true });
    const path = join(product.app, product.page);
    const original = await readFile(path);
    await writeFile(path, Buffer.concat([original, Buffer.from(' ')]));
    await assert.rejects(planApplicationPublication(options), /drift/);
    await writeFile(path, original);
    await mkdir(join(product.root, '.github'));
    await assert.rejects(
        planApplicationPublication(options),
        /unowned workspace directory/
    );
    await rm(join(product.root, '.github'), { recursive: true });
    await planApplicationPublication(options);
});

test('X1 : registre falsifié refusé sous toutes ses formes (constat I-2)', async (t) => {
    const product = await sessionApp(t, 'equipment-hire');
    const options = publication(product, { [NOTICE]: 'export {};\n' });
    const manifestPath = join(product.app, MANIFEST);
    const original = await readFile(manifestPath);
    const handText = 'export const hand = 1;\n';
    const hand = join(product.app, 'src/app/generated/hand.ts');
    await mkdir(join(product.app, 'src/app/generated'), { recursive: true });
    await writeFile(hand, handText, { flag: 'wx' });
    const forge = async (change) => {
        const manifest = JSON.parse(original.toString('utf8'));
        change(manifest);
        await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    };
    const listHand = (manifest) => {
        manifest.generated_files = [
            ...manifest.generated_files,
            {
                path: 'src/app/generated/hand.ts',
                bytes: handText.length,
                sha256: sha256(handText),
            },
        ].sort((left, right) => left.path.localeCompare(right.path));
        manifest.tree_sha256 = sha256(
            manifest.generated_files
                .map((entry) => `${entry.path}\0${entry.sha256}`)
                .join('\0')
        );
    };
    const reseal = (manifest) => {
        manifest.ownership.seal_sha256 = computeOwnershipSeal(manifest);
    };
    const forgeries = [
        // I-2 exact : inventaire édité avec la bonne empreinte du fichier.
        [listHand, /app ownership seal mismatch/],
        // Sceau retiré : aucun retour silencieux à l'auto-déclaration.
        [
            (m) => {
                listHand(m);
                delete m.ownership;
            },
            /app ownership seal missing/,
        ],
        // Sceau recalculé mais aucune publication n'explique le fichier.
        [
            (m) => {
                listHand(m);
                reseal(m);
            },
            /not explained by sealed publications/,
        ],
        // Publication inventée hors zone, sceau recalculé.
        [
            (m) => {
                m.ownership.publications.push({
                    plan_id: 'a'.repeat(64),
                    tool: 'generate:action-request',
                    files: [
                        {
                            path: 'project.json',
                            change: 'replaced',
                            sha256: 'b'.repeat(64),
                            bytes: 1,
                            before: m.generated_files.find(
                                (e) => e.path === 'project.json'
                            ) && {
                                sha256: m.generated_files.find(
                                    (e) => e.path === 'project.json'
                                ).sha256,
                                bytes: m.generated_files.find(
                                    (e) => e.path === 'project.json'
                                ).bytes,
                            },
                        },
                    ],
                });
                const entry = m.generated_files.find(
                    (e) => e.path === 'project.json'
                );
                entry.sha256 = 'b'.repeat(64);
                entry.bytes = 1;
                m.tree_sha256 = sha256(
                    m.generated_files
                        .map((e) => `${e.path}\0${e.sha256}`)
                        .join('\0')
                );
                reseal(m);
            },
            /outside declared zones/,
        ],
        // Manifeste lié à un autre produit.
        [
            (m) => {
                m.ownership.workspace_id = 'c'.repeat(64);
                reseal(m);
            },
            /bound to another workspace/,
        ],
    ];
    for (const [change, pattern] of forgeries) {
        await forge(change);
        await assert.rejects(planApplicationPublication(options), pattern);
        await assert.rejects(
            planExternalApplicationShell({
                ...product.shell,
                appName: 'other',
            }),
            pattern
        );
    }
    await writeFile(manifestPath, original);
    await rm(join(product.app, 'src/app/generated'), { recursive: true });
    await planApplicationPublication(options);
});

test('X1 : échec natif après échange, reprise d’une interruption, aucun reste', async (t) => {
    const product = await sessionApp(t, 'observatory');
    const options = publication(product, { [NOTICE]: 'export {};\n' });
    const before = await snapshotTree(product.root, []);
    for (const failing of [
        'candidate-staged',
        'compiled',
        'published',
        'lint',
        'test',
        'verified',
    ]) {
        const plan = await planApplicationPublication(options);
        await assert.rejects(
            publishApplicationPublication(
                { ...options, expectedPlanId: plan.plan_id },
                {
                    run: () => undefined,
                    phase: (name) => {
                        if (name === failing)
                            throw new Error(`injected ${name}`);
                    },
                }
            ),
            new RegExp(`injected ${failing}`)
        );
        assert.deepEqual(await snapshotTree(product.root, []), before, failing);
    }
    // Interruption après échange : arbre neuf en place, ancien mis de côté.
    const plan = await planApplicationPublication(options);
    await assert.rejects(
        publishApplicationPublication(
            { ...options, expectedPlanId: plan.plan_id },
            {
                run: () => undefined,
                phase: async (name) => {
                    if (name !== 'published') return;
                    // Simule un arrêt brutal : on recopie l'état interrompu.
                    await cp(
                        product.app,
                        join(product.root, 'interrupted-new'),
                        { recursive: true }
                    );
                    await cp(
                        plan.previous,
                        join(product.root, 'interrupted-old'),
                        { recursive: true }
                    );
                    throw new Error('stop');
                },
            }
        ),
        /stop/
    );
    await rename(product.app, join(product.root, 'apps', '.discard'));
    await rm(join(product.root, 'apps', '.discard'), { recursive: true });
    await rename(join(product.root, 'interrupted-new'), product.app);
    await rename(join(product.root, 'interrupted-old'), plan.previous);
    assert.equal(
        (await readManifest(product.app)).ownership.publications.length,
        1
    );
    assert.deepEqual(await recoverApplicationPublication(options), {
        recovered: true,
    });
    assert.deepEqual(await snapshotTree(product.root, []), before);
    assert.equal(await pathExists(plan.previous), false);
});

test('X1 : application extérieure non scellée refusée ; mode atelier inchangé', async (t) => {
    const product = await sessionApp(t, 'equipment-hire');
    const manifestPath = join(product.app, MANIFEST);
    const manifest = await readManifest(product.app);
    const { ownership: _ownership, ...unsealed } = manifest;
    void _ownership;
    await writeFile(manifestPath, JSON.stringify(unsealed, null, 2) + '\n');
    await assert.rejects(
        planApplicationPublication(
            publication(product, { [NOTICE]: 'export {};\n' })
        ),
        /app ownership seal missing/
    );
    const loaded = await schemas();
    const atelier = await planApplicationShell({
        workspaceRoot: TOOLS_ROOT,
        designPath:
            'designs/application-conception-proof.application-design.json',
        experienceId: 'visitor-web',
        appName: 'x1-atelier-mode',
        profile: 'angular-pwa',
        ...loaded,
    });
    const atelierManifest = JSON.parse(atelier.files[MANIFEST]);
    assert.equal(atelierManifest.ownership, undefined);
    assert.equal(atelier.external_workspace, undefined);
});

test('X1 : la reprise ne retire jamais un arbre inexact', async (t) => {
    const product = await sessionApp(t, 'equipment-hire');
    const options = publication(product, { [NOTICE]: 'export {};\n' });
    const plan = await planApplicationPublication(options);
    // Candidat partiel exact du plan courant : retiré.
    await mkdir(join(plan.candidate, '.cmz'), { recursive: true });
    await writeFile(join(plan.candidate, MANIFEST), plan.files[MANIFEST], {
        flag: 'wx',
    });
    assert.deepEqual(await recoverApplicationPublication(options), {
        recovered: true,
    });
    assert.equal(await pathExists(plan.candidate), false);
    // Candidat modifié : conservé, reprise refusée.
    await mkdir(plan.candidate);
    await writeFile(join(plan.candidate, 'etranger.txt'), 'garder\n');
    await assert.rejects(
        recoverApplicationPublication(options),
        /ambiguous interrupted publication/
    );
    assert.equal(
        await readFile(join(plan.candidate, 'etranger.txt'), 'utf8'),
        'garder\n'
    );
    await rm(plan.candidate, { recursive: true });
    // Nouvel arbre modifié après l'échange : rien n'est déplacé.
    await cp(product.app, plan.previous, { recursive: true });
    await writeFile(join(product.app, product.page), 'modifié à la main\n');
    await assert.rejects(
        recoverApplicationPublication(options),
        /ambiguous interrupted publication/
    );
    assert.equal(
        await readFile(join(product.app, product.page), 'utf8'),
        'modifié à la main\n'
    );
    assert.equal(await pathExists(plan.previous), true);
});
