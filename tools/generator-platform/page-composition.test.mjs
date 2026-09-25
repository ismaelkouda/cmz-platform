import assert from 'node:assert/strict';
import { readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

import { generateAngularPageComposition } from './generate-page-composition.mjs';
import {
    angularPageHostBindings,
    createPageCompositionFixture,
    createUsersPageCompositionFixture,
} from './page-composition.fixture.mjs';
import { computeAngularPageCompositionTarget } from './page-composition-targets.mjs';

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
        input.plan.command_nodes.map(({ id, invalidates }) => ({
            id,
            invalidates,
        })),
        [{ id: 'create-user', invalidates: ['users-list'] }]
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
        /this\.createUserFacade\.submit\(input\)\.pipe/
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
