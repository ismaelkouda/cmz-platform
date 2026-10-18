import assert from 'node:assert/strict';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

import { EXTERNAL_WORKSPACE_CMZ as CMZ } from '../renderers/application-workspace-renderer.mjs';
import {
    assertPhysicalPath,
    assertSourceWeight,
    isWithin,
    pathExists,
    readProductFile,
} from '../core/external-application-paths.mjs';
import {
    hash,
    TOOLS_ROOT,
} from '../test-support/external-application-fixture.mjs';
import {
    compilerArguments,
    confinedNode,
    qualifyNodeVersion,
    record,
    targetArguments,
} from './external-application-runtime.mjs';

async function fileMutation(
    session,
    product,
    path,
    transform,
    run,
    diagnostic
) {
    const original = await readProductFile(product, path);
    const target = resolve(product, path);
    const label = `mutation/${path}`;
    record(session, `${label}/before`, await run());
    let failure;
    try {
        const changed = transform(original.toString('utf8'));
        assert.notEqual(
            changed,
            original.toString('utf8'),
            'Mutation sans effet'
        );
        await writeFile(target, changed);
        record(session, `${label}/red`, await run(), {
            negative: true,
            diagnostic,
        });
    } catch (error) {
        failure = error;
    } finally {
        await writeFile(target, original);
    }
    assert.equal(hash(await readProductFile(product, path)), hash(original));
    record(session, `${label}/restored`, await run());
    await session.save();
    if (failure) throw failure;
}

export async function displacedEntry(session, product, path, run, diagnostic) {
    const source = resolve(product, path);
    assert.ok(isWithin(product, source));
    await assertPhysicalPath(dirname(source));
    const holdingRoot = resolve(session.root, 'displaced');
    await mkdir(holdingRoot, { recursive: true });
    const holding = resolve(holdingRoot, hash(path));
    assert.equal(await pathExists(holding), false);
    const label = `missing/${path}`;
    record(session, `${label}/before`, await run());
    let failure;
    try {
        await rename(source, holding);
        record(session, `${label}/red`, await run(), {
            negative: true,
            diagnostic,
        });
    } catch (error) {
        failure = error;
    } finally {
        await rename(holding, source);
    }
    record(session, `${label}/restored`, await run());
    await session.save();
    if (failure) throw failure;
}

export async function qualifyMutations(session, product, plan) {
    const angular = plan.profile === 'angular-pwa';
    const publicPage = Object.keys(plan.files).find(
        (path) =>
            path.startsWith('src/app/pages/') &&
            path.endsWith(angular ? 'page.component.ts' : 'page.tsx')
    );
    assert.ok(publicPage, 'Page de fixture absente');
    const compile = () =>
        confinedNode(session, product, compilerArguments(plan));
    const lint = () =>
        confinedNode(session, product, targetArguments(plan, 'lint'));
    const unit = () =>
        confinedNode(session, product, targetArguments(plan, 'test'));
    await fileMutation(
        session,
        product,
        `${plan.output}/${publicPage}`,
        (value) => value + '\nexport const typeMutation: string = 1;\n',
        compile,
        /TS2322/
    );
    await fileMutation(
        session,
        product,
        `${plan.output}/${publicPage}`,
        (value) => value + '\nconsole.log("fictitious lint mutation");\n',
        lint,
        /no-console/
    );
    await fileMutation(
        session,
        product,
        `${plan.output}/${publicPage}`,
        (value) =>
            value +
            '\nexport function anyMutation(value: any) { return value; }\n',
        lint,
        /no-explicit-any/
    );
    await fileMutation(
        session,
        product,
        `${plan.output}/${publicPage}`,
        (value) => '/* eslint-disable no-debugger */\n' + value,
        lint,
        /Unused eslint-disable directive/
    );
    if (angular) {
        await fileMutation(
            session,
            product,
            `${plan.output}/${publicPage}`,
            (value) =>
                value.replace('</h1>', '</h1>{{ missingTemplateMember }}'),
            compile,
            /missingTemplateMember/
        );
    }
    const spec = `${plan.output}/src/app/${angular ? 'access.guard.spec.ts' : 'access-policy.spec.ts'}`;
    await fileMutation(
        session,
        product,
        spec,
        (value) =>
            value + '\nit("mutation-test", () => expect(true).toBe(false));\n',
        unit,
        /mutation-test/
    );
    await displacedEntry(
        session,
        product,
        `${plan.output}/tsconfig.app.json`,
        compile,
        /tsconfig.app.json/
    );
    await displacedEntry(
        session,
        product,
        'tsconfig.base.json',
        compile,
        /tsconfig.base.json/
    );
    await displacedEntry(
        session,
        product,
        `${plan.output}/eslint.config.mjs`,
        lint,
        /eslint.config|config file/
    );
    const dependency = angular ? '@angular/core' : '@vitejs/plugin-react';
    const dependencyCheck = angular
        ? compile
        : () =>
              confinedNode(
                  session,
                  product,
                  targetArguments(plan, 'build:production')
              );
    await displacedEntry(
        session,
        product,
        `node_modules/${dependency}`,
        dependencyCheck,
        new RegExp(dependency.replaceAll('/', '\\/'))
    );
    if (angular) {
        await displacedEntry(
            session,
            product,
            `${CMZ.support}/angular-unit-test.config.mjs`,
            unit,
            /angular-unit-test.config/
        );
    } else {
        await displacedEntry(
            session,
            product,
            `${plan.output}/vite.config.mts`,
            dependencyCheck,
            /vite.config/
        );
    }
}

export async function instrumentProduct(session, product, browserFixture) {
    const proof = resolve(product, CMZ.proof);
    assert.equal(await pathExists(proof), false);
    const witness = resolve(session.root, 'outside-candidate-witness');
    await writeFile(witness, 'outside candidate\n', { flag: 'wx' });
    const files = {
        'browser.fixture.json': JSON.stringify(browserFixture),
        'confinement.mjs': `import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const source = ${JSON.stringify(TOOLS_ROOT)};
const require = createRequire(import.meta.url);
for (const root of [source, '/cmz-repository-0']) {
    let readable = false;
    try { readFileSync(root + '/package.json'); readable = true; } catch {}
    assert.equal(readable, false, 'Lecture atelier autorisée');
    let resolved = false;
    try { require.resolve('exceljs', { paths: [root] }); resolved = true; } catch {}
    assert.equal(resolved, false, 'Résolution atelier autorisée');
}
let writable = false;
try { writeFileSync(${JSON.stringify(witness)}, 'changed'); writable = true; } catch {}
assert.equal(writable, false, 'Écriture extérieure autorisée');
process.stdout.write('Confinement : lectures/résolution/écriture refusées.\\n');
`,
    };
    await mkdir(proof);
    for (const [path, content] of Object.entries(files)) {
        await writeFile(resolve(proof, path), content, { flag: 'wx' });
        session.lines.push(`instrumentation=${path} sha256=${hash(content)}`);
    }
    assert.equal(
        await pathExists(
            resolve(TOOLS_ROOT, 'node_modules/exceljs/package.json')
        ),
        true
    );
    record(
        session,
        'T11/real-filesystem-probes',
        confinedNode(session, product, [`${CMZ.proof}/confinement.mjs`])
    );
    assert.equal(await readFile(witness, 'utf8'), 'outside candidate\n');
    record(
        session,
        'T11/product-input-closure',
        confinedNode(session, product, [`${CMZ.support}/check-workspace.mjs`])
    );
    return { proof, files };
}

export async function qualifyBrowser(session, product, plans, browser) {
    qualifyNodeVersion(session, product, { browser });
    const fixturePath = resolve(product, `${CMZ.proof}/browser.fixture.json`);
    const browserRelative = relative(browser.root, browser.executable)
        .split('\\')
        .join('/');
    for (const plan of plans) {
        const angular = plan.profile === 'angular-pwa';
        const build = () =>
            record(
                session,
                `T18/build/${plan.profile}`,
                confinedNode(
                    session,
                    product,
                    targetArguments(plan, 'build:production')
                )
            );
        const smoke = () =>
            confinedNode(
                session,
                product,
                [
                    `${CMZ.support}/browser-smoke.mjs`,
                    resolve(
                        product,
                        'dist',
                        plan.output,
                        ...(angular ? ['browser'] : [])
                    ),
                    `{{readonly:0}}/${browserRelative}`,
                    fixturePath,
                ],
                { browser, timeoutMs: 120_000 }
            );
        build();
        record(session, `T18/browser/${plan.profile}`, smoke());
        const page = Object.keys(plan.files).find(
            (path) =>
                path.startsWith('src/app/pages/') &&
                path.endsWith(angular ? 'page.component.ts' : 'page.tsx')
        );
        await fileMutation(
            session,
            product,
            `${plan.output}/${page}`,
            (value) => value.replace('<h1', '<h1 hidden'),
            () => {
                build();
                return smoke();
            },
            /Accueil fictif/
        );
        const guard = angular
            ? 'src/app/app.routes.ts'
            : 'src/app/access-policy.tsx';
        await fileMutation(
            session,
            product,
            `${plan.output}/${guard}`,
            (value) =>
                angular
                    ? value.replace(/canActivate:\s*\[appAccessGuard\],?/g, '')
                    : value.replace(
                          'if (evaluateAppAccess(policy, decision)) return children;',
                          'if (true) return children;'
                      ),
            () => {
                build();
                return smoke();
            },
            /La garde doit refuser/
        );
    }
}

export async function qualifyWeights(session, product) {
    await assertSourceWeight(product);
    const toolCandidate = resolve(session.root, 'tool-weight-candidate');
    await mkdir(toolCandidate);
    for (const root of [toolCandidate, product]) {
        const path = resolve(root, 'untracked-weight.mts');
        assert.equal(await pathExists(path), false);
        await assertSourceWeight(root);
        let rejected = false;
        await writeFile(path, 'export {};\n'.repeat(801), { flag: 'wx' });
        try {
            await assertSourceWeight(root);
        } catch (error) {
            if (!error.message.includes('source weight')) throw error;
            rejected = true;
        } finally {
            await rm(path);
        }
        assert.equal(rejected, true, 'Le contrôle de poids accepte 801 lignes');
        await assertSourceWeight(root);
    }
    session.lines.push('PASS T14/source-and-product-untracked-801');
    await session.save();
}
