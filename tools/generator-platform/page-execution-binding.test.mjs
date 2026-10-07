import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
    mkdir,
    readFile,
    rename,
    rm,
    symlink,
    writeFile,
} from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import test from 'node:test';

import { resolvePageExecutionBinding } from './core/page-execution-binding.mjs';
import { compilePageExecutionPlan } from './core/page-execution-plan.mjs';
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

function sha256(content) {
    return createHash('sha256').update(content).digest('hex');
}

async function publishedReplicaFixture(data) {
    const pageId = 'page_6666666666666666';
    const sourcePath = `apps/angular-proof/.cmz/pages/${pageId}.json`;
    const targetPath = `apps/react-proof/.cmz/pages/${pageId}.json`;
    const designDocument = Buffer.from('{"design":"users"}\n');
    const designRef = {
        path: 'designs/users.application-design.json',
        sha256: sha256(designDocument),
    };
    const pageContract = JSON.parse(
        data.pageContract.document.toString('utf8')
    );
    pageContract.design_ref = designRef;
    const pageContractDocument = Buffer.from(
        `${JSON.stringify(pageContract, null, 2)}\n`
    );
    const source = {
        uri: sourcePath,
        sha256: sha256(pageContractDocument),
        document: pageContractDocument,
    };
    const plan = compilePageExecutionPlan({
        pageContract: source,
        listQueryModels: data.models.slice(0, 2),
        actionRequestModels: data.models.slice(2),
        applicationDesignSchema,
        pageExecutionPlanSchema,
    });
    await mkdir(resolve(data.root, 'designs'), { recursive: true });
    await writeFile(resolve(data.root, designRef.path), designDocument);
    for (const [appName, path] of [
        ['angular-proof', sourcePath],
        ['react-proof', targetPath],
    ]) {
        await mkdir(dirname(resolve(data.root, path)), { recursive: true });
        await writeFile(resolve(data.root, path), pageContractDocument);
        await writeFile(
            resolve(data.root, `apps/${appName}/.cmz/app-manifest.json`),
            `${JSON.stringify({
                schema_version: '1.0.0',
                kind: 'application-shell-manifest',
                app_name: appName,
                profile:
                    appName === 'angular-proof' ? 'angular-pwa' : 'react-spa',
                design_ref: designRef,
                experience_id: 'web',
            })}\n`
        );
    }
    await writeFile(data.planPath, `${JSON.stringify(plan, null, 2)}\n`);
    return {
        sourcePath,
        targetPath,
        designRef,
        pageContract,
        pageContractDocument,
        plan,
    };
}

test('binds a plan only after deterministic replay of all primitives', async () => {
    const data = await createUsersPageCompositionFixture();
    try {
        const binding = resolvePageExecutionBinding(options(data));
        assert.equal(binding.path, 'page-execution-plan.json');
        assert.match(binding.sha256, /^[a-f0-9]{64}$/);
        assert.deepEqual(binding.contract_binding, {
            mode: 'exact',
            source_path: data.pageContract.uri,
            target_path: data.pageContract.uri,
        });
        assert.deepEqual(binding.plan, data.plan);
    } finally {
        await rm(data.root, { recursive: true, force: true });
    }
});

test('binds an exact published replica across stack-specific app shells', async () => {
    const data = await createUsersPageCompositionFixture();
    try {
        const replica = await publishedReplicaFixture(data);

        const binding = resolvePageExecutionBinding(
            options(data, {
                pageContractPath: replica.targetPath,
                pageContract: replica.pageContract,
                pageContractContent: replica.pageContractDocument,
            })
        );

        assert.deepEqual(binding.contract_binding, {
            mode: 'published-replica',
            source_path: replica.sourcePath,
            target_path: replica.targetPath,
            source_app: 'angular-proof',
            target_app: 'react-proof',
            design_ref: replica.designRef,
            experience_id: 'web',
        });
        assert.equal(binding.plan.plan_id, replica.plan.plan_id);
    } finally {
        await rm(data.root, { recursive: true, force: true });
    }
});

test('rejects a replica whose target bytes or design authority drift', async () => {
    const data = await createUsersPageCompositionFixture();
    try {
        const replica = await publishedReplicaFixture(data);
        const replicaOptions = options(data, {
            pageContractPath: replica.targetPath,
            pageContract: replica.pageContract,
            pageContractContent: replica.pageContractDocument,
        });

        const mutated = Buffer.from(
            `${replica.pageContractDocument.toString('utf8').trim()} \n`
        );
        assert.notEqual(sha256(mutated), sha256(replica.pageContractDocument));
        assert.throws(
            () =>
                resolvePageExecutionBinding({
                    ...replicaOptions,
                    pageContractContent: mutated,
                }),
            /differs from the published target/
        );

        const otherDesign = Buffer.from('{"design":"other"}\n');
        const otherDesignRef = {
            path: 'designs/other.application-design.json',
            sha256: sha256(otherDesign),
        };
        await writeFile(resolve(data.root, otherDesignRef.path), otherDesign);
        await writeFile(
            resolve(data.root, 'apps/react-proof/.cmz/app-manifest.json'),
            `${JSON.stringify({
                schema_version: '1.0.0',
                kind: 'application-shell-manifest',
                app_name: 'react-proof',
                profile: 'react-spa',
                design_ref: otherDesignRef,
                experience_id: 'web',
            })}\n`
        );
        assert.throws(
            () => resolvePageExecutionBinding(replicaOptions),
            /do not share one design authority/
        );
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
