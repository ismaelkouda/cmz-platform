import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
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
import { sha256 } from './core/generation-manifest.mjs';
import {
    compileStructuredBackendDefinition,
    serializeCanonicalBackendContract,
} from './core/structured-backend-adapter.mjs';
import {
    observedBackendFixture,
    publishObservedSources,
} from './test-support/runtime-observation-backend-fixture.mjs';

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

test('runtime-observation CLI requires explicit private inputs and separates snapshot publication', async () => {
    const common = [
        '--adapter',
        'runtime-observation',
        '--definition',
        'descriptions/in.json',
        '--out',
        'descriptions/out.json',
        '--dry-run',
    ];
    assert.equal(
        parseArgs([
            ...common,
            '--private-root',
            '/private/fixture',
            '--snapshot',
            'openapi',
        ]).snapshotId,
        'openapi'
    );
    assert.throws(() => parseArgs([...common, '--snapshot', 'other']));
    assert.throws(() =>
        parseArgs([
            '--adapter',
            'structured',
            '--definition',
            'a.json',
            '--out',
            'b.json',
            '--dry-run',
            '--private-root',
            '/private/fixture',
        ])
    );
    await assert.rejects(
        () =>
            planStructuredBackendPublication({
                adapter: 'runtime-observation',
                workspaceRoot: '/',
                definitionPath: 'a.json',
                outputPath: 'b.json',
                backendContractSchema: schema,
            }),
        /OBS_ROOT/
    );
});

async function adoptionFixture(t, variant = 'dispatch') {
    const observed = await observedBackendFixture(t, variant);
    await publishObservedSources(observed);
    const referencePlan = await planStructuredBackendPublication(
        observed.options
    );
    await publishStructuredBackendContract({
        ...observed.options,
        planId: referencePlan.plan_id,
    });
    const basisBytes = await readFile(
        join(observed.root, observed.options.outputPath)
    );
    const decisionPath = 'descriptions/adoption-decision.json';
    const decisionBytes = Buffer.from(
        '{"kind":"human-decision-snapshot","decision":"adopt"}\n'
    );
    await writeFile(join(observed.root, decisionPath), decisionBytes);
    const adoptionDefinition = {
        schema_version: '1.1.0',
        kind: 'backend-contract-definition',
        contract: {
            ...referencePlan.contract.contract,
            status: 'planned',
            version: '1.0.1',
        },
        source: { id: 'target-adoption', authority: 'declared' },
        basis: {
            snapshot_uri: observed.options.outputPath,
            sha256: sha256(basisBytes),
        },
        decision: { snapshot_uri: decisionPath, sha256: sha256(decisionBytes) },
    };
    const adoptionOptions = {
        workspaceRoot: observed.options.workspaceRoot,
        targetRoot: observed.root,
        definitionPath: 'descriptions/adoption.json',
        outputPath: 'descriptions/target.backend.json',
        backendContractSchema: schema,
        adapter: 'structured',
        adoptReference: true,
    };
    const writeAdoption = () =>
        writeFile(
            join(observed.root, adoptionOptions.definitionPath),
            JSON.stringify(adoptionDefinition, null, 2) + '\n'
        );
    await writeAdoption();
    return {
        ...observed,
        basisBytes,
        referencePlan,
        adoptionDefinition,
        adoptionOptions,
        writeAdoption,
    };
}

function adoptionCli(data, extra = []) {
    return spawnSync(
        process.execPath,
        [
            new URL('../compile-backend-contract.mjs', import.meta.url)
                .pathname,
            '--adapter',
            'structured',
            '--adopt-reference',
            '--target-root',
            data.root,
            '--definition',
            data.adoptionOptions.definitionPath,
            '--out',
            data.adoptionOptions.outputPath,
            '--dry-run',
            ...extra,
        ],
        { encoding: 'utf8', timeout: 15000 }
    );
}

for (const variant of ['dispatch', 'observatory']) {
    test(`adoption publiée, traçable et idempotente : ${variant}`, async (t) => {
        const data = await adoptionFixture(t, variant);
        const plan = await planStructuredBackendPublication(
            data.adoptionOptions
        );
        assert.equal(plan.contract.contract.status, 'planned');
        assert.equal(plan.adopt_reference, true);
        for (const reference of [
            data.adoptionDefinition.basis,
            data.adoptionDefinition.decision,
        ]) {
            assert.ok(
                plan.compilation_context.inputs.some(
                    (input) =>
                        input.path === reference.snapshot_uri &&
                        input.sha256 === reference.sha256
                )
            );
        }
        const first = await publishStructuredBackendContract({
            ...data.adoptionOptions,
            planId: plan.plan_id,
        });
        assert.equal(first.already_published, false);
        const second = await publishStructuredBackendContract({
            ...data.adoptionOptions,
            planId: plan.plan_id,
        });
        assert.equal(second.already_published, true);
        assert.deepEqual(
            await readFile(join(data.root, data.options.outputPath)),
            data.basisBytes
        );
        assert.deepEqual(
            await readFile(join(data.root, data.adoptionOptions.outputPath)),
            plan.content
        );
    });
}

test('adoption : la décision est un document objet non vide', async (t) => {
    for (const [value, code] of [
        [null, 'OBS_PARSE'],
        ['DECISION_SENTINEL', 'OBS_PARSE'],
        [['DECISION_SENTINEL'], 'OBS_PARSE'],
        [1, 'OBS_PARSE'],
        [{}, 'OBS_SCHEMA'],
    ]) {
        const data = await adoptionFixture(t);
        const bytes = Buffer.from(JSON.stringify(value) + '\n');
        await writeFile(
            join(data.root, data.adoptionDefinition.decision.snapshot_uri),
            bytes
        );
        data.adoptionDefinition.decision.sha256 = sha256(bytes);
        await data.writeAdoption();
        await assert.rejects(
            () => planStructuredBackendPublication(data.adoptionOptions),
            (error) => {
                assert.equal(error.name, 'ObservationError');
                assert.equal(error.message, code);
                assert.equal(error.stack, code);
                return true;
            }
        );
        const cli = adoptionCli(data);
        assert.equal(cli.status, 1);
        assert.equal(cli.stdout, '');
        assert.equal(cli.stderr.trim(), code);
        assert.equal(
            (cli.stdout + cli.stderr).includes('DECISION_SENTINEL'),
            false
        );
        await assert.rejects(
            () => readFile(join(data.root, data.adoptionOptions.outputPath)),
            /ENOENT/
        );
    }
});

test('adoption : la décision appartient à la fermeture du plan', async (t) => {
    const data = await adoptionFixture(t);
    const plan = await planStructuredBackendPublication(data.adoptionOptions);
    await writeFile(
        join(data.root, data.adoptionDefinition.decision.snapshot_uri),
        '{"decision":"changed"}\n'
    );
    await assert.rejects(
        () =>
            publishStructuredBackendContract({
                ...data.adoptionOptions,
                planId: plan.plan_id,
            }),
        (error) => /^OBS_[A-Z]+$/.test(error.message)
    );
    await assert.rejects(
        () => readFile(join(data.root, data.adoptionOptions.outputPath)),
        /ENOENT/
    );
    await assert.rejects(() => readFile(plan.candidate), /ENOENT/);
});

test('adoption : base ou capsule modifiée invalide le plan sans sortie', async (t) => {
    for (const selected of ['basis', 'capsule']) {
        const data = await adoptionFixture(t);
        const plan = await planStructuredBackendPublication(
            data.adoptionOptions
        );
        const path =
            selected === 'basis'
                ? data.adoptionDefinition.basis.snapshot_uri
                : data.referencePlan.contract.sources[0].snapshot_uri;
        const bytes = await readFile(join(data.root, path));
        await writeFile(
            join(data.root, path),
            Buffer.concat([bytes, Buffer.from(' ')])
        );
        await assert.rejects(
            () =>
                publishStructuredBackendContract({
                    ...data.adoptionOptions,
                    planId: plan.plan_id,
                }),
            /OBS_HASH/
        );
        await assert.rejects(
            () => readFile(join(data.root, data.adoptionOptions.outputPath)),
            /ENOENT/
        );
    }
});

test('adoption : la sortie ne remplace aucun intrant', async (t) => {
    const data = await adoptionFixture(t);
    for (const path of [
        data.adoptionOptions.definitionPath,
        data.adoptionDefinition.basis.snapshot_uri,
        data.adoptionDefinition.decision.snapshot_uri,
        data.referencePlan.contract.sources[0].snapshot_uri,
    ]) {
        const before = await readFile(join(data.root, path));
        await assert.rejects(() =>
            planStructuredBackendPublication({
                ...data.adoptionOptions,
                outputPath: path,
            })
        );
        assert.deepEqual(await readFile(join(data.root, path)), before);
    }
});

test('adoption : refuse les liens physiques des intrants et des sorties', async (t) => {
    const data = await adoptionFixture(t);
    await symlink(
        join(data.root, data.adoptionDefinition.basis.snapshot_uri),
        join(data.root, 'descriptions/basis-link.json')
    );
    data.adoptionDefinition.basis.snapshot_uri = 'descriptions/basis-link.json';
    await data.writeAdoption();
    await assert.rejects(
        () => planStructuredBackendPublication(data.adoptionOptions),
        /OBS_FILE/
    );
});

test('adoption CLI : choix fermé du mode avant toute lecture', () => {
    const common = [
        '--adapter',
        'structured',
        '--adopt-reference',
        '--target-root',
        '/private/root',
        '--definition',
        'a.json',
        '--out',
        'b.json',
        '--dry-run',
    ];
    assert.equal(parseArgs(common).adoptReference, true);
    for (const adapter of ['openapi', 'postman', 'runtime-observation'])
        assert.throws(() =>
            parseArgs(
                common.map((value) =>
                    value === 'structured' ? adapter : value
                )
            )
        );
    assert.throws(() =>
        parseArgs(
            common.filter(
                (value) => !['--target-root', '/private/root'].includes(value)
            )
        )
    );
    assert.throws(() =>
        parseArgs([...common, '--private-root', '/private/other'])
    );
    assert.throws(() => parseArgs([...common, '--snapshot', 'openapi']));
    assert.throws(() => parseArgs([...common, '--adopt-reference']));
});

test('adoption CLI : les rejets de définition/base/décision restent bornés, sans sentinelle', async (t) => {
    const data = await adoptionFixture(t);
    const sentinel = 'PRIVATE_ADOPTION_SENTINEL_7b390';
    for (const selected of ['definition', 'basis', 'decision']) {
        const path =
            selected === 'definition'
                ? data.adoptionOptions.definitionPath
                : data.adoptionDefinition[selected].snapshot_uri;
        const original = await readFile(join(data.root, path));
        await writeFile(join(data.root, path), '{"' + sentinel + '":');
        const result = adoptionCli(data);
        assert.equal(result.status, 1);
        assert.equal(result.stdout, '');
        assert.equal(result.stderr, 'OBS_PARSE\n');
        assert.equal((result.stdout + result.stderr).includes(sentinel), false);
        assert.equal(
            (result.stdout + result.stderr).includes(data.root),
            false
        );
        await writeFile(join(data.root, path), original);
    }
});

test('adoption : bornes de volume et de structure avant projection', async (t) => {
    const data = await adoptionFixture(t);
    for (const [selected, limit] of [
        ['definition', 65536],
        ['basis', 1048576],
        ['decision', 65536],
    ]) {
        const path =
            selected === 'definition'
                ? data.adoptionOptions.definitionPath
                : data.adoptionDefinition[selected].snapshot_uri;
        const original = await readFile(join(data.root, path));
        await writeFile(
            join(data.root, path),
            '{"PRIVATE_SENTINEL":' + ' '.repeat(limit)
        );
        const result = adoptionCli(data);
        assert.equal(result.status, 1);
        assert.equal(result.stdout, '');
        assert.equal(result.stderr, 'OBS_LIMIT\n');
        await writeFile(join(data.root, path), original);
    }
    await writeFile(
        join(data.root, data.adoptionOptions.definitionPath),
        '{"x":'.repeat(40) + '0' + '}'.repeat(40)
    );
    assert.equal(adoptionCli(data).stderr, 'OBS_LIMIT\n');
});

test('adoption : cardinalité16 et budget cumulé2Mio avant lecture des capsules', async (t) => {
    for (const count of [17, 16]) {
        const data = await adoptionFixture(t);
        const referenceDefinition = definition();
        referenceDefinition.contract.status = 'reference';
        referenceDefinition.source.authority = 'observational';
        const bytes = Buffer.from(
            JSON.stringify(referenceDefinition, null, 2) + '\n'
        );
        const capsule = Buffer.concat([
            bytes,
            Buffer.alloc(65536 - bytes.length, ' '),
        ]);
        const basis = compileStructuredBackendDefinition({
            definition: referenceDefinition,
            snapshotUri: 'descriptions/capsule0.json',
            snapshotSha256: sha256(capsule),
            backendContractSchema: schema,
        });
        for (let index = 0; index < count; index++) {
            const source = {
                ...basis.sources[0],
                id: index === 0 ? basis.sources[0].id : `reference-${index}`,
                snapshot_uri: `descriptions/capsule${index}.json`,
            };
            if (index === 0) basis.sources[0] = source;
            else {
                basis.sources.push(source);
                basis.services[0].evidence.push({
                    source_id: source.id,
                    locator: '/services/0',
                });
            }
            // For 17 sources, missing capsules distinguish cardinality refusal
            // from any later I/O error. For 16, every capsule is individually
            // admissible but the unique input sum exceeds the global budget.
            if (count === 16)
                await writeFile(join(data.root, source.snapshot_uri), capsule);
        }
        const canonical = Buffer.from(serializeCanonicalBackendContract(basis));
        const basisBytes =
            count === 16
                ? Buffer.concat([
                      canonical,
                      Buffer.alloc(1048576 - canonical.length, ' '),
                  ])
                : canonical;
        await writeFile(
            join(data.root, data.adoptionDefinition.basis.snapshot_uri),
            basisBytes
        );
        data.adoptionDefinition.basis.sha256 = sha256(basisBytes);
        data.adoptionDefinition.contract = {
            ...basis.contract,
            status: 'planned',
            version: '1.0.1',
        };
        await data.writeAdoption();
        await assert.rejects(
            () => planStructuredBackendPublication(data.adoptionOptions),
            /OBS_LIMIT/
        );
        await assert.rejects(
            () => readFile(join(data.root, data.adoptionOptions.outputPath)),
            /ENOENT/
        );
    }
});
