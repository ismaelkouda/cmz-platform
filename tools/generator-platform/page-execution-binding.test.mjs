import assert from 'node:assert/strict';
import { readFile, rename, rm, symlink, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import test from 'node:test';

import { resolvePageExecutionBinding } from './core/page-execution-binding.mjs';
import { createUsersPageCompositionFixture } from './page-composition.fixture.mjs';

const applicationDesignSchema = JSON.parse(
    await readFile(
        new URL('./schemas/application-design.schema.json', import.meta.url),
        'utf8'
    )
);
const pageExecutionPlanSchema = JSON.parse(
    await readFile(
        new URL('./schemas/page-execution-plan.schema.json', import.meta.url),
        'utf8'
    )
);

function options(data, overrides = {}) {
    return {
        workspaceRoot: data.root,
        pageExecutionPlanPath: 'page-execution-plan.json',
        pageExecutionPlanSchema,
        applicationDesignSchema,
        pageContract: JSON.parse(data.pageContract.document.toString('utf8')),
        pageContractPath: data.pageContract.uri,
        pageContractContent: data.pageContract.document,
        ...overrides,
    };
}

test('binds a plan only after deterministic replay of all primitives', async () => {
    const data = await createUsersPageCompositionFixture();
    try {
        const binding = resolvePageExecutionBinding(options(data));
        assert.equal(binding.path, 'page-execution-plan.json');
        assert.match(binding.sha256, /^[a-f0-9]{64}$/);
        assert.deepEqual(binding.plan, data.plan);
    } finally {
        await rm(data.root, { recursive: true, force: true });
    }
});

test('rejects a plan whose semantics differ from deterministic replay', async () => {
    const data = await createUsersPageCompositionFixture();
    try {
        const mutated = structuredClone(data.plan);
        mutated.query_nodes[0].presentation.success_state_id = 'created';
        await writeFile(data.planPath, `${JSON.stringify(mutated, null, 2)}\n`);
        assert.throws(
            () => resolvePageExecutionBinding(options(data)),
            /differs from the deterministic recompilation/
        );
    } finally {
        await rm(data.root, { recursive: true, force: true });
    }
});

test('includes the exact execution-plan bytes in the binding identity', async () => {
    const data = await createUsersPageCompositionFixture();
    try {
        const original = resolvePageExecutionBinding(options(data));
        await writeFile(data.planPath, JSON.stringify(data.plan));
        const reformatted = resolvePageExecutionBinding(options(data));
        assert.deepEqual(reformatted.plan, original.plan);
        assert.notEqual(reformatted.sha256, original.sha256);
    } finally {
        await rm(data.root, { recursive: true, force: true });
    }
});

test('rejects primitive byte drift even when JSON stays parseable', async () => {
    const data = await createUsersPageCompositionFixture();
    try {
        const primitivePath = resolve(data.root, data.models[0].uri);
        await writeFile(
            primitivePath,
            `${data.models[0].document.toString('utf8').trim()}  \n`
        );
        assert.throws(
            () => resolvePageExecutionBinding(options(data)),
            /primitive .* sha256 drifted/
        );
    } finally {
        await rm(data.root, { recursive: true, force: true });
    }
});

test('rejects a plan bound to a different page-contract location', async () => {
    const data = await createUsersPageCompositionFixture();
    try {
        assert.throws(
            () =>
                resolvePageExecutionBinding(
                    options(data, {
                        pageContractPath: 'models/users-list.json',
                    })
                ),
            /different page contract path/
        );
    } finally {
        await rm(data.root, { recursive: true, force: true });
    }
});

test('rejects symbolic links for execution plans', async () => {
    const data = await createUsersPageCompositionFixture();
    try {
        const linkedPlan = resolve(data.root, 'linked-plan.json');
        await symlink(relative(data.root, data.planPath), linkedPlan);
        assert.throws(
            () =>
                resolvePageExecutionBinding(
                    options(data, {
                        pageExecutionPlanPath: 'linked-plan.json',
                    })
                ),
            /must not traverse a symbolic link/
        );
    } finally {
        await rm(data.root, { recursive: true, force: true });
    }
});

test('rejects symbolic links for referenced primitives', async () => {
    const data = await createUsersPageCompositionFixture();
    try {
        const primitivePath = resolve(data.root, data.models[0].uri);
        const realPrimitivePath = resolve(data.root, 'real-users-list.json');
        await rename(primitivePath, realPrimitivePath);
        await symlink(
            relative(dirname(primitivePath), realPrimitivePath),
            primitivePath
        );
        assert.throws(
            () => resolvePageExecutionBinding(options(data)),
            /must not traverse a symbolic link/
        );
    } finally {
        await rm(data.root, { recursive: true, force: true });
    }
});
