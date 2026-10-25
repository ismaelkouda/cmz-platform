import assert from 'node:assert/strict';
import { cp, readFile, rename, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

import { parseArgs as parseBackendArgs } from '../compile-backend-contract.mjs';
import { parseArgs as parseDesignArgs } from '../compile-application-design.mjs';
import {
    planApplicationDesignPublication,
    publishApplicationDesign,
} from './core/application-design-publication.mjs';
import { sha256 } from './core/generation-manifest.mjs';
import {
    planStructuredBackendPublication,
    publishStructuredBackendContract,
} from './core/structured-backend-publication.mjs';
import { renderReactSpaShell } from './renderers/react-spa-shell-renderer.mjs';
import {
    snapshotTree,
    TOOLS_ROOT,
} from './test-support/external-application-fixture.mjs';
import {
    assertShellRouteDeclarations,
    backendArgs,
    compileDocumentFixture,
    designArgs,
    documentFixture,
    NATIVE_CELLS,
    proveNativeDocumentCell,
    runDocumentCli,
} from './test-support/external-document-fixture.mjs';

const backendOptions = (fixture, request = fixture.backendRequests.at(-1)) => ({
    workspaceRoot: TOOLS_ROOT,
    targetRoot: fixture.root,
    backendContractSchema: fixture.backendContractSchema,
    ...request,
});
const designOptions = (fixture) => ({
    workspaceRoot: TOOLS_ROOT,
    targetRoot: fixture.root,
    sourcePath: fixture.sourcePath,
    outputPath: fixture.designPath,
    applicationDesignSchema: fixture.applicationDesignSchema,
    backendContractSchema: fixture.backendContractSchema,
});
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

const nativeCell = process.env.CMZ_EXT03A_NATIVE_CELL;
if (nativeCell !== undefined) {
    if (
        !NATIVE_CELLS.includes(nativeCell) ||
        !process.env.CMZ_EXT03A_NATIVE_ROOT
    )
        throw new Error(
            'Explicit valid cell and owned native root are required'
        );
    test(`EXT03A/native/${nativeCell}`, async () => {
        const receipt = process.env.CMZ_EXT03A_NATIVE_CONTEXT
            ? await (
                  await import('./proof-support/external-document-native.mjs')
              ).provePreparedDocumentCell(
                  process.env.CMZ_EXT03A_NATIVE_ROOT,
                  nativeCell,
                  process.env.CMZ_EXT03A_NATIVE_CONTEXT
              )
            : await proveNativeDocumentCell(
                  process.env.CMZ_EXT03A_NATIVE_ROOT,
                  nativeCell
              );
        process.stdout.write(`${JSON.stringify(receipt)}\n`);
    });
} else {
    for (const [label, parse, args] of [
        [
            'backend',
            parseBackendArgs,
            [
                '--definition',
                'descriptions/source.json',
                '--out',
                'descriptions/out.json',
            ],
        ],
        [
            'design',
            parseDesignArgs,
            [
                '--source',
                'descriptions/source.json',
                '--out',
                'descriptions/out.json',
            ],
        ],
    ]) {
        test(`EXT03A/${label}/options unique and complete`, () => {
            assert.equal(
                parse([
                    ...args,
                    '--target-root',
                    '/fixture/product',
                    '--dry-run',
                ]).targetRoot,
                '/fixture/product'
            );
            for (const tail of [
                ['--target-root'],
                ['--target-root', '--dry-run'],
                ['--target-root', '/a', '--target-root', '/b', '--dry-run'],
                ['--dry-run', '--dry-run'],
                ['--unknown', '--dry-run'],
                ['--dry-run', '--apply', 'a'.repeat(64)],
            ])
                assert.throws(() => parse([...args, ...tail]));
        });
    }

    for (const kind of ['A', 'B']) {
        test(`EXT03A/${kind}/real CLI plan, publish, repeat and provenance`, async (t) => {
            const fixture = await documentFixture(t, kind);
            const before = await snapshotTree(fixture.root);
            for (const request of fixture.backendRequests) {
                const dry = runDocumentCli('compile-backend-contract', [
                    ...backendArgs(fixture, request),
                    '--dry-run',
                ]);
                assert.equal(dry.status, 0, dry.stderr);
                assert.equal(JSON.parse(dry.stdout).mode, 'external');
            }
            assert.deepEqual(await snapshotTree(fixture.root), before);
            const compiled = await compileDocumentFixture(fixture);
            for (const receipt of compiled.receipts) {
                const repeat = runDocumentCli(
                    receipt.tool,
                    receipt.apply.argv.slice(2)
                );
                assert.equal(repeat.status, 0, repeat.stderr);
            }
            const plan = await planApplicationDesignPublication(
                designOptions(fixture)
            );
            const paths = plan.compilation_context.inputs.map(
                (entry) => entry.path
            );
            assert.ok(paths.includes(fixture.sourcePath));
            for (const request of fixture.backendRequests) {
                assert.ok(paths.includes(request.definitionPath));
                assert.ok(paths.includes(request.outputPath));
                const contract = JSON.parse(
                    await readFile(
                        join(fixture.root, request.outputPath),
                        'utf8'
                    )
                );
                assert.equal(
                    contract.contract.status,
                    request.adapter === 'postman' ? 'reference' : 'planned'
                );
                assert.ok(
                    contract.sources.some(
                        (source) =>
                            source.snapshot_uri === request.definitionPath
                    )
                );
                assert.equal(
                    contract.operations[0].access.mode,
                    kind === 'B' ? 'authenticated' : 'public'
                );
            }
            assert.equal(plan.compilation_context.workspace_id.length, 64);
            assert.equal(
                plan.compilation_context.inputs.length,
                kind === 'A' ? 6 : 4
            );
            assert.equal(
                compiled.design.experiences[0].offline_policy,
                'shell-only'
            );
            assert.ok(!JSON.stringify(compiled.design).includes(fixture.root));
        });

        test(`EXT03A/${kind}/original React offline refusal and declared shell variant`, async (t) => {
            const fixture = await documentFixture(t, kind);
            await assert.rejects(
                renderReactSpaShell({
                    design: fixture.design,
                    experienceId: fixture.design.experiences[0].id,
                    appName: 'original-react',
                    designPath: fixture.designPath,
                    designSha256: sha256(json(fixture.design)),
                    externalWorkspace: true,
                }),
                /offline/i
            );
            const variant = await documentFixture(t, kind, { shell: true });
            assert.equal(variant.variant.changes.length, 1);
            assert.equal(variant.variant.changes[0].before, 'shell-only');
            assert.equal(variant.variant.changes[0].after, 'none');
            assert.deepEqual(variant.design.pages, fixture.design.pages);
            assert.deepEqual(
                variant.design.backend_contracts,
                fixture.design.backend_contracts
            );
        });
    }

    test('EXT03A/root binding rejects the same bytes in a second space', async (t) => {
        const a = await documentFixture(t, 'B');
        const b = await documentFixture(t, 'B');
        const planA = await planStructuredBackendPublication(backendOptions(a));
        const planB = await planStructuredBackendPublication(backendOptions(b));
        assert.equal(planA.output_sha256, planB.output_sha256);
        assert.notEqual(planA.plan_id, planB.plan_id);
        const before = await snapshotTree(b.root);
        await assert.rejects(
            publishStructuredBackendContract({
                ...backendOptions(b),
                planId: planA.plan_id,
            }),
            /stale|invalid/
        );
        assert.deepEqual(await snapshotTree(b.root), before);
    });

    test('EXT03A/physical root substitution invalidates a reviewed plan', async (t) => {
        const fixture = await documentFixture(t, 'B');
        const options = backendOptions(fixture);
        const plan = await planStructuredBackendPublication(options);
        await rename(fixture.root, fixture.root + '-moved');
        await cp(fixture.root + '-moved', fixture.root, {
            recursive: true,
            errorOnExist: true,
            force: false,
        });
        const before = await snapshotTree(fixture.root);
        await assert.rejects(
            publishStructuredBackendContract({
                ...options,
                planId: plan.plan_id,
            }),
            /stale|invalid/
        );
        assert.deepEqual(await snapshotTree(fixture.root), before);
    });

    test('EXT03A/real CLI rejects invalid roots and relative input escapes', async (t) => {
        const fixture = await documentFixture(t, 'B');
        const request = fixture.backendRequests[0];
        const before = await snapshotTree(fixture.root);
        for (const target of [
            'relative-root',
            '/',
            TOOLS_ROOT,
            fixture.root + '/..',
        ]) {
            const result = runDocumentCli('compile-backend-contract', [
                '--target-root',
                target,
                '--definition',
                request.definitionPath,
                '--out',
                request.outputPath,
                '--dry-run',
            ]);
            assert.notEqual(result.status, 0);
        }
        for (const path of [
            '../foreign.json',
            join(fixture.root, request.definitionPath),
            'package.json',
            '.cmz/foreign.json',
        ]) {
            await assert.rejects(
                planStructuredBackendPublication({
                    ...backendOptions(fixture),
                    definitionPath: path,
                })
            );
        }
        assert.deepEqual(await snapshotTree(fixture.root), before);
    });

    test('EXT03A/source ancestor link is rejected without publication', async (t) => {
        const fixture = await documentFixture(t, 'B');
        const contracts = join(fixture.root, fixture.prefix, 'contracts');
        await rename(contracts, contracts + '-source');
        await symlink(contracts + '-source', contracts);
        await assert.rejects(
            planStructuredBackendPublication(backendOptions(fixture)),
            /symbolic/
        );
    });

    test('EXT03A/marker and owned technical bytes are verified', async (t) => {
        const fixture = await documentFixture(t, 'B');
        const path = join(fixture.root, '.cmz/application-workspace.json');
        const original = await readFile(path);
        const marker = JSON.parse(original.toString('utf8'));
        marker.review_owner = 'different-reviewer';
        await writeFile(path, json(marker));
        await assert.rejects(
            planStructuredBackendPublication(backendOptions(fixture)),
            /ownership/
        );
        await writeFile(path, original);
        const owned = join(fixture.root, 'nx.json');
        await writeFile(owned, '{}\n');
        await assert.rejects(
            planStructuredBackendPublication(backendOptions(fixture)),
            /ownership/
        );
    });

    test('EXT03A/backend source drift and schema substitution cannot reuse a plan', async (t) => {
        const fixture = await documentFixture(t, 'B');
        const options = backendOptions(fixture);
        const plan = await planStructuredBackendPublication(options);
        const path = join(fixture.root, options.definitionPath);
        const bytes = await readFile(path);
        await writeFile(path, Buffer.concat([bytes, Buffer.from('\n')]));
        await assert.rejects(
            publishStructuredBackendContract({
                ...options,
                planId: plan.plan_id,
            }),
            /stale|invalid/
        );
        await writeFile(path, bytes);
        const schema = structuredClone(options.backendContractSchema);
        schema.description = 'different supplied schema';
        await assert.rejects(
            planStructuredBackendPublication({
                ...options,
                backendContractSchema: schema,
            }),
            /schema argument/
        );
    });

    test('EXT03A/design tracks its brief and transitive backend snapshots', async (t) => {
        const fixture = await documentFixture(t, 'B');
        await compileDocumentFixture(fixture);
        const options = designOptions(fixture);
        const plan = await planApplicationDesignPublication(options);
        for (const path of [
            fixture.design.sources[0].snapshot_uri,
            fixture.backendRequests[0].definitionPath,
        ]) {
            const absolute = join(fixture.root, path);
            const bytes = await readFile(absolute);
            await writeFile(
                absolute,
                Buffer.concat([bytes, Buffer.from('\n')])
            );
            await assert.rejects(
                publishApplicationDesign({ ...options, planId: plan.plan_id }),
                /snapshot|sha256|hash|digest/i
            );
            await writeFile(absolute, bytes);
        }
    });

    test('EXT03A/foreign output and candidate are preserved; exact candidate resumes', async (t) => {
        const fixture = await documentFixture(t, 'B');
        const options = backendOptions(fixture);
        const plan = await planStructuredBackendPublication(options);
        await writeFile(plan.candidate, 'foreign\n', { flag: 'wx' });
        await assert.rejects(
            publishStructuredBackendContract({
                ...options,
                planId: plan.plan_id,
            }),
            /candidate.*hash/
        );
        assert.equal(await readFile(plan.candidate, 'utf8'), 'foreign\n');
        await writeFile(plan.candidate, plan.content);
        const recovered = await publishStructuredBackendContract({
            ...options,
            planId: plan.plan_id,
        });
        assert.equal(recovered.already_published, false);
        await writeFile(plan.outputAbsolute, 'foreign output\n');
        await assert.rejects(
            publishStructuredBackendContract({
                ...options,
                planId: plan.plan_id,
            }),
            /output.*hash/
        );
        assert.equal(
            await readFile(plan.outputAbsolute, 'utf8'),
            'foreign output\n'
        );
    });

    test('EXT03A/output cannot replace a source, dependency or technical file', async (t) => {
        const fixture = await documentFixture(t, 'B');
        for (const outputPath of [
            fixture.backendRequests[0].definitionPath,
            'package.json',
            '.cmz/new.json',
            'apps/new.json',
        ]) {
            await assert.rejects(
                planStructuredBackendPublication({
                    ...backendOptions(fixture),
                    outputPath,
                })
            );
        }
        await compileDocumentFixture(fixture);
        await assert.rejects(
            planApplicationDesignPublication({
                ...designOptions(fixture),
                outputPath: fixture.design.sources[0].snapshot_uri,
            }),
            /dependency/
        );
    });

    test('EXT03A/reference cannot drive target and authenticated pages cannot become public', async (t) => {
        for (const kind of ['A', 'B']) {
            const fixture = await documentFixture(t, kind);
            await compileDocumentFixture(fixture);
            const mutated = structuredClone(fixture.design);
            if (kind === 'A')
                mutated.pages[0].actions[0].operation_ref.contract_id =
                    'reference-note-api';
            else mutated.pages[1].access.mode = 'public';
            await writeFile(
                join(fixture.root, fixture.sourcePath),
                json(mutated)
            );
            const result = runDocumentCli('compile-application-design', [
                ...designArgs(fixture),
                '--dry-run',
            ]);
            assert.notEqual(result.status, 0);
            assert.match(
                result.stderr,
                kind === 'A'
                    ? /reference backends cannot drive/
                    : /page access is weaker/
            );
        }
    });

    test('EXT03A/a required operation permission cannot disappear from its page', async (t) => {
        const fixture = await documentFixture(t, 'B');
        const request = fixture.backendRequests[0];
        const source = join(fixture.root, request.definitionPath);
        const definition = JSON.parse(await readFile(source, 'utf8'));
        definition.operations[0].access.mode = 'authorized';
        definition.operations[0].access.permissions = ['reports.create'];
        await writeFile(source, json(definition));
        const options = backendOptions(fixture);
        const plan = await planStructuredBackendPublication(options);
        await publishStructuredBackendContract({
            ...options,
            planId: plan.plan_id,
        });
        const design = structuredClone(fixture.design);
        design.backend_contracts[0].sha256 = plan.output_sha256;
        design.pages[1].access.mode = 'authorized';
        design.pages[1].access.permissions = [];
        await writeFile(join(fixture.root, fixture.sourcePath), json(design));
        const result = runDocumentCli('compile-application-design', [
            ...designArgs(fixture),
            '--dry-run',
        ]);
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /permission/i);
    });

    test('EXT03A/omitted target keeps workshop plans independent of workspace identity', async (t) => {
        const a = await documentFixture(t, 'B');
        const b = await documentFixture(t, 'B');
        const optionsA = {
            ...backendOptions(a),
            workspaceRoot: a.root,
            targetRoot: undefined,
        };
        const optionsB = {
            ...backendOptions(b),
            workspaceRoot: b.root,
            targetRoot: undefined,
        };
        const planA = await planStructuredBackendPublication(optionsA);
        const planB = await planStructuredBackendPublication(optionsB);
        assert.equal(planA.plan_id, planB.plan_id);
        assert.equal(planA.compilation_context, undefined);
        assert.equal(planA.output_sha256, a.backendRequests[0].expectedSha256);
        const published = await publishStructuredBackendContract({
            ...optionsA,
            planId: planA.plan_id,
        });
        assert.equal(published.already_published, false);
    });

    test('EXT03A/route oracle rejects a missing native guard in each target', () => {
        const pages = [
            {
                path: '/report',
                access: { mode: 'authenticated', permissions: [] },
            },
        ];
        const angular =
            "const routes = [{path:'report', data:{access:{mode:'authenticated',permissions:[]}}, canActivate:[appAccessGuard]}];";
        const react =
            'const routes = <Route path="/report" element={<AppAccessGate policy={{mode:"authenticated",permissions:[]}}><Page /></AppAccessGate>} />;';
        assertShellRouteDeclarations(angular, 'angular-pwa', pages);
        assertShellRouteDeclarations(react, 'react-spa', pages);
        assert.throws(() =>
            assertShellRouteDeclarations(
                angular.replace(
                    'canActivate:[appAccessGuard]',
                    'canActivate:[]'
                ),
                'angular-pwa',
                pages
            )
        );
        assert.throws(() =>
            assertShellRouteDeclarations(
                react.replace(
                    '<AppAccessGate policy={{mode:"authenticated",permissions:[]}}><Page /></AppAccessGate>',
                    '<Page />'
                ),
                'react-spa',
                pages
            )
        );
    });
}
