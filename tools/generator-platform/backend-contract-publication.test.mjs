import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { parseArgs } from '../compile-backend-contract.mjs';
import {
    planStructuredBackendPublication,
    publishStructuredBackendContract,
} from './core/structured-backend-publication.mjs';
import { loadJson } from './validate-ir.mjs';

const schema = await loadJson(
    new URL('./schemas/backend-contract.schema.json', import.meta.url)
);

function definition() {
    return {
        schema_version: '1.0.0',
        kind: 'backend-contract-definition',
        contract: {
            id: 'sample-api',
            title: 'Sample API',
            version: '1.0.0',
            status: 'planned',
            description: 'Contrat cible minimal.',
        },
        source: { id: 'sample-planned', authority: 'declared' },
        services: [
            {
                id: 'public',
                description: 'Service public.',
                base_urls: [
                    {
                        environment: 'production',
                        url: 'https://api.example.test/v1/',
                    },
                ],
            },
        ],
        security_schemes: [],
        models: [
            {
                id: 'health-result',
                kind: 'scalar',
                description: 'État du service.',
                type: { kind: 'primitive', name: 'string' },
            },
        ],
        operations: [
            {
                id: 'public.health',
                service_id: 'public',
                description: 'Vérifie le service.',
                method: 'GET',
                path: '/health',
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
                        description: 'Service disponible.',
                        body: {
                            media_type: 'text/plain',
                            model_id: 'health-result',
                            envelope: { kind: 'none' },
                        },
                    },
                ],
            },
        ],
    };
}

async function fixture() {
    const root = await mkdtemp(join(tmpdir(), 'backend-publication-'));
    await mkdir(join(root, 'contracts'));
    await writeFile(
        join(root, 'contracts/source.definition.json'),
        `${JSON.stringify(definition(), null, 2)}\n`
    );
    return {
        workspaceRoot: root,
        definitionPath: 'contracts/source.definition.json',
        outputPath: 'contracts/backend.contract.json',
        backendContractSchema: schema,
    };
}

test('la CLI impose une revue dry-run puis un plan SHA-256 exact', () => {
    assert.deepEqual(
        parseArgs(['--definition', 'a.json', '--out', 'b.json', '--dry-run']),
        {
            dryRun: true,
            definitionPath: 'a.json',
            outputPath: 'b.json',
        }
    );
    assert.throws(
        () => parseArgs(['--definition', 'a.json', '--out', 'b.json']),
        /exactement --dry-run ou --apply/
    );
    assert.throws(
        () =>
            parseArgs([
                '--definition',
                'a.json',
                '--out',
                'b.json',
                '--apply',
                'invalid',
            ]),
        /SHA-256 valide/
    );
});

test('le dry-run calcule le contrat sans écrire sortie ni candidat', async () => {
    const options = await fixture();
    const plan = await planStructuredBackendPublication(options);
    await assert.rejects(
        () => readFile(join(options.workspaceRoot, plan.output)),
        /ENOENT/
    );
    await assert.rejects(() => readFile(plan.candidate), /ENOENT/);
    assert.match(plan.plan_id, /^[a-f0-9]{64}$/);
    assert.equal(plan.contract.operations[0].status, 'planned');
});

test('un plan périmé ne produit aucun octet', async () => {
    const options = await fixture();
    await assert.rejects(
        () =>
            publishStructuredBackendContract({
                ...options,
                planId: 'f'.repeat(64),
            }),
        /reviewed plan id is stale/
    );
    await assert.rejects(
        () => readFile(join(options.workspaceRoot, options.outputPath)),
        /ENOENT/
    );
});

test('publie atomiquement puis devient idempotent pour le même plan', async () => {
    const options = await fixture();
    const plan = await planStructuredBackendPublication(options);
    const first = await publishStructuredBackendContract({
        ...options,
        planId: plan.plan_id,
    });
    assert.equal(first.already_published, false);
    assert.deepEqual(
        await readFile(join(options.workspaceRoot, options.outputPath)),
        plan.content
    );

    const second = await publishStructuredBackendContract({
        ...options,
        planId: plan.plan_id,
    });
    assert.equal(second.already_published, true);
});

test('reprend un candidat complet laissé avant la publication atomique', async () => {
    const options = await fixture();
    const plan = await planStructuredBackendPublication(options);
    await writeFile(plan.candidate, plan.content);
    const result = await publishStructuredBackendContract({
        ...options,
        planId: plan.plan_id,
    });
    assert.equal(result.already_published, false);
    await assert.rejects(() => readFile(plan.candidate), /ENOENT/);
});

test('une modification de définition invalide le plan revu', async () => {
    const options = await fixture();
    const plan = await planStructuredBackendPublication(options);
    const changed = definition();
    changed.contract.description = 'Contrat modifié après revue.';
    await writeFile(
        join(options.workspaceRoot, options.definitionPath),
        `${JSON.stringify(changed, null, 2)}\n`
    );
    await assert.rejects(
        () =>
            publishStructuredBackendContract({
                ...options,
                planId: plan.plan_id,
            }),
        /reviewed plan id is stale/
    );
});

test('refuse définition et dossier de sortie symboliques', async () => {
    const options = await fixture();
    await symlink(
        join(options.workspaceRoot, options.definitionPath),
        join(options.workspaceRoot, 'definition-link.json')
    );
    await assert.rejects(
        () =>
            planStructuredBackendPublication({
                ...options,
                definitionPath: 'definition-link.json',
            }),
        /symbolic path component forbidden/
    );

    await mkdir(join(options.workspaceRoot, 'real-output'));
    await symlink(
        join(options.workspaceRoot, 'real-output'),
        join(options.workspaceRoot, 'output-link')
    );
    await assert.rejects(
        () =>
            planStructuredBackendPublication({
                ...options,
                outputPath: 'output-link/backend.json',
            }),
        /symbolic path component forbidden/
    );
});
