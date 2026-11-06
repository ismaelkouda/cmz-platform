import assert from 'node:assert/strict';
import { readFile, rename, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

import { compileRuntimeObservationBackend } from './adapters/runtime-observation-backend-adapter.mjs';
import { loadObservedBackendInputs } from './core/runtime-observation-backend-inputs.mjs';
import { sha256 } from './core/generation-manifest.mjs';
import {
    observationDiagnostic,
    resolveObservationPointer,
} from './core/runtime-observation-evidence.mjs';
import {
    planStructuredBackendPublication,
    publicBackendPublicationPlan,
    publishStructuredBackendContract,
} from './core/structured-backend-publication.mjs';
import {
    observedBackendCli,
    observedBackendFixture,
    publishObservedSources,
    scalar,
    objectShape,
    arrayShape,
} from './test-support/runtime-observation-backend-fixture.mjs';

const compile = (fixture) => compileRuntimeObservationBackend(fixture.options);
const stopped = async (callback, expected) =>
    assert.rejects(callback, (error) => {
        assert.match(observationDiagnostic(error), expected);
        assert.equal(error.stack, error.message);
        return true;
    });

for (const variant of ['dispatch', 'observatory']) {
    test(`R2/${variant}: contrat complet, table typée, null, alias privé, sans promotion réseau`, async (t) => {
        const fixture = await observedBackendFixture(t, variant);
        const input = await compile(fixture);
        const contract = input.contract;
        assert.equal(contract.schema_version, '1.1.0');
        assert.equal(contract.contract.status, 'reference');
        assert.ok(
            contract.sources.every((source) => source.status === 'reference')
        );
        assert.equal(contract.services[0].runtime_binding, 'private-fixture');
        assert.equal(Object.hasOwn(contract.services[0], 'base_urls'), false);
        const map = contract.models.find(
            (model) =>
                model.id === (variant === 'dispatch' ? 'labels' : 'readings')
        );
        assert.deepEqual(map.fields, []);
        assert.equal(
            map.additional_properties.kind,
            variant === 'dispatch' ? 'array' : 'primitive'
        );
        const publication = JSON.stringify([
            contract,
            input.snapshots.map((snapshot) => snapshot.content.toString()),
        ]);
        assert.equal(publication.includes('private-fixture.invalid'), false);
        assert.equal(publication.includes('source.txt'), false);
        assert.equal(publication.includes('verified-live'), false);
        if (variant === 'dispatch') {
            const request = contract.models.find(
                (model) =>
                    model.id === contract.operations[0].request.body.model_id
            );
            assert.equal(request.fields[0].format, 'email');
            assert.deepEqual(request.additional_properties, {
                kind: 'primitive',
                name: 'json',
            });
        } else
            assert.equal(contract.operations[0].access.mode, 'authenticated');
    });
}

const mutations = [
    [
        'preuve de sécurité manquante',
        (f) => {
            f.documents.annotations.operations[0].evidence = [];
        },
        /OBS_COMPLEMENT/,
    ],
    [
        'authentification déclarée contradictoire avec public explicite',
        (f) => {
            f.documents.openapi.paths['/dispatches'].post.security = [];
            f.documents.annotations.operations[0].access = {
                mode: 'authenticated',
                security_scheme_ids: ['token'],
                permissions: [],
            };
        },
        /OBS_CONFLICT|OBS_OPENAPI/,
    ],
    [
        'déclaration manquante non déduite du témoin',
        (f) => {
            delete f.documents.annotations.models[0].fields[0].required;
        },
        /OBS_SCHEMA/,
    ],
    [
        'tableau vide sans type déclaré pour ses éléments',
        (f) => {
            delete f.documents.annotations.models[1].additional_properties
                .items;
        },
        /OBS_SCHEMA/,
    ],
    [
        'table sans clés observées figées',
        (f) => {
            delete f.documents.annotations.models[1].additional_properties;
        },
        /OBS_CONFLICT/,
    ],
    [
        'valeur non nulle incompatible avec null seul',
        (f) => {
            f.documents.observation.cases[0].shape.fields[2].shape =
                scalar('string');
        },
        /OBS_CONFLICT/,
    ],
    [
        'présence optionnelle incompatible avec required universel',
        (f) => {
            f.documents.observation.cases[0].shape.fields[0].optional_observed = true;
        },
        /OBS_CONFLICT/,
    ],
    [
        'couverture incomplète refusée',
        (f) => {
            f.documents.observation.cases[0].shape.coverage = 'first';
        },
        /OBS_SCHEMA/,
    ],
    [
        'format inventé refusé',
        (f) => {
            f.documents.openapi.components.schemas.DispatchInput.properties.email.format =
                'secret-format';
        },
        /OBS_OPENAPI/,
    ],
    [
        'type nullable deviné depuis un tableau vide refusé',
        (f) => {
            delete f.documents.annotations.models[0].fields[1].type;
        },
        /OBS_SCHEMA/,
    ],
    [
        'identité du cas différente',
        (f) => {
            f.documents.observation.cases[0].method = 'DELETE';
        },
        /OBS_BINDING/,
    ],
    [
        'alias de liaison différent',
        (f) => {
            f.documents.binding.alias = 'other';
        },
        /OBS_BINDING/,
    ],
    [
        'préfixe de base différent',
        (f) => {
            f.definition.openapi.base_path = '/different';
        },
        /OBS_BINDING/,
    ],
    [
        'le profil supérieur au plafond du schéma est refusé',
        (f) => {
            f.definition.openapi.profile.bytes = 2097152;
        },
        /^OBS_SCHEMA$/,
    ],
    [
        'propriété supplémentaire portant un nom hérité refusée',
        (f) => {
            f.documents.annotations.toString = 'CANARY';
        },
        /OBS_SCHEMA/,
    ],
    [
        'aucune promotion réseau depuis une fixture',
        (f) => {
            f.documents.observation.network_verified = true;
        },
        /OBS_SCHEMA/,
    ],
];
for (const [label, mutate, expected] of mutations)
    test(`R2/refus : ${label}`, async (t) => {
        const fixture = await observedBackendFixture(t);
        mutate(fixture);
        await fixture.write();
        await stopped(() => compile(fixture), expected);
    });

test('R2: source volumineuse non sélectionnée exclue de la capsule, provenance exacte', async (t) => {
    const fixture = await observedBackendFixture(t);
    const small = await loadObservedBackendInputs(fixture.options);
    for (let index = 0; index < 600; index += 1)
        fixture.documents.openapi.paths[`/unused-${index}`] = {
            get: {
                description: 'ignored'.repeat(60),
                responses: { 200: { description: 'ignored' } },
            },
        };
    await fixture.write();
    assert.ok(fixture.definition.openapi.bytes > 262144);
    const large = await loadObservedBackendInputs(fixture.options);
    assert.deepEqual(large.selected, small.selected);
    const capsule = JSON.parse(large.snapshots[0].content);
    assert.equal(capsule.source_sha256, fixture.definition.openapi.sha256);
    assert.ok(capsule.pointers.includes('#/paths/~1dispatches/post'));
    assert.equal(large.snapshots[0].content.includes('unused-'), false);
});

test('R2: source hors plafond refusée avant parsing, sentinelle absente de la CLI', async (t) => {
    const fixture = await observedBackendFixture(t);
    const sentinel = 'PRIVATE_SENTINEL_R2_NO_ECHO';
    await writeFile(
        join(fixture.privateRoot, 'openapi.json'),
        '{' + sentinel.repeat(50000)
    );
    const result = observedBackendCli(fixture);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /OBS_LIMIT/);
    assert.equal((result.stdout + result.stderr).includes(sentinel), false);
    await writeFile(
        join(fixture.privateRoot, 'openapi.json'),
        '{ "bad": ' + sentinel
    );
    fixture.definition.openapi.sha256 = (
        await import('./core/generation-manifest.mjs')
    ).sha256(await readFile(join(fixture.privateRoot, 'openapi.json')));
    fixture.definition.openapi.bytes = (
        await readFile(join(fixture.privateRoot, 'openapi.json'))
    ).length;
    await writeFile(
        join(fixture.root, fixture.definitionPath),
        JSON.stringify(fixture.definition)
    );
    const malformed = observedBackendCli(fixture);
    assert.equal(malformed.status, 1);
    assert.match(malformed.stderr, /OBS_PARSE/);
    assert.equal(
        (malformed.stdout + malformed.stderr).includes(sentinel),
        false
    );
});

test('R2: empreinte de source modifiée et lien symbolique refusés', async (t) => {
    const fixture = await observedBackendFixture(t);
    await writeFile(join(fixture.privateRoot, 'source.txt'), 'Changed.');
    await stopped(() => compile(fixture), /OBS_HASH/);
    await fixture.write();
    await rename(
        join(fixture.privateRoot, 'source.txt'),
        join(fixture.privateRoot, 'physical.txt')
    );
    await symlink(
        join(fixture.privateRoot, 'physical.txt'),
        join(fixture.privateRoot, 'source.txt')
    );
    await stopped(() => compile(fixture), /OBS_FILE/);
});

test('R2: pointeurs RFC6901 propres, champ toString légitime, sans accès au prototype', async (t) => {
    const value = JSON.parse('{"a/b~c":{"toString":7}}');
    assert.equal(resolveObservationPointer(value, '/a~1b~0c/toString'), 7);
    assert.throws(() => resolveObservationPointer(value, '/constructor'));
    assert.throws(() => resolveObservationPointer([], '/00'));
    const fixture = await observedBackendFixture(t);
    fixture.documents.annotations.models[0].fields[0].name = 'toString';
    fixture.documents.observation.cases[0].shape.fields[0].name = 'toString';
    await fixture.write();
    assert.equal(
        (await compile(fixture)).contract.models.find(
            (model) => model.id === 'dispatch-result'
        ).fields[0].name,
        'toString'
    );
});

test('R2: snapshots puis contrat par plans natifs, liaison privée modifiée refusée', async (t) => {
    const fixture = await observedBackendFixture(t);
    await stopped(
        () => planStructuredBackendPublication(fixture.options),
        /OBS_HASH/
    );
    await publishObservedSources(fixture);
    const plan = await planStructuredBackendPublication(fixture.options);
    assert.equal(
        JSON.stringify(publicBackendPublicationPlan(plan)).includes(
            fixture.privateRoot
        ),
        false
    );
    const published = await publishStructuredBackendContract({
        ...fixture.options,
        planId: plan.plan_id,
    });
    assert.equal(published.already_published, false);
    assert.equal(
        (
            await publishStructuredBackendContract({
                ...fixture.options,
                planId: plan.plan_id,
            })
        ).already_published,
        true
    );
    fixture.documents.binding.origin = 'http://other-private.invalid';
    fixture.documents.openapi.servers[0].url =
        'http://other-private.invalid/api';
    await fixture.write();
    await stopped(
        () =>
            publishStructuredBackendContract({
                ...fixture.options,
                planId: plan.plan_id,
            }),
        /OBS_HASH|OBS_INTERNAL/
    );
});

test('R2: témoin fini pour graphe récursif, sans inventer les éléments vides', async (t) => {
    const fixture = await observedBackendFixture(t);
    const model = fixture.documents.annotations.models[0];
    model.fields.push({
        name: 'children',
        required: false,
        nullable: false,
        type: { kind: 'array', items: { kind: 'model', model_id: model.id } },
        evidence: model.evidence,
    });
    const root = fixture.documents.observation.cases[0].shape;
    root.fields.push({
        name: 'children',
        shape: {
            kind: 'array',
            coverage: 'all',
            min_length: 0,
            max_length: 0,
            items: [],
        },
    });
    await fixture.write();
    assert.ok(
        (await compile(fixture)).contract.models.some(
            (entry) => entry.id === model.id
        )
    );
    delete model.fields.at(-1).type.items;
    await fixture.write();
    await stopped(() => compile(fixture), /OBS_SCHEMA/);
});

test('R2: tableau PHP vide jamais converti en table déclarée', async (t) => {
    const fixture = await observedBackendFixture(t);
    fixture.documents.observation.cases[0].shape.fields[1].shape = {
        kind: 'array',
        coverage: 'all',
        min_length: 0,
        max_length: 0,
        items: [],
    };
    await fixture.write();
    await stopped(() => compile(fixture), /OBS_CONFLICT/);
});

test('R2: description conservé comme nom de champ de requête légitime', async (t) => {
    const fixture = await observedBackendFixture(t);
    fixture.documents.openapi.components.schemas.DispatchInput.properties.description =
        { type: 'string' };
    await fixture.write();
    const { contract } = await compile(fixture);
    const model = contract.models.find(
        (entry) => entry.id === contract.operations[0].request.body.model_id
    );
    assert.ok(model.fields.some((field) => field.name === 'description'));
});

// La forme/plage du profil appartient au schéma ; l'adéquation au volume
// déclaré est une limite sémantique, contrôlée avant toute lecture de source.
test('R2/budget : le volume mesuré exact est accepté sans augmentation du plafond', async (t) => {
    const fixture = await observedBackendFixture(t);
    fixture.definition.openapi.profile.bytes = fixture.definition.openapi.bytes;
    await fixture.write();
    const input = await compile(fixture);
    assert.equal(input.contract.operations.length, 1);
});

test('R2/budget : profil valide mais insuffisant refusé avant lecture de la source', async (t) => {
    const fixture = await observedBackendFixture(t);
    fixture.definition.openapi.profile.bytes =
        fixture.definition.openapi.bytes - 1;
    await fixture.write();
    // Si la garde avant lecture disparaît, cette source substituée produirait
    // OBS_HASH. Le test exige OBS_LIMIT sans dépendre de son contenu.
    const sentinel = 'SENTINELLE_PRIVEE_BUDGET_R2';
    await writeFile(join(fixture.privateRoot, 'openapi.json'), sentinel);
    await stopped(() => compile(fixture), /^OBS_LIMIT$/);
    const result = observedBackendCli(fixture);
    assert.equal(result.status, 1);
    assert.equal(result.stderr.trim(), 'OBS_LIMIT');
    assert.equal((result.stdout + result.stderr).includes(sentinel), false);
});

async function errorFixture(t, variant = 'dispatch') {
    const fixture = await observedBackendFixture(t, variant);
    const { definition, documents, privateRoot } = fixture;
    definition.schema_version = '1.3.0';
    documents.annotations.schema_version = '1.3.0';
    const selection = definition.operations[0];
    const declaration = documents.annotations.operations[0];
    selection.error_responses = [];
    declaration.error_responses = [];
    const php =
        '<?php\n// PHP_SOURCE_SENTINEL\nthrow new DomainException("Erreur", 400);\n';
    await writeFile(join(privateRoot, 'error-policy.php'), php);
    documents.annotations.fragments.push({
        id: 'server-error-policy',
        path: 'error-policy.php',
        sha256: sha256(php),
        commit: 'b'.repeat(40),
        start_line: 1,
        end_line: 3,
    });
    const proof = [{ source_id: 'server-error-policy', locator: 'L2-L3' }];
    const field = (name, type) => ({
        name,
        type,
        required: true,
        nullable: false,
        evidence: proof,
    });
    documents.annotations.models.push({
        id: 'validation-fields',
        kind: 'object',
        fields: [],
        additional_properties: {
            kind: 'array',
            items: { kind: 'primitive', name: 'string' },
        },
        evidence: proof,
    });
    for (const status of [400, 401, 422]) {
        const modelId = `http-error-${status}`;
        const fields = [
            field('message', { kind: 'primitive', name: 'string' }),
        ];
        const shapes = { message: scalar('string') };
        if (status === 400) {
            fields.push(
                field('error', { kind: 'primitive', name: 'boolean' }),
                field('statusCode', { kind: 'primitive', name: 'integer' })
            );
            shapes.error = scalar('boolean');
            shapes.statusCode = scalar('number');
        }
        if (status === 422) {
            fields.push(
                field('errors', {
                    kind: 'model',
                    model_id: 'validation-fields',
                })
            );
            shapes.errors = objectShape({
                first: arrayShape([scalar('string')]),
                second: arrayShape([scalar('string')]),
            });
        }
        documents.annotations.models.push({
            id: modelId,
            kind: 'object',
            fields,
            evidence: proof,
        });
        const caseId = `failure-${status}`;
        const index = documents.observation.cases.length;
        documents.observation.cases.push({
            id: caseId,
            method: selection.method,
            path: selection.path,
            status,
            content_type: 'application/json',
            shape: objectShape(shapes),
        });
        selection.error_responses.push({
            status,
            case_id: caseId,
            shape_pointer: `/cases/${index}`,
            body_pointer: '',
            model_id: modelId,
            envelope: { kind: 'none' },
            documentation: status === 400 ? 'observed-only' : 'openapi',
        });
        declaration.error_responses.push({
            status,
            model_id: modelId,
            evidence: proof,
        });
        if (status !== 400)
            documents.openapi.paths[selection.source_path][
                selection.method.toLowerCase()
            ].responses[status] = { description: 'Erreur documentée.' };
    }
    const capture = JSON.stringify({
        kind: 'synthetic-capture',
        cases: documents.observation.cases,
    });
    await writeFile(join(privateRoot, 'error-capture.json'), capture);
    documents.observation.sources.push({
        id: 'error-capture',
        path: 'error-capture.json',
        sha256: sha256(capture),
    });
    await fixture.write();
    return fixture;
}

for (const variant of ['dispatch', 'observatory']) {
    test(`R2/1.3/${variant}: erreurs par opération,400 non documenté sourcé et succès préservé`, async (t) => {
        const fixture = await errorFixture(t, variant);
        const input = await compile(fixture);
        const operation = input.contract.operations[0];
        assert.deepEqual(
            operation.responses.map(({ status, outcome }) => ({
                status,
                outcome,
            })),
            [
                { status: 200, outcome: 'success' },
                { status: 400, outcome: 'error' },
                { status: 401, outcome: 'error' },
                { status: 422, outcome: 'error' },
            ]
        );
        assert.equal(
            Object.hasOwn(
                input.selected.paths[
                    fixture.definition.operations[0].source_path
                ][operation.method.toLowerCase()],
                'responses'
            ),
            false
        );
        const capsule = JSON.parse(input.snapshots[0].content);
        assert.deepEqual(
            capsule.response_selections.find(({ status }) => status === 400),
            {
                operation_id: operation.id,
                status: 400,
                outcome: 'error',
                documentation: 'observed-only',
            }
        );
        assert.match(operation.responses[1].description, /absente/);
        assert.equal(input.witnesses.network_verified, false);
        assert.equal(input.witnesses.origin, 'fixture');
        const publicText = JSON.stringify([
            input.contract,
            input.snapshots.map(({ content }) => content.toString()),
        ]);
        for (const sentinel of [
            'PHP_SOURCE_SENTINEL',
            'private-fixture.invalid',
            'verified-live',
        ])
            assert.equal(publicText.includes(sentinel), false);
        for (const response of operation.responses) {
            for (const ref of response.evidence) {
                const snapshot = input.snapshots.find(
                    ({ id }) => id === ref.source_id
                );
                assert.ok(
                    resolveObservationPointer(
                        JSON.parse(snapshot.content),
                        ref.locator.slice(1)
                    )
                );
            }
        }
    });
}

const errorMutations = [
    [
        'déclaration PHP absente',
        (f) => {
            f.documents.annotations.operations[0].error_responses[0].evidence =
                [];
        },
        /OBS_COMPLEMENT/,
    ],
    [
        'texte non PHP pour erreur non documentée',
        (f) => {
            f.documents.annotations.operations[0].error_responses[0].evidence =
                f.documents.annotations.service_evidence;
        },
        /OBS_COMPLEMENT/,
    ],
    [
        '400 prétendu documenté',
        (f) => {
            f.definition.operations[0].error_responses[0].documentation =
                'openapi';
        },
        /OBS_BINDING/,
    ],
    [
        '401 prétendu absent de OpenAPI',
        (f) => {
            f.definition.operations[0].error_responses[1].documentation =
                'observed-only';
        },
        /OBS_BINDING/,
    ],
    [
        'capture autre opération',
        (f) => {
            f.documents.observation.cases[1].path = '/other';
        },
        /OBS_BINDING/,
    ],
    [
        'capture autre statut',
        (f) => {
            f.documents.observation.cases[1].status = 200;
        },
        /OBS_BINDING/,
    ],
    [
        'modèle non déclaré',
        (f) => {
            f.definition.operations[0].error_responses[0].model_id =
                'not-declared';
        },
        /OBS_COMPLEMENT/,
    ],
    [
        'statut erreur dupliqué',
        (f) => {
            f.definition.operations[0].error_responses[1].status = 400;
        },
        /OBS_IDENTITY/,
    ],
    [
        'déclaration erreur orpheline',
        (f) => {
            f.definition.operations[0].error_responses.pop();
        },
        /OBS_COMPLEMENT/,
    ],
    [
        'tableau de messages sans déclaration du type',
        (f) => {
            delete f.documents.annotations.models.find(
                ({ id }) => id === 'validation-fields'
            ).additional_properties.items;
        },
        /OBS_SCHEMA/,
    ],
    [
        'graphe du témoin incompatible',
        (f) => {
            f.documents.observation.cases[3].shape.fields[1].shape =
                scalar('string');
        },
        /OBS_CONFLICT/,
    ],
    [
        'capture falsifiée',
        (f) => {
            f.documents.observation.sources[1].sha256 = '0'.repeat(64);
        },
        /OBS_HASH/,
    ],
];
for (const [label, mutate, expected] of errorMutations) {
    test(`R2/1.3 refuse ${label}`, async (t) => {
        const fixture = await errorFixture(t);
        mutate(fixture);
        await fixture.write();
        await stopped(() => compile(fixture), expected);
    });
}

test('R2/1.2 : aucune réponse400 ne devient un succès, même présente dans OpenAPI', async (t) => {
    const fixture = await observedBackendFixture(t);
    const selection = fixture.definition.operations[0];
    selection.status = 400;
    fixture.documents.observation.cases[0].status = 400;
    fixture.documents.openapi.paths[selection.source_path][
        selection.method.toLowerCase()
    ].responses[400] = { description: 'Erreur.' };
    await fixture.write();
    await stopped(() => compile(fixture), /OBS_BINDING/);
});

test('R2/1.3 : publication des capsules et du contrat par la même voie native', async (t) => {
    const fixture = await errorFixture(t);
    await publishObservedSources(fixture);
    const plan = await planStructuredBackendPublication(fixture.options);
    await publishStructuredBackendContract({
        ...fixture.options,
        planId: plan.plan_id,
    });
    const published = JSON.parse(
        await readFile(join(fixture.root, fixture.options.outputPath), 'utf8')
    );
    assert.equal(
        published.operations[0].responses.filter(
            ({ outcome }) => outcome === 'error'
        ).length,
        3
    );
    fixture.documents.annotations.operations[0].error_responses[0].model_id =
        'http-error-401';
    await fixture.write();
    await stopped(
        () =>
            publishStructuredBackendContract({
                ...fixture.options,
                planId: plan.plan_id,
            }),
        /OBS_(?:HASH|COMPLEMENT|CONFLICT)/
    );
});
