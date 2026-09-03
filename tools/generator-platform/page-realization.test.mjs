import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
    copyFile,
    mkdir,
    mkdtemp,
    readFile,
    rm,
    symlink,
    unlink,
    writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
    planPageRealization,
    publishPageRealizationWorkOrder,
    verifyPageRealization,
} from './core/page-realization.mjs';
import {
    planApplicationShell,
    publishApplicationShell,
} from './core/application-shell-publication.mjs';
import { writeApplicationDesignFixture } from './test-support/application-design-fixture.mjs';

const applicationDesignSchema = JSON.parse(
    await readFile(
        new URL('./schemas/application-design.schema.json', import.meta.url),
        'utf8'
    )
);
const backendContractSchema = JSON.parse(
    await readFile(
        new URL('./schemas/backend-contract.schema.json', import.meta.url),
        'utf8'
    )
);
const evidenceSchema = JSON.parse(
    await readFile(
        new URL(
            './schemas/page-realization-evidence.schema.json',
            import.meta.url
        ),
        'utf8'
    )
);

function sha256(content) {
    return createHash('sha256').update(content).digest('hex');
}

async function fixture() {
    const root = await mkdtemp(join(tmpdir(), 'page-realization-'));
    await mkdir(join(root, 'apps'));
    await mkdir(join(root, 'designs'));
    await mkdir(join(root, 'tools/generator-platform/schemas'), {
        recursive: true,
    });
    await mkdir(join(root, 'conventions/archetypes/angular'), {
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
            join(root, path)
        );
    }
    await writeFile(
        join(root, '.gitignore'),
        '.cmz/page-realization-work-orders/\n'
    );
    const data = await writeApplicationDesignFixture(
        root,
        backendContractSchema
    );
    await writeFile(
        join(root, 'designs/clean-street.application-design.json'),
        `${JSON.stringify(data.design, null, 2)}\n`
    );
    const shellOptions = {
        workspaceRoot: root,
        designPath: 'designs/clean-street.application-design.json',
        experienceId: 'citizen-web',
        appName: 'clean-street',
        profile: 'angular-pwa',
        applicationDesignSchema,
        backendContractSchema,
    };
    const shellPlan = await planApplicationShell(shellOptions);
    await publishApplicationShell(
        { ...shellOptions, planId: shellPlan.plan_id },
        { run: () => '' }
    );
    execFileSync('git', ['init', '-q'], { cwd: root });
    execFileSync('git', ['add', '.'], { cwd: root });
    return {
        root,
        pageId: 'page_2222222222222222',
        pageRoot: join(
            root,
            'apps/clean-street/src/app/pages/page_2222222222222222'
        ),
    };
}

function mappings(ids) {
    return ids.map((id) => ({
        id,
        selector: `[data-cmz-id="${id}"]`,
    }));
}

async function realize(data, contractHash) {
    const ids = [
        'ready',
        'submitted',
        'failed',
        'offline',
        'description',
        'submit-report',
        'main',
        'report-heading',
        'report-form',
    ];
    const markup = ids
        .map((id) => `<div data-cmz-id="${id}">${id}</div>`)
        .join('\n');
    await rm(data.pageRoot, { recursive: true, force: true });
    await mkdir(data.pageRoot, { recursive: true });
    await writeFile(
        join(data.pageRoot, 'page.component.ts'),
        `import { Component } from '@angular/core';\n@Component({selector: 'app-page-proof', templateUrl: './page.component.html', styleUrl: './page.component.scss'})\nexport class PageComponent {}\n`
    );
    await writeFile(join(data.pageRoot, 'page.component.html'), `${markup}\n`);
    await writeFile(
        join(data.pageRoot, 'page.component.scss'),
        ':host { display: block; }\n'
    );
    await writeFile(
        join(data.pageRoot, 'page.component.spec.ts'),
        `import { describe, expect, it } from 'vitest';\nimport { PageComponent } from './page.component';\ndescribe('PageComponent', () => { it('exists', () => expect(PageComponent).toBeDefined()); });\n`
    );
    await writeFile(
        join(data.pageRoot, 'realization-evidence.json'),
        `${JSON.stringify(
            {
                schema_version: '1.0.0',
                kind: 'page-realization-evidence',
                page_id: data.pageId,
                page_contract_sha256: contractHash,
                states: mappings(['ready', 'submitted', 'failed', 'offline']),
                controls: mappings(['description']),
                actions: mappings(['submit-report']),
                data_bindings: [],
                regions: mappings(['main']),
                elements: mappings(['report-heading', 'report-form']),
            },
            null,
            2
        )}\n`
    );
}

test('prépare un work order immuable et borné à cinq fichiers', async () => {
    const data = await fixture();
    const common = {
        workspaceRoot: data.root,
        appName: 'clean-street',
        pageId: data.pageId,
    };
    const plan = planPageRealization(common);
    assert.match(plan.work_order_id, /^[a-f0-9]{64}$/);
    assert.deepEqual(plan.workOrder.allowed_files, [
        'page.component.html',
        'page.component.scss',
        'page.component.spec.ts',
        'page.component.ts',
        'realization-evidence.json',
    ]);
    assert.equal(plan.workOrder.realization_contract.role_node.role, 'screen');
    assert.equal(
        plan.workOrder.realization_contract.selection.archetype,
        'component'
    );
    const result = await publishPageRealizationWorkOrder({
        ...common,
        workOrderId: plan.work_order_id,
    });
    assert.equal(result.already_published, false);
    assert.equal(
        (
            await publishPageRealizationWorkOrder({
                ...common,
                workOrderId: plan.work_order_id,
            })
        ).already_published,
        true
    );
});

test('valide mappings exacts puis exécute les quatre oracles', async () => {
    const data = await fixture();
    const common = {
        workspaceRoot: data.root,
        appName: 'clean-street',
        pageId: data.pageId,
    };
    const plan = planPageRealization(common);
    await publishPageRealizationWorkOrder({
        ...common,
        workOrderId: plan.work_order_id,
    });
    await realize(data, plan.pageContractHash);
    const calls = [];
    const report = verifyPageRealization(
        {
            ...common,
            workOrderId: plan.work_order_id,
            evidenceSchema,
        },
        {
            run: (_command, args) => calls.push(args.join(' ')),
        }
    );
    assert.equal(report.ok, true, report.violations.join('\n'));
    assert.equal(calls.length, 4);
    assert.ok(report.oracle_results.every((entry) => entry.ok));
});

test('bloque écriture extérieure, réseau direct et preuve incomplète avant les oracles', async () => {
    const data = await fixture();
    const common = {
        workspaceRoot: data.root,
        appName: 'clean-street',
        pageId: data.pageId,
    };
    const plan = planPageRealization(common);
    await publishPageRealizationWorkOrder({
        ...common,
        workOrderId: plan.work_order_id,
    });
    await realize(data, plan.pageContractHash);
    await writeFile(
        join(data.root, 'outside.txt'),
        'LLM wrote outside scope\n'
    );
    await writeFile(
        join(data.pageRoot, 'page.component.ts'),
        `fetch('/reports');\n`
    );
    const evidence = JSON.parse(
        await readFile(join(data.pageRoot, 'realization-evidence.json'), 'utf8')
    );
    evidence.actions = [];
    await writeFile(
        join(data.pageRoot, 'realization-evidence.json'),
        `${JSON.stringify(evidence, null, 2)}\n`
    );
    let called = false;
    const report = verifyPageRealization(
        {
            ...common,
            workOrderId: plan.work_order_id,
            evidenceSchema,
        },
        { run: () => (called = true) }
    );
    assert.equal(report.ok, false);
    assert.equal(called, false);
    assert.ok(
        report.violations.some((entry) => entry.includes('outside the allowed'))
    );
    assert.ok(
        report.violations.some((entry) => entry.includes('network access'))
    );
    assert.ok(
        report.violations.some((entry) => entry.includes('actions: ids'))
    );
});

test('un contrat de page modifié invalide sa preuve par hash', async () => {
    const data = await fixture();
    const common = {
        workspaceRoot: data.root,
        appName: 'clean-street',
        pageId: data.pageId,
    };
    const plan = planPageRealization(common);
    await publishPageRealizationWorkOrder({
        ...common,
        workOrderId: plan.work_order_id,
    });
    await realize(data, plan.pageContractHash);
    const contractPath = join(
        data.root,
        `apps/clean-street/.cmz/pages/${data.pageId}.json`
    );
    const contract = JSON.parse(await readFile(contractPath, 'utf8'));
    contract.page.title = 'Changed after work order';
    await writeFile(contractPath, `${JSON.stringify(contract, null, 2)}\n`);
    const report = verifyPageRealization(
        {
            ...common,
            workOrderId: plan.work_order_id,
            evidenceSchema,
        },
        { run: () => '' }
    );
    assert.equal(report.ok, false);
    assert.ok(
        report.violations.some((entry) => entry.includes('stale page contract'))
    );
    assert.notEqual(
        sha256(await readFile(contractPath)),
        plan.pageContractHash
    );
});

test('inventorie un lien Git sans le suivre et détecte tout changement de cible', async () => {
    const data = await fixture();
    await writeFile(join(data.root, 'first-target.txt'), 'first\n');
    await writeFile(join(data.root, 'second-target.txt'), 'second\n');
    const linkPath = join(data.root, 'workspace-link');
    await symlink('first-target.txt', linkPath);
    const common = {
        workspaceRoot: data.root,
        appName: 'clean-street',
        pageId: data.pageId,
    };
    const plan = planPageRealization(common);
    await publishPageRealizationWorkOrder({
        ...common,
        workOrderId: plan.work_order_id,
    });
    await realize(data, plan.pageContractHash);

    await unlink(linkPath);
    await symlink('second-target.txt', linkPath);
    let called = false;
    const report = verifyPageRealization(
        {
            ...common,
            workOrderId: plan.work_order_id,
            evidenceSchema,
        },
        { run: () => (called = true) }
    );

    assert.equal(report.ok, false);
    assert.equal(called, false);
    assert.ok(
        report.violations.some((entry) => entry.includes('outside the allowed'))
    );
});
