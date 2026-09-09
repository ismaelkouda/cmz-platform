/**
 * Lot PLAT-9 — réalisation d'écran multi-nœuds (nœuds indépendants).
 *
 * Prouve, de bout en bout et sans oracle Angular réel (mocké), qu'une page
 * portant à la fois un `load` (nœud requête) et une `action` backend (nœud
 * commande) indépendants :
 *   - produit un nœud de rôle `screen` `1.1.0` dont le payload liste
 *     `load_ids` et `data_binding_ids` ;
 *   - passe la validation de conception ;
 *   - est réalisable dans le work order borné à cinq fichiers, chaque
 *     identifiant du contrat (états, contrôle, action, data binding, régions,
 *     éléments) mappé sur un sélecteur `data-cmz-id` présent dans le markup ;
 *
 * et que les gardes négatives tiennent :
 *   - un `data_binding` dont l'opération n'est déclenchée par aucun `load`
 *     ni aucune `action` backend de la page est refusé à la conception ;
 *   - une réalisation à qui il manque le sélecteur d'un `data_binding` est
 *     refusée avant les oracles.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
    copyFile,
    mkdir,
    mkdtemp,
    readFile,
    writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
    planApplicationShell,
    publishApplicationShell,
} from './core/application-shell-publication.mjs';
import { validateApplicationDesignWithDependencies } from './core/application-design.mjs';
import {
    planPageRealization,
    publishPageRealizationWorkOrder,
    verifyPageRealization,
} from './core/page-realization.mjs';
import {
    compileStructuredBackendDefinition,
    serializeCanonicalBackendContract,
} from './core/structured-backend-adapter.mjs';

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

const PAGE_ID = 'page_3333333333333333';

function backendDefinition() {
    return {
        schema_version: '1.0.0',
        kind: 'backend-contract-definition',
        contract: {
            id: 'multi-node-api',
            title: 'Multi-node proof API',
            version: '1.0.0',
            status: 'planned',
            description: 'Planned target API for the multi-node screen proof.',
        },
        source: { id: 'multi-node-api-plan', authority: 'declared' },
        services: [
            {
                id: 'public-api',
                description: 'Public API.',
                base_urls: [
                    {
                        environment: 'development',
                        url: 'https://api.multi-node.example/v1/',
                    },
                ],
            },
        ],
        security_schemes: [],
        models: [
            {
                id: 'overview',
                kind: 'object',
                description: 'Welcome block content.',
                fields: [
                    {
                        name: 'headline',
                        description: 'Headline sentence.',
                        required: true,
                        nullable: false,
                        type: { kind: 'primitive', name: 'string' },
                    },
                    {
                        name: 'resolvedCount',
                        description: 'Public resolved counter.',
                        required: true,
                        nullable: false,
                        type: { kind: 'primitive', name: 'integer' },
                    },
                ],
            },
            {
                id: 'signup',
                kind: 'object',
                description: 'Email-list signup request.',
                fields: [
                    {
                        name: 'email',
                        description: 'Email to register.',
                        required: true,
                        nullable: false,
                        type: { kind: 'primitive', name: 'string' },
                    },
                ],
            },
            {
                id: 'signup-receipt',
                kind: 'object',
                description: 'Accepted signup.',
                fields: [
                    {
                        name: 'id',
                        description: 'Stable signup id.',
                        required: true,
                        nullable: false,
                        type: { kind: 'primitive', name: 'uuid' },
                    },
                ],
            },
        ],
        operations: [
            {
                id: 'get-overview',
                service_id: 'public-api',
                description: 'Fetch the welcome block content.',
                method: 'GET',
                path: '/overview',
                access: {
                    mode: 'public',
                    security_scheme_ids: [],
                    permissions: [],
                },
                request: { parameters: [] },
                responses: [
                    {
                        status: 200,
                        outcome: 'success',
                        description: 'Overview returned.',
                        body: {
                            media_type: 'application/json',
                            model_id: 'overview',
                            envelope: { kind: 'none' },
                        },
                    },
                ],
            },
            {
                id: 'post-signup',
                service_id: 'public-api',
                description: 'Register an email-list signup.',
                method: 'POST',
                path: '/signups',
                access: {
                    mode: 'public',
                    security_scheme_ids: [],
                    permissions: [],
                },
                request: {
                    parameters: [],
                    body: {
                        required: true,
                        media_types: ['application/json'],
                        model_id: 'signup',
                    },
                },
                responses: [
                    {
                        status: 202,
                        outcome: 'success',
                        description: 'Signup accepted.',
                        body: {
                            media_type: 'application/json',
                            model_id: 'signup-receipt',
                            envelope: { kind: 'none' },
                        },
                    },
                ],
            },
        ],
    };
}

function evidence() {
    return [{ source_id: 'multi-node-brief', locator: 'sheet' }];
}

function mixedPage(overrides = {}) {
    return {
        id: PAGE_ID,
        title: 'Welcome',
        purpose: 'Read the welcome block and subscribe to the email list.',
        path: '/',
        experience_ids: ['web'],
        access: { mode: 'public', permissions: [] },
        initial_state_id: 'loading',
        states: [
            {
                id: 'loading',
                kind: 'loading',
                description: 'Fetching the welcome block.',
                announcement: 'Loading.',
            },
            {
                id: 'ready',
                kind: 'ready',
                description: 'Welcome block visible, signup form ready.',
                announcement: 'Ready.',
            },
            {
                id: 'empty',
                kind: 'empty',
                description: 'No welcome content available.',
                announcement: 'Nothing to show.',
            },
            {
                id: 'load-failed',
                kind: 'error',
                description: 'The welcome block failed to load.',
                announcement: 'Loading failed.',
            },
            {
                id: 'submitted',
                kind: 'success',
                description: 'The signup was accepted.',
                announcement: 'Subscribed.',
            },
            {
                id: 'submit-failed',
                kind: 'error',
                description: 'The signup failed.',
                announcement: 'Signup failed.',
            },
            {
                id: 'offline',
                kind: 'offline',
                description: 'Network access is unavailable.',
                announcement: 'You are offline.',
            },
        ],
        controls: [
            {
                id: 'email',
                kind: 'text',
                label: 'Email',
                description: 'Email to subscribe.',
                required: true,
            },
        ],
        actions: [
            {
                id: 'submit-signup',
                kind: 'backend',
                label: 'Subscribe',
                description: 'Send the signup to the target API.',
                available_in_state_ids: ['ready'],
                input_bindings: [
                    {
                        control_id: 'email',
                        target_kind: 'body-field',
                        target_name: 'email',
                    },
                ],
                operation_ref: {
                    contract_id: 'multi-node-api',
                    operation_id: 'post-signup',
                },
                success_state_id: 'submitted',
                error_state_id: 'submit-failed',
            },
        ],
        loads: [
            {
                id: 'load-overview',
                operation_ref: {
                    contract_id: 'multi-node-api',
                    operation_id: 'get-overview',
                },
                parameter_bindings: [],
                loading_state_id: 'loading',
                success_state_id: 'ready',
                empty_state_id: 'empty',
                error_state_id: 'load-failed',
            },
        ],
        data_bindings: [
            {
                id: 'overview-content',
                operation_ref: {
                    contract_id: 'multi-node-api',
                    operation_id: 'get-overview',
                },
                response_status: 200,
                model_id: 'overview',
                field_names: ['headline', 'resolvedCount'],
                visible_in_state_ids: ['ready'],
            },
        ],
        regions: [
            {
                id: 'main',
                role: 'main',
                accessible_name: 'Welcome content',
                elements: [
                    {
                        id: 'welcome-heading',
                        kind: 'heading',
                        accessible_name: 'Welcome heading',
                        content: 'Make your street cleaner',
                        control_ids: [],
                        action_ids: [],
                        data_binding_ids: [],
                    },
                    {
                        id: 'welcome-block',
                        kind: 'status',
                        accessible_name: 'Welcome block',
                        content: 'Headline and resolved counter',
                        control_ids: [],
                        action_ids: [],
                        data_binding_ids: ['overview-content'],
                    },
                    {
                        id: 'signup-form',
                        kind: 'form',
                        accessible_name: 'Email-list signup form',
                        content: 'Email field and subscribe action',
                        control_ids: ['email'],
                        action_ids: ['submit-signup'],
                        data_binding_ids: [],
                    },
                ],
            },
        ],
        evidence: evidence(),
        ...overrides,
    };
}

function design(page = mixedPage(), briefHash, contractHash) {
    return {
        schema_version: '1.0.0',
        kind: 'application-design',
        design: {
            id: 'multi-node-proof',
            title: 'Multi-node proof',
            version: '1.0.0',
            status: 'approved',
            problem:
                'A screen must host an independent read node and command node.',
            primary_outcome:
                'The welcome block loads and the signup form submits.',
            description: 'Hermetic multi-node screen realization proof.',
            evidence: evidence(),
        },
        sources: [
            {
                id: 'multi-node-brief',
                kind: 'project-brief',
                snapshot_uri: 'design/project-brief.md',
                sha256: briefHash,
            },
        ],
        backend_contracts: [
            {
                id: 'multi-node-api',
                role: 'target',
                snapshot_uri: 'contracts/backend.contract.json',
                sha256: contractHash,
            },
        ],
        audiences: [
            {
                id: 'visitor',
                title: 'Visitor',
                description: 'Any visitor.',
                evidence: evidence(),
            },
        ],
        experiences: [
            {
                id: 'web',
                title: 'Web experience',
                description: 'Installable web application.',
                channel: 'web',
                audience_ids: ['visitor'],
                entry_page_id: PAGE_ID,
                page_ids: [PAGE_ID],
                offline_policy: 'shell-only',
                evidence: evidence(),
            },
        ],
        pages: [page],
        unknowns: [],
    };
}

async function workspace(pageOverride) {
    const root = await mkdtemp(join(tmpdir(), 'multi-node-screen-'));
    await mkdir(join(root, 'apps'));
    await mkdir(join(root, 'designs'));
    await mkdir(join(root, 'contracts'));
    await mkdir(join(root, 'design'));
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
    const brief = Buffer.from('# Multi-node proof\n\nHermetic brief.\n');
    await writeFile(join(root, 'design/project-brief.md'), brief);
    const definition = Buffer.from(
        `${JSON.stringify(backendDefinition(), null, 2)}\n`
    );
    await writeFile(
        join(root, 'contracts/backend.definition.json'),
        definition
    );
    const compiled = compileStructuredBackendDefinition({
        definition: JSON.parse(definition.toString('utf8')),
        snapshotUri: 'contracts/backend.definition.json',
        snapshotSha256: sha256(definition),
        backendContractSchema,
    });
    const contractContent = Buffer.from(
        serializeCanonicalBackendContract(compiled)
    );
    await writeFile(
        join(root, 'contracts/backend.contract.json'),
        contractContent
    );
    const built = design(
        pageOverride ?? mixedPage(),
        sha256(brief),
        sha256(contractContent)
    );
    await writeFile(
        join(root, 'designs/multi-node.application-design.json'),
        `${JSON.stringify(built, null, 2)}\n`
    );
    return { root, design: built };
}

async function shell(root) {
    const options = {
        workspaceRoot: root,
        designPath: 'designs/multi-node.application-design.json',
        experienceId: 'web',
        appName: 'multi-node',
        profile: 'angular-pwa',
        applicationDesignSchema,
        backendContractSchema,
    };
    const plan = await planApplicationShell(options);
    await publishApplicationShell(
        { ...options, planId: plan.plan_id },
        { run: () => '' }
    );
    execFileSync('git', ['init', '-q'], { cwd: root });
    execFileSync('git', ['add', '.'], { cwd: root });
    return join(root, 'apps/multi-node/src/app/pages', PAGE_ID);
}

function mappings(ids) {
    return ids.map((id) => ({ id, selector: `[data-cmz-id="${id}"]` }));
}

async function realize(pageRoot, contractHash, evidenceOverride = {}) {
    const ids = [
        'loading',
        'ready',
        'empty',
        'load-failed',
        'submitted',
        'submit-failed',
        'offline',
        'email',
        'submit-signup',
        'overview-content',
        'main',
        'welcome-heading',
        'welcome-block',
        'signup-form',
    ];
    const markup = ids
        .map((id) => `<div data-cmz-id="${id}">${id}</div>`)
        .join('\n');
    await writeFile(
        join(pageRoot, 'page.component.ts'),
        `import { Component } from '@angular/core';\n@Component({selector: 'app-page-multi-node', templateUrl: './page.component.html', styleUrl: './page.component.scss'})\nexport class PageComponent {}\n`
    );
    await writeFile(join(pageRoot, 'page.component.html'), `${markup}\n`);
    await writeFile(
        join(pageRoot, 'page.component.scss'),
        ':host { display: block; }\n'
    );
    await writeFile(
        join(pageRoot, 'page.component.spec.ts'),
        `import { describe, expect, it } from 'vitest';\nimport { PageComponent } from './page.component';\ndescribe('PageComponent', () => { it('exists', () => expect(PageComponent).toBeDefined()); });\n`
    );
    await writeFile(
        join(pageRoot, 'realization-evidence.json'),
        `${JSON.stringify(
            {
                schema_version: '1.0.0',
                kind: 'page-realization-evidence',
                page_id: PAGE_ID,
                page_contract_sha256: contractHash,
                states: mappings([
                    'loading',
                    'ready',
                    'empty',
                    'load-failed',
                    'submitted',
                    'submit-failed',
                    'offline',
                ]),
                controls: mappings(['email']),
                actions: mappings(['submit-signup']),
                data_bindings: mappings(['overview-content']),
                regions: mappings(['main']),
                elements: mappings([
                    'welcome-heading',
                    'welcome-block',
                    'signup-form',
                ]),
                ...evidenceOverride,
            },
            null,
            2
        )}\n`
    );
}

test('le nœud de rôle screen 1.1.0 liste loads et data bindings du contrat', async () => {
    const { root } = await workspace();
    const pageRoot = await shell(root);
    const common = {
        workspaceRoot: root,
        appName: 'multi-node',
        pageId: PAGE_ID,
    };
    const plan = planPageRealization(common);
    const node = plan.workOrder.realization_contract.role_node;
    assert.equal(node.schema_version, '1.1.0');
    assert.equal(node.role, 'screen');
    assert.deepEqual(node.payload.load_ids, ['load-overview']);
    assert.deepEqual(node.payload.data_binding_ids, ['overview-content']);
    assert.deepEqual(node.payload.action_ids, ['submit-signup']);
    assert.equal(
        plan.workOrder.realization_contract.selection.archetype,
        'component'
    );
    void pageRoot;
});

test('une page mixte réalisée passe les mappings puis les quatre oracles', async () => {
    const { root } = await workspace();
    const pageRoot = await shell(root);
    const common = {
        workspaceRoot: root,
        appName: 'multi-node',
        pageId: PAGE_ID,
    };
    const plan = planPageRealization(common);
    await publishPageRealizationWorkOrder({
        ...common,
        workOrderId: plan.work_order_id,
    });
    await realize(pageRoot, plan.pageContractHash);
    const calls = [];
    const report = verifyPageRealization(
        { ...common, workOrderId: plan.work_order_id, evidenceSchema },
        { run: (_command, args) => calls.push(args.join(' ')) }
    );
    assert.equal(report.ok, true, report.violations.join('\n'));
    assert.equal(calls.length, 4);
});

test('un data binding sans load ni action déclencheur est refusé à la conception', async () => {
    const orphan = mixedPage();
    orphan.data_bindings = [
        {
            id: 'orphan-binding',
            operation_ref: {
                contract_id: 'multi-node-api',
                operation_id: 'post-signup',
            },
            response_status: 202,
            model_id: 'signup-receipt',
            field_names: ['id'],
            visible_in_state_ids: ['submitted'],
        },
        orphan.data_bindings[0],
    ];
    // Retire l'action et le load qui déclencheraient post-signup / get-overview
    // n'est pas retiré : seul post-signup devient orphelin via une action absente.
    orphan.actions = [];
    orphan.regions[0].elements[2] = {
        id: 'signup-form',
        kind: 'status',
        accessible_name: 'Orphan binding',
        content: 'Orphan',
        control_ids: [],
        action_ids: [],
        data_binding_ids: ['orphan-binding'],
    };
    orphan.controls = [];
    const { root } = await workspace(orphan);
    const errors = await validateApplicationDesignWithDependencies({
        design: design(orphan, 'a'.repeat(64), 'b'.repeat(64)),
        applicationDesignSchema,
        backendContractSchema,
        workspaceRoot: root,
    });
    assert.ok(
        errors.some((entry) =>
            entry.includes(
                'no page load or backend action triggers multi-node-api:post-signup'
            )
        ),
        errors.join('\n')
    );
});

test('une réalisation sans le sélecteur du data binding est refusée avant les oracles', async () => {
    const { root } = await workspace();
    const pageRoot = await shell(root);
    const common = {
        workspaceRoot: root,
        appName: 'multi-node',
        pageId: PAGE_ID,
    };
    const plan = planPageRealization(common);
    await publishPageRealizationWorkOrder({
        ...common,
        workOrderId: plan.work_order_id,
    });
    await realize(pageRoot, plan.pageContractHash, { data_bindings: [] });
    let called = false;
    const report = verifyPageRealization(
        { ...common, workOrderId: plan.work_order_id, evidenceSchema },
        { run: () => (called = true) }
    );
    assert.equal(report.ok, false);
    assert.equal(called, false);
    assert.ok(
        report.violations.some((entry) =>
            entry.includes('data_bindings: ids must match the page contract')
        ),
        report.violations.join('\n')
    );
});
