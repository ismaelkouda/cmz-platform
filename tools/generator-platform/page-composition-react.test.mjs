import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import test from 'node:test';

import {
    createPageCompositionFixture,
    createUsersPageCompositionFixture,
} from './page-composition.fixture.mjs';
import { computeReactPageCompositionTarget } from './page-composition-targets.mjs';

test('materializes the C5 users composition as framework-native React hooks', async (context) => {
    const input = await createUsersPageCompositionFixture();
    context.after(() => rm(input.root, { recursive: true, force: true }));

    const target = await computeReactPageCompositionTarget({
        plan: input.plan,
        artifactRoot: input.root,
    });
    const paths = Object.keys(target.react.files);

    assert.equal(paths.length, 21);
    assert.equal(
        paths.some(
            (path) =>
                path.includes('.component.') ||
                /\.(?:css|html|scss|tsx)$/.test(path)
        ),
        false
    );
    for (const path of [
        'src/nodes/users-list/list-users.client.ts',
        'src/nodes/profiles-select/list-user-profiles.client.ts',
        'src/nodes/create-user/create-user.client.ts',
        'src/page-composition.ts',
        'src/page-composition.runtime.ts',
    ]) {
        assert.ok(paths.includes(path), `missing ${path}`);
    }

    const createClient =
        target.react.files['src/nodes/create-user/create-user.client.ts'];
    assert.match(createClient, /mode: 'host'/);
    assert.match(createClient, /backoffice-session-bearer/);
    assert.doesNotMatch(createClient, /Authorization|Bearer /);

    const runtime = target.react.files['src/page-composition.runtime.ts'];
    assert.match(runtime, /createPageCompositionHooks/);
    assert.match(runtime, /grantedPermissions\.has\(permission\)/);
    assert.match(runtime, /PageActionPermissionDeniedError/);
    assert.match(runtime, /usersListNode\.reload\(\)/);
    assert.doesNotMatch(runtime, /profilesSelectNode\.reload\(\)/);
    assert.match(runtime, /\.catch\(\(\) => undefined\)/);

    assert.equal(target.artifactPlan.input.kind, 'page-execution-plan');
    assert.equal(
        target.react.manifest.input.sha256,
        target.artifactPlan.input.sha256
    );
    assert.deepEqual(
        new Set(target.react.artifacts.map(({ artifact_id }) => artifact_id)),
        new Set([
            'domain-model',
            'input-validator',
            'response-decoder',
            'integration-client',
            'execution-controller',
            'runtime-binding',
            'public-api',
        ])
    );
});

test('keeps generic React composition deterministic and presentation-free', async (context) => {
    const input = await createPageCompositionFixture();
    context.after(() => rm(input.root, { recursive: true, force: true }));

    const first = await computeReactPageCompositionTarget({
        plan: input.plan,
        artifactRoot: input.root,
    });
    const second = await computeReactPageCompositionTarget({
        plan: input.plan,
        artifactRoot: input.root,
    });

    assert.deepEqual(second.react.files, first.react.files);
    assert.equal(
        Object.keys(first.react.files).some((path) => path.endsWith('.tsx')),
        false
    );
    assert.match(
        first.react.files['src/page-composition.runtime.ts'],
        /loadSiteGroupsNode\.reload\(\)/
    );
    assert.doesNotMatch(
        first.react.files['src/page-composition.runtime.ts'],
        /loadReportTypesNode\.reload\(\)/
    );
});

test('fails closed on stale artifacts and unknown React capabilities', async (context) => {
    const input = await createPageCompositionFixture();
    context.after(() => rm(input.root, { recursive: true, force: true }));

    const stale = structuredClone(input.plan);
    stale.query_nodes[0].primitive_ref.sha256 = '0'.repeat(64);
    await assert.rejects(
        computeReactPageCompositionTarget({
            plan: stale,
            artifactRoot: input.root,
        }),
        /primitive document hash is stale/
    );

    const unsupported = structuredClone(input.plan);
    unsupported.query_nodes[0].capabilities.push('query.magic.enabled@1');
    unsupported.query_nodes[0].capabilities.sort();
    unsupported.required_capabilities.push('query.magic.enabled@1');
    unsupported.required_capabilities.sort();
    await assert.rejects(
        computeReactPageCompositionTarget({
            plan: unsupported,
            artifactRoot: input.root,
        }),
        /missing target capability query.magic.enabled@1/
    );
});
