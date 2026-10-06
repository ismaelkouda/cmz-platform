import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';

import {
    generateAngularPageComposition,
    generatePageComposition,
} from './generate-page-composition.mjs';
import {
    angularPageHostBindings,
    createPageCompositionFixture,
    createUsersPageCompositionFixture,
} from './page-composition.fixture.mjs';
import { computeAngularPageCompositionTarget } from './page-composition-targets.mjs';
import { repositoryRoot } from './validate-ir.mjs';

const execFileAsync = promisify(execFile);

async function exists(path) {
    try {
        await access(path);
        return true;
    } catch (error) {
        if (error.code === 'ENOENT') return false;
        throw error;
    }
}

test('materializes an Angular composition root from two queries and one command', async (context) => {
    const input = await createPageCompositionFixture();
    context.after(() => rm(input.root, { recursive: true, force: true }));
    const target = await computeAngularPageCompositionTarget({
        plan: input.plan,
        artifactRoot: input.root,
        hostBindings: angularPageHostBindings,
    });
    const paths = Object.keys(target.angular.files);
    assert.equal(paths.length, 19);
    assert.equal(
        paths.some(
            (path) =>
                path.includes('.component.') ||
                /\.(?:css|html|scss)$/.test(path)
        ),
        false
    );
    assert.ok(
        paths.includes(
            'src/nodes/load-report-types/list-report-action-types.facade.ts'
        )
    );
    assert.ok(
        paths.includes('src/nodes/load-site-groups/list-site-groups.facade.ts')
    );
    assert.ok(
        paths.includes(
            'src/nodes/submit-password-recovery/forgot-password.facade.ts'
        )
    );
    assert.match(
        target.angular.files['src/page-composition.ts'],
        /readonly loadReportTypes = inject\(LoadReportTypesNodeFacade\)/
    );
    assert.match(
        target.angular.files['src/page-composition.ts'],
        /this\.submitPasswordRecoveryFacade\.submit\(input\)\.pipe/
    );
    assert.match(
        target.angular.files['src/page-composition.ts'],
        /this\.loadSiteGroups\.reload\(\)/
    );
    assert.match(
        target.angular.files['src/page-composition.providers.ts'],
        /PageComposition,/
    );
    assert.equal(target.artifactPlan.input.kind, 'page-execution-plan');
    assert.equal(
        target.angular.manifest.input.sha256,
        target.artifactPlan.input.sha256
    );
});

test('materializes the real C5 users composition from its three observed primitives', async (context) => {
    const input = await createUsersPageCompositionFixture();
    context.after(() => rm(input.root, { recursive: true, force: true }));
    const target = await computeAngularPageCompositionTarget({
        plan: input.plan,
        artifactRoot: input.root,
        hostBindings: angularPageHostBindings,
    });

    assert.deepEqual(
        input.plan.query_nodes.map(({ id }) => id),
        ['profiles-select', 'users-list']
    );
    assert.deepEqual(
        input.plan.command_nodes.map(({ id, invalidates, authorization }) => ({
            id,
            invalidates,
            authorization,
        })),
        [
            {
                id: 'create-user',
                invalidates: ['users-list'],
                authorization: {
                    mode: 'required',
                    permissions: ['users.create'],
                    denied_behavior: 'disable',
                },
            },
        ]
    );
    assert.ok(
        Object.keys(target.angular.files).includes(
            'src/nodes/users-list/list-users.facade.ts'
        )
    );
    assert.ok(
        Object.keys(target.angular.files).includes(
            'src/nodes/profiles-select/list-user-profiles.facade.ts'
        )
    );
    assert.ok(
        Object.keys(target.angular.files).includes(
            'src/nodes/create-user/create-user.facade.ts'
        )
    );
    assert.match(
        target.angular.files['src/page-composition.ts'],
        /readonly usersList = inject\(UsersListNodeFacade\)/
    );
    assert.match(
        target.angular.files['src/page-composition.ts'],
        /return this\.createUserFacade\.submit\(input\);/
    );
    assert.match(
        target.angular.files['src/page-composition.ts'],
        /PAGE_ACTION_PERMISSION_PORT/
    );
    assert.match(
        target.angular.files['src/page-composition.ts'],
        /PageActionPermissionDeniedError/
    );
    assert.match(
        target.angular.files['src/page-composition.ts'],
        /permissions = \['users\.create'\]/
    );
    assert.match(
        target.angular.files['src/page-composition.ts'],
        /this\.usersList\.reload\(\)/
    );
    assert.doesNotMatch(
        target.angular.files['src/page-composition.ts'],
        /this\.profilesSelect\.reload\(\)/
    );
});

test('fails closed on missing host services, stale artifacts, and unknown capabilities', async (context) => {
    const input = await createPageCompositionFixture();
    context.after(() => rm(input.root, { recursive: true, force: true }));
    const missingService = structuredClone(angularPageHostBindings);
    delete missingService.services['report-api'];
    await assert.rejects(
        computeAngularPageCompositionTarget({
            plan: input.plan,
            artifactRoot: input.root,
            hostBindings: missingService,
        }),
        /missing host binding for report-api/
    );

    const stale = structuredClone(input.plan);
    stale.query_nodes[0].primitive_ref.sha256 = '0'.repeat(64);
    await assert.rejects(
        computeAngularPageCompositionTarget({
            plan: stale,
            artifactRoot: input.root,
            hostBindings: angularPageHostBindings,
        }),
        /primitive document hash is stale/
    );

    const unsupported = structuredClone(input.plan);
    unsupported.query_nodes[0].capabilities.push('query.magic.enabled@1');
    unsupported.query_nodes[0].capabilities.sort();
    unsupported.required_capabilities.push('query.magic.enabled@1');
    unsupported.required_capabilities.sort();
    await assert.rejects(
        computeAngularPageCompositionTarget({
            plan: unsupported,
            artifactRoot: input.root,
            hostBindings: angularPageHostBindings,
        }),
        /missing target capability query.magic.enabled@1/
    );

    const primitivePolicyDrift = structuredClone(input.plan);
    primitivePolicyDrift.command_nodes[0].capabilities =
        primitivePolicyDrift.command_nodes[0].capabilities.map((capability) =>
            capability === 'action.invalidation.caller-declared@1'
                ? 'action.invalidation.none@1'
                : capability
        );
    primitivePolicyDrift.command_nodes[0].invalidates = [];
    primitivePolicyDrift.required_capabilities = [
        ...new Set([
            'composition.independent-node-state@1',
            'composition.producer-node-binding@1',
            ...primitivePolicyDrift.query_nodes.flatMap(
                (node) => node.capabilities
            ),
            ...primitivePolicyDrift.command_nodes.flatMap(
                (node) => node.capabilities
            ),
        ]),
    ].sort();
    await assert.rejects(
        computeAngularPageCompositionTarget({
            plan: primitivePolicyDrift,
            artifactRoot: input.root,
            hostBindings: angularPageHostBindings,
        }),
        /invalidation capability differs from its primitive/
    );
});

test('publishes the composition transactionally and keeps the reviewed tree stable', async (context) => {
    const input = await createPageCompositionFixture();
    context.after(() => rm(input.root, { recursive: true, force: true }));
    const outputRoot = resolve(input.root, 'output');
    const created = await generateAngularPageComposition({
        planPath: input.planPath,
        hostBindingsPath: input.hostBindingsPath,
        outputRoot,
        artifactRoot: input.root,
    });
    assert.equal(created.publication.status, 'created');
    const publishedPlan = JSON.parse(
        await readFile(resolve(outputRoot, 'page-execution-plan.json'), 'utf8')
    );
    assert.equal(publishedPlan.plan_id, input.plan.plan_id);
    await readFile(
        resolve(outputRoot, 'angular/src/page-composition.providers.ts'),
        'utf8'
    );

    const replay = await generateAngularPageComposition({
        planPath: input.planPath,
        hostBindingsPath: input.hostBindingsPath,
        outputRoot,
        artifactRoot: input.root,
        dryRun: true,
    });
    assert.equal(replay.changeSet.summary.create, 0);
    assert.equal(replay.changeSet.summary.replace, 0);
    assert.equal(replay.changeSet.summary.delete, 0);
});

test('publishes a React-only composition without pretending Angular host bindings apply', async (context) => {
    const input = await createPageCompositionFixture();
    context.after(() => rm(input.root, { recursive: true, force: true }));
    const outputRoot = resolve(input.root, 'react-output');
    const created = await generatePageComposition({
        planPath: input.planPath,
        outputRoot,
        artifactRoot: input.root,
        target: 'reactjs',
    });

    assert.equal(created.publication.status, 'created');
    assert.deepEqual(created.targets, ['reactjs']);
    assert.equal(
        await exists(resolve(outputRoot, 'angular-page-host-bindings.json')),
        false
    );
    assert.equal(await exists(resolve(outputRoot, 'angular')), false);
    await readFile(
        resolve(outputRoot, 'reactjs/src/page-composition.runtime.ts'),
        'utf8'
    );

    const replay = await generatePageComposition({
        planPath: input.planPath,
        outputRoot,
        artifactRoot: input.root,
        target: 'react',
        dryRun: true,
    });
    assert.equal(replay.changeSet.summary.create, 0);
    assert.equal(replay.changeSet.summary.replace, 0);
    assert.equal(replay.changeSet.summary.preserve, 0);
    assert.equal(replay.changeSet.summary.delete, 0);
    assert.ok(replay.changeSet.summary.unchanged > 0);
});

test('publishes the real React C5 composition through the public CLI', async (context) => {
    const temporaryRoot = await mkdtemp(
        join(tmpdir(), 'cmz-page-composition-cli-')
    );
    context.after(() => rm(temporaryRoot, { recursive: true, force: true }));
    const outputRoot = resolve(temporaryRoot, 'output');
    const script = resolve(
        repositoryRoot,
        'tools/generator-platform/generate-page-composition.mjs'
    );
    const plan = resolve(
        repositoryRoot,
        'examples/users-management-proof/execution/page-execution-plan.json'
    );
    const { stdout } = await execFileAsync(process.execPath, [
        script,
        '--plan',
        plan,
        '--out',
        outputRoot,
        '--target',
        'reactjs',
    ]);
    const publication = JSON.parse(stdout);

    assert.equal(publication.status, 'created');
    assert.deepEqual(publication.targets, ['reactjs']);
    await readFile(
        resolve(outputRoot, 'reactjs/src/page-composition.runtime.ts'),
        'utf8'
    );
    assert.equal(await exists(resolve(outputRoot, 'angular')), false);
    assert.equal(
        await exists(resolve(outputRoot, 'angular-page-host-bindings.json')),
        false
    );

    await assert.rejects(
        execFileAsync(process.execPath, [
            script,
            '--plan',
            plan,
            '--out',
            resolve(temporaryRoot, 'invalid-output'),
            '--target',
            'all',
        ]),
        (error) => {
            assert.match(
                error.stderr,
                /--host-bindings is required when target includes angular/
            );
            return true;
        }
    );
    assert.equal(await exists(resolve(temporaryRoot, 'invalid-output')), false);
});

test('adds React atomically to an existing Angular publication through a reviewed change set', async (context) => {
    const input = await createPageCompositionFixture();
    context.after(() => rm(input.root, { recursive: true, force: true }));
    const outputRoot = resolve(input.root, 'evolved-output');
    await generateAngularPageComposition({
        planPath: input.planPath,
        hostBindingsPath: input.hostBindingsPath,
        outputRoot,
        artifactRoot: input.root,
    });
    const angularBefore = await readFile(
        resolve(outputRoot, 'angular/src/page-composition.ts')
    );

    const reviewed = await generatePageComposition({
        planPath: input.planPath,
        hostBindingsPath: input.hostBindingsPath,
        outputRoot,
        artifactRoot: input.root,
        target: 'all',
        dryRun: true,
    });
    assert.ok(reviewed.changeSet.summary.create > 0);
    assert.equal(reviewed.changeSet.summary.replace, 0);
    assert.equal(reviewed.changeSet.summary.delete, 0);

    const applied = await generatePageComposition({
        planPath: input.planPath,
        hostBindingsPath: input.hostBindingsPath,
        outputRoot,
        artifactRoot: input.root,
        target: 'all',
        applyChangeSetId: reviewed.changeSet.change_set_id,
    });
    assert.equal(applied.publication.status, 'applied');
    assert.deepEqual(applied.targets, ['angular', 'reactjs']);
    assert.deepEqual(
        await readFile(resolve(outputRoot, 'angular/src/page-composition.ts')),
        angularBefore
    );
    await readFile(
        resolve(outputRoot, 'reactjs/src/page-composition.runtime.ts'),
        'utf8'
    );
});

test('fails closed when target-specific host bindings are missing or misleading', async (context) => {
    const input = await createPageCompositionFixture();
    context.after(() => rm(input.root, { recursive: true, force: true }));

    await assert.rejects(
        generatePageComposition({
            planPath: input.planPath,
            outputRoot: resolve(input.root, 'missing-angular-bindings'),
            artifactRoot: input.root,
            target: 'all',
            dryRun: true,
        }),
        /hostBindingsPath is required when target includes angular/
    );
    await assert.rejects(
        generatePageComposition({
            planPath: input.planPath,
            hostBindingsPath: input.hostBindingsPath,
            outputRoot: resolve(input.root, 'misleading-react-bindings'),
            artifactRoot: input.root,
            target: 'reactjs',
            dryRun: true,
        }),
        /hostBindingsPath is not valid for the reactjs-only target/
    );
    await assert.rejects(
        generatePageComposition({
            planPath: input.planPath,
            outputRoot: resolve(input.root, 'unknown-target'),
            artifactRoot: input.root,
            target: 'magic',
            dryRun: true,
        }),
        /target must be one of: all, angular, reactjs/
    );
});
