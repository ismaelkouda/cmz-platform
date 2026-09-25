import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import test from 'node:test';

import { compilePageExecutionPlan } from './core/page-execution-plan.mjs';
import {
    planPageRealization,
    publicPageRealizationPlan,
    publishPageRealizationWorkOrder,
    verifyPageRealization,
} from './core/page-realization.mjs';
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

function sha256(content) {
    return createHash('sha256').update(content).digest('hex');
}

async function fixture() {
    const data = await createUsersPageCompositionFixture();
    const appName = 'users-proof';
    const pageId = JSON.parse(data.pageContract.document.toString('utf8')).page
        .id;
    const appRoot = join(data.root, `apps/${appName}`);
    const contractPath = `apps/${appName}/.cmz/pages/${pageId}.json`;
    await mkdir(join(appRoot, '.cmz/pages'), { recursive: true });
    await mkdir(join(data.root, 'designs'), { recursive: true });
    await mkdir(join(data.root, 'tools/generator-platform/schemas'), {
        recursive: true,
    });
    await mkdir(join(data.root, 'conventions/archetypes/angular'), {
        recursive: true,
    });
    for (const path of [
        'tools/generator-platform/role-registry.json',
        'tools/generator-platform/schemas/role-registry.schema.json',
        'tools/generator-platform/schemas/role-node.schema.json',
        'tools/generator-platform/schemas/archetype-roles.schema.json',
        'tools/generator-platform/schemas/archetype-contract.schema.json',
        'conventions/archetypes/angular/roles.json',
        'conventions/archetypes/angular/component.contract.md',
    ]) {
        await copyFile(
            new URL(`../../${path}`, import.meta.url),
            join(data.root, path)
        );
    }
    const designPath = 'designs/users.application-design.json';
    const designDocument = Buffer.from('{}\n');
    await writeFile(join(data.root, designPath), designDocument);
    await writeFile(
        join(appRoot, '.cmz/app-manifest.json'),
        `${JSON.stringify(
            {
                kind: 'application-shell-manifest',
                app_name: appName,
                design_ref: {
                    path: designPath,
                    sha256: sha256(designDocument),
                },
            },
            null,
            2
        )}\n`
    );
    await writeFile(join(data.root, contractPath), data.pageContract.document);
    const pageContract = { ...data.pageContract, uri: contractPath };
    const plan = compilePageExecutionPlan({
        pageContract,
        listQueryModels: data.models.slice(0, 2),
        actionRequestModels: data.models.slice(2),
        applicationDesignSchema,
        pageExecutionPlanSchema,
    });
    const planPath = 'generated/users-page-execution-plan.json';
    await mkdir(dirname(join(data.root, planPath)), { recursive: true });
    await writeFile(
        join(data.root, planPath),
        `${JSON.stringify(plan, null, 2)}\n`
    );
    await writeFile(
        join(data.root, '.gitignore'),
        '.cmz/page-realization-work-orders/\n'
    );
    execFileSync('git', ['init', '-q'], { cwd: data.root });
    execFileSync('git', ['add', '.'], { cwd: data.root });
    return { ...data, appName, pageId, plan, planPath };
}

test('lie le plan composé rejoué au work order et à son identité', async () => {
    const data = await fixture();
    try {
        const common = {
            workspaceRoot: data.root,
            appName: data.appName,
            pageId: data.pageId,
            pageExecutionPlanPath: data.planPath,
            pageExecutionPlanSchema,
            applicationDesignSchema,
        };
        const work = planPageRealization(common);

        assert.equal(work.workOrder.page_execution.path, data.planPath);
        assert.deepEqual(work.workOrder.page_execution.plan, data.plan);
        assert.ok(
            work.workOrder.rules.some((rule) =>
                rule.includes('do not invent runtime states')
            )
        );
        assert.deepEqual(
            publicPageRealizationPlan(work).page_execution,
            work.workOrder.page_execution
        );

        await publishPageRealizationWorkOrder({
            ...common,
            workOrderId: work.work_order_id,
        });
        const mutated = structuredClone(data.plan);
        mutated.query_nodes[0].presentation.success_state_id = 'created';
        await writeFile(
            join(data.root, data.planPath),
            `${JSON.stringify(mutated, null, 2)}\n`
        );
        assert.throws(
            () =>
                verifyPageRealization({
                    workspaceRoot: data.root,
                    appName: data.appName,
                    pageId: data.pageId,
                    workOrderId: work.work_order_id,
                    pageExecutionPlanSchema,
                    applicationDesignSchema,
                }),
            /differs from the deterministic recompilation/
        );
    } finally {
        await rm(data.root, { recursive: true, force: true });
    }
});
