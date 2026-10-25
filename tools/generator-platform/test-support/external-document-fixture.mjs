import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import ts from 'typescript';

import {
    planApplicationWorkspace,
    planExternalApplicationShell,
    publishExternalApplicationShell,
} from '../core/application-workspace.mjs';
import {
    readProductFile,
    verifyGeneratedTree,
} from '../core/external-application-paths.mjs';
import { sha256 } from '../core/generation-manifest.mjs';
import { serializeCanonicalBackendContract } from '../core/structured-backend-adapter.mjs';
import { writeApplicationDesignFixture } from './application-design-fixture.mjs';
import {
    prepareFixture,
    schemas,
    TOOLS_ROOT,
} from './external-application-fixture.mjs';

export const DOCUMENT_CASES = ['A', 'B'];
export const NATIVE_CELLS = [
    'A/angular-pwa',
    'A/react-spa',
    'B/angular-pwa',
    'B/react-spa',
];

const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);

function property(object, name) {
    assert.ok(object && ts.isObjectLiteralExpression(object));
    return object.properties.find(
        (item) => ts.isPropertyAssignment(item) && item.name.text === name
    )?.initializer;
}

function stringValue(value) {
    assert.ok(value && ts.isStringLiteralLike(value));
    return value.text;
}

function accessPolicy(value) {
    const permissions = property(value, 'permissions');
    assert.ok(permissions && ts.isArrayLiteralExpression(permissions));
    return {
        mode: stringValue(property(value, 'mode')),
        permissions: permissions.elements.map(stringValue),
    };
}

export function assertShellRouteDeclarations(text, profile, pages) {
    const angular = profile === 'angular-pwa';
    const source = ts.createSourceFile(
        angular ? 'routes.ts' : 'routes.tsx',
        text,
        ts.ScriptTarget.Latest,
        true,
        angular ? ts.ScriptKind.TS : ts.ScriptKind.TSX
    );
    assert.equal(source.parseDiagnostics.length, 0);
    const routes = [];
    const attribute = (node, name) =>
        node.attributes.properties.find(
            (item) => ts.isJsxAttribute(item) && item.name.text === name
        )?.initializer;
    const visit = (node) => {
        if (angular && ts.isObjectLiteralExpression(node)) {
            const path = property(node, 'path');
            if (path && ts.isStringLiteralLike(path) && path.text !== '**') {
                const guards = property(node, 'canActivate');
                routes.push({
                    path: path.text === '' ? '/' : `/${path.text}`,
                    access: accessPolicy(
                        property(property(node, 'data'), 'access')
                    ),
                    guarded: Boolean(
                        guards &&
                        ts.isArrayLiteralExpression(guards) &&
                        guards.elements.some(
                            (item) =>
                                ts.isIdentifier(item) &&
                                item.text === 'appAccessGuard'
                        )
                    ),
                });
            }
        } else if (
            !angular &&
            ts.isJsxSelfClosingElement(node) &&
            node.tagName.getText(source) === 'Route'
        ) {
            const path = stringValue(attribute(node, 'path'));
            if (path !== '*') {
                const element = attribute(node, 'element');
                assert.ok(element && ts.isJsxExpression(element));
                const content = element.expression;
                const guarded = Boolean(
                    content &&
                    ts.isJsxElement(content) &&
                    content.openingElement.tagName.getText(source) ===
                        'AppAccessGate'
                );
                let access = { mode: 'public', permissions: [] };
                if (guarded) {
                    const policy = attribute(content.openingElement, 'policy');
                    assert.ok(policy && ts.isJsxExpression(policy));
                    access = accessPolicy(policy.expression);
                }
                routes.push({ path, access, guarded });
            }
        }
        ts.forEachChild(node, visit);
    };
    visit(source);
    assert.equal(routes.length, pages.length);
    for (const page of pages) {
        const matches = routes.filter(
            (route) =>
                route.path === page.path.replace(/\/$/, '') ||
                (page.path === '/' && route.path === '/')
        );
        assert.equal(matches.length, 1);
        assert.deepEqual(matches[0].access, page.access);
        assert.equal(matches[0].guarded, page.access.mode !== 'public');
    }
    return routes;
}

export async function writeDocumentInputs(root, kind, { shell = false } = {}) {
    assert.ok(DOCUMENT_CASES.includes(kind));
    const marker = JSON.parse(
        (
            await readProductFile(root, '.cmz/application-workspace.json')
        ).toString('utf8')
    );
    await planApplicationWorkspace({
        workspaceRoot: TOOLS_ROOT,
        targetRoot: root,
        profiles: marker.profiles,
        githubRepository: marker.github_repository,
        reviewOwner: marker.review_owner,
    });
    const loaded = await schemas();
    const prefix = `descriptions/ext03a-${kind.toLowerCase()}`;
    await mkdir(join(root, prefix)); // A new namespace only; never replace inputs.
    let design;
    let originalDesignSha256;
    const backendRequests = [];
    if (kind === 'A') {
        const original = 'examples/application-conception-proof';
        for (const name of [
            'project-brief.md',
            'reference-api.postman.json',
            'target-api.definition.json',
        ]) {
            await writeFile(
                join(root, prefix, name),
                await readFile(join(TOOLS_ROOT, original, name)),
                { flag: 'wx' }
            );
        }
        for (const [name, source, adapter] of [
            [
                'reference-api.backend-contract.json',
                'reference-api.postman.json',
                'postman',
            ],
            [
                'target-api.backend-contract.json',
                'target-api.definition.json',
                'structured',
            ],
        ]) {
            const expected = JSON.parse(
                await readFile(join(TOOLS_ROOT, original, name), 'utf8')
            );
            for (const reference of expected.sources ?? []) {
                if (reference.snapshot_uri?.startsWith(original + '/'))
                    reference.snapshot_uri =
                        prefix + reference.snapshot_uri.slice(original.length);
            }
            backendRequests.push({
                definitionPath: `${prefix}/${source}`,
                outputPath: `${prefix}/${name}`,
                adapter,
                expectedSha256: sha256(
                    serializeCanonicalBackendContract(expected)
                ),
            });
        }
        const originalBytes = await readFile(
            join(TOOLS_ROOT, original, 'application-design.source.json')
        );
        originalDesignSha256 = sha256(originalBytes);
        design = JSON.parse(originalBytes.toString('utf8'));
        for (const reference of [
            ...design.sources,
            ...design.backend_contracts,
        ]) {
            reference.snapshot_uri =
                prefix + reference.snapshot_uri.slice(original.length);
            const request = backendRequests.find(
                (item) => item.outputPath === reference.snapshot_uri
            );
            if (request) reference.sha256 = request.expectedSha256;
        }
    } else {
        const fixture = await writeApplicationDesignFixture(
            root,
            loaded.backendContractSchema,
            prefix
        );
        const outputPath = `${prefix}/contracts/backend.contract.json`;
        // The established fixture provides its oracle. Remove only the exact
        // file just written, so the real CLI must subsequently publish it.
        assert.equal(
            sha256(await readFile(join(root, outputPath))),
            sha256(fixture.contractContent)
        );
        await unlink(join(root, outputPath));
        backendRequests.push({
            definitionPath: `${prefix}/contracts/backend.definition.json`,
            outputPath,
            adapter: 'structured',
            expectedSha256: sha256(fixture.contractContent),
        });
        design = fixture.design;
        originalDesignSha256 = sha256(jsonBytes(design));
    }
    const variant = {
        original_design_sha256: originalDesignSha256,
        changes: [],
    };
    if (shell) {
        // Explicit technical fixture variant for the common four-cell shell
        // proof. Original document compilation retains shell-only. React's
        // refusal of that original policy is tested separately, never bypassed.
        for (const [index, experience] of design.experiences.entries()) {
            variant.changes.push({
                path: `experiences[${index}].offline_policy`,
                before: experience.offline_policy,
                after: 'none',
                reason: 'declared no-offline shell fixture; no PWA claim',
            });
            experience.offline_policy = 'none';
        }
    }
    const sourcePath = `${prefix}/design-source.json`;
    const designPath = `${prefix}/application-design.json`;
    const sourceBytes = jsonBytes(design);
    await writeFile(join(root, sourcePath), sourceBytes, { flag: 'wx' });
    variant.compiled_source_sha256 = sha256(sourceBytes);
    return {
        root,
        kind,
        prefix,
        ...loaded,
        backendRequests,
        sourcePath,
        designPath,
        design,
        variant,
    };
}

export async function documentFixture(t, kind = 'A', options = {}) {
    const prepared = await prepareFixture(t, ['angular-pwa', 'react-spa']);
    return {
        ...prepared,
        ...(await writeDocumentInputs(prepared.root, kind, options)),
    };
}

export function runDocumentCli(tool, args, { timeout = 30_000 } = {}) {
    assert.ok(
        [
            'compile-backend-contract',
            'compile-application-design',
            'create-app',
        ].includes(tool)
    );
    const argv = [join(TOOLS_ROOT, `tools/${tool}.mjs`), ...args];
    const result = spawnSync(process.execPath, argv, {
        cwd: TOOLS_ROOT,
        encoding: 'utf8',
        timeout,
        maxBuffer: 8 * 1024 * 1024,
        env: {
            PATH: `${dirname(process.execPath)}:/usr/bin:/bin:/usr/sbin:/sbin`,
            LANG: 'C.UTF-8',
            NO_COLOR: '1',
            CI: 'true',
            NX_DAEMON: 'false',
            NX_NO_CLOUD: 'true',
        },
    });
    return { ...result, argv: [process.execPath, ...argv], cwd: TOOLS_ROOT };
}

export function backendArgs(fixture, request) {
    return [
        '--target-root',
        fixture.root,
        '--definition',
        request.definitionPath,
        '--out',
        request.outputPath,
        '--adapter',
        request.adapter,
    ];
}

export function designArgs(fixture) {
    return [
        '--target-root',
        fixture.root,
        '--source',
        fixture.sourcePath,
        '--out',
        fixture.designPath,
    ];
}

export async function compileDocumentFixture(fixture) {
    const receipts = [];
    const compile = (tool, args) => {
        const preview = runDocumentCli(tool, [...args, '--dry-run']);
        assert.equal(preview.status, 0, preview.stderr);
        const plan = JSON.parse(preview.stdout);
        assert.equal(plan.mode, 'external');
        const apply = runDocumentCli(tool, [...args, '--apply', plan.plan_id]);
        assert.equal(apply.status, 0, apply.stderr);
        receipts.push({ tool, preview, apply, plan });
        return plan;
    };
    for (const request of fixture.backendRequests) {
        const plan = compile(
            'compile-backend-contract',
            backendArgs(fixture, request)
        );
        assert.equal(plan.output_sha256, request.expectedSha256);
        assert.equal(
            sha256(await readFile(join(fixture.root, request.outputPath))),
            request.expectedSha256
        );
    }
    compile('compile-application-design', designArgs(fixture));
    const design = JSON.parse(
        await readFile(join(fixture.root, fixture.designPath), 'utf8')
    );
    assert.deepEqual(design, fixture.design);
    assert.equal(design.pages.length, fixture.kind === 'A' ? 1 : 2);
    assert.deepEqual(
        design.pages.map((page) => page.access.mode),
        fixture.kind === 'A' ? ['public'] : ['public', 'authenticated']
    );
    assert.equal(
        design.pages.at(-1).actions.find((action) => action.kind === 'backend')
            .operation_ref.operation_id,
        fixture.kind === 'A' ? 'notes.submit' : 'create-report'
    );
    return { receipts, design };
}

// Opt-in native cell only, on an existing owned and actually installed product.
// No prepare/install, metadata-only fixture or backend API call.
// CI supplies only its real confined runner; the standalone CLI remains available.
export async function proveNativeDocumentCell(root, cell, prepared = {}) {
    assert.ok(NATIVE_CELLS.includes(cell));
    const [kind, profile] = cell.split('/');
    const fixture =
        prepared.fixture ??
        (await writeDocumentInputs(root, kind, { shell: true }));
    assert.equal(fixture.root, root);
    assert.equal(fixture.kind, kind);
    const compiled = await compileDocumentFixture(fixture);
    const appName = `ext03a-${kind.toLowerCase()}-${profile}`;
    const options = {
        workspaceRoot: TOOLS_ROOT,
        targetRoot: root,
        designPath: fixture.designPath,
        experienceId: compiled.design.experiences[0].id,
        appName,
        profile,
        applicationDesignSchema: fixture.applicationDesignSchema,
        backendContractSchema: fixture.backendContractSchema,
    };
    const plan = await planExternalApplicationShell(options);
    const args = [
        '--target-root',
        root,
        '--design',
        fixture.designPath,
        '--experience',
        options.experienceId,
        '--app',
        appName,
        '--profile',
        profile,
    ];
    const preview = runDocumentCli('create-app', [...args, '--dry-run']);
    assert.equal(preview.status, 0, preview.stderr);
    assert.equal(JSON.parse(preview.stdout).plan_id, plan.plan_id);
    let applied;
    let result;
    if (prepared.run) {
        const publication = await publishExternalApplicationShell(
            { ...options, expectedPlanId: plan.plan_id },
            { run: prepared.run }
        );
        assert.equal(publication.recovered, false);
        result = { status: 'created', plan_id: publication.plan.plan_id };
        applied = { mode: 'native-confined-publication', status: 0 };
    } else {
        applied = runDocumentCli(
            'create-app',
            [...args, '--expect-plan', plan.plan_id],
            { timeout: 1_800_000 }
        );
        assert.equal(applied.status, 0, applied.stderr);
        result = JSON.parse(applied.stdout);
        assert.equal(result.status, 'created');
    }
    await verifyGeneratedTree(plan.outputAbsolute, plan.files);
    const manifest = JSON.parse(
        await readFile(
            join(plan.outputAbsolute, '.cmz/app-manifest.json'),
            'utf8'
        )
    );
    assert.equal(manifest.profile, profile);
    assert.equal(
        manifest.design_ref.sha256,
        sha256(await readFile(join(root, fixture.designPath)))
    );
    const routesPath = `src/app/app.routes.${profile === 'angular-pwa' ? 'ts' : 'tsx'}`;
    const routes = assertShellRouteDeclarations(
        await readFile(join(plan.outputAbsolute, routesPath), 'utf8'),
        profile,
        compiled.design.pages
    );
    return {
        cell,
        scope: 'native document consumption and shell, no business page/session/backend claim',
        variant: fixture.variant,
        documents: compiled.receipts,
        shell: {
            preview,
            applied,
            result,
            tree_sha256: plan.tree_sha256,
            routes,
        },
    };
}
