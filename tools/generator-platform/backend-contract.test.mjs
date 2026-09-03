import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
    validateBackendContract,
    verifyBackendContractSnapshots,
} from './core/backend-contract.mjs';
import { loadJson } from './validate-ir.mjs';

const schema = await loadJson(
    new URL('./schemas/backend-contract.schema.json', import.meta.url)
);

function evidence(locator = '$') {
    return [{ source_id: 'source', locator }];
}

function validContract(
    snapshotUri = 'contracts/source.json',
    sha256 = 'a'.repeat(64)
) {
    return {
        schema_version: '1.0.0',
        kind: 'backend-contract',
        contract: {
            id: 'clean-street-api',
            title: 'Clean Street backend',
            version: '1.0.0',
            status: 'planned',
            description:
                'Contrat canonique minimal prouvant une lecture CMS publique.',
        },
        sources: [
            {
                id: 'source',
                kind: 'manual',
                authority: 'declared',
                status: 'planned',
                snapshot_uri: snapshotUri,
                sha256,
            },
        ],
        services: [
            {
                id: 'base-settings',
                status: 'planned',
                description: 'Service CMS public.',
                base_urls: [
                    {
                        environment: 'production',
                        url: 'https://cmz-service-api.example/base-settings/v1.0/',
                    },
                ],
                evidence: evidence('$.service'),
            },
        ],
        security_schemes: [],
        models: [
            {
                id: 'home-block',
                kind: 'object',
                status: 'planned',
                description: "Bloc éditorial de l'accueil.",
                evidence: evidence('$.models.home-block'),
                fields: [
                    {
                        name: 'title',
                        description: 'Titre affiché.',
                        required: true,
                        nullable: false,
                        type: { kind: 'primitive', name: 'string' },
                        evidence: evidence('$.models.home-block.title'),
                    },
                ],
            },
            {
                id: 'home-block-list',
                kind: 'array',
                status: 'planned',
                description: 'Liste des blocs éditoriaux.',
                evidence: evidence('$.models.home-block-list'),
                items: { kind: 'model', model_id: 'home-block' },
            },
        ],
        operations: [
            {
                id: 'cms.list-home-blocks',
                service_id: 'base-settings',
                status: 'planned',
                description: "Charge les blocs actifs de l'accueil.",
                method: 'GET',
                path: '/cms/home-block-infos/actives/pwa',
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
                        description: 'Blocs disponibles.',
                        body: {
                            media_type: 'application/json',
                            model_id: 'home-block-list',
                            envelope: {
                                kind: 'object',
                                data_field: 'data',
                                error_field: 'error',
                                message_field: 'message',
                            },
                            evidence: evidence('$.responses.200.body'),
                        },
                        evidence: evidence('$.responses.200'),
                    },
                ],
                evidence: evidence('$.operations.list-home-blocks'),
            },
        ],
    };
}

test('accepte un contrat canonique fermé, traçable et indépendant de la source', () => {
    assert.deepEqual(validateBackendContract(validContract(), schema), []);
});

test('rejette les références non résolues et les identités dupliquées', () => {
    const contract = validContract();
    contract.operations[0].service_id = 'unknown-service';
    contract.models[1].items.model_id = 'unknown-model';
    contract.models.push(structuredClone(contract.models[0]));
    const errors = validateBackendContract(contract, schema).join('\n');
    assert.match(errors, /duplicate home-block/);
    assert.match(errors, /unresolved service unknown-service/);
    assert.match(errors, /unresolved model unknown-model/);
});

test('rejette toute incohérence fail-open entre accès et sécurité', () => {
    const publicWithBearer = validContract();
    publicWithBearer.security_schemes.push({
        id: 'bearer',
        kind: 'bearer',
        description: 'Jeton utilisateur.',
        evidence: evidence('$.security.bearer'),
    });
    publicWithBearer.operations[0].access.security_scheme_ids = ['bearer'];
    assert.match(
        validateBackendContract(publicWithBearer, schema).join('\n'),
        /public access cannot declare a security scheme/
    );

    const authorizedWithoutPermission = validContract();
    authorizedWithoutPermission.security_schemes.push({
        id: 'bearer',
        kind: 'bearer',
        description: 'Jeton utilisateur.',
        evidence: evidence('$.security.bearer'),
    });
    Object.assign(authorizedWithoutPermission.operations[0].access, {
        mode: 'authorized',
        security_scheme_ids: ['bearer'],
    });
    assert.match(
        validateBackendContract(authorizedWithoutPermission, schema).join('\n'),
        /authorized access requires permissions/
    );
});

test('exige une correspondance exacte entre placeholders et paramètres de chemin', () => {
    const contract = validContract();
    contract.operations[0].path = '/requests/{id}';
    let errors = validateBackendContract(contract, schema).join('\n');
    assert.match(errors, /placeholder \{id\} has no path parameter/);

    contract.operations[0].request.parameters.push({
        name: 'other',
        in: 'path',
        description: 'Mauvais paramètre.',
        required: true,
        type: { kind: 'primitive', name: 'uuid' },
        evidence: evidence('$.parameters.other'),
    });
    errors = validateBackendContract(contract, schema).join('\n');
    assert.match(errors, /path parameter other has no placeholder/);
});

test('rejette une forme de type ou d’enveloppe ambiguë', () => {
    const contract = validContract();
    contract.models[0].fields[0].type.model_id = 'home-block';
    delete contract.operations[0].responses[0].body.envelope.data_field;
    const errors = validateBackendContract(contract, schema).join('\n');
    assert.match(errors, /invalid closed type shape/);
    assert.match(errors, /invalid closed shape/);
});

test('rejette deux identifiants qui décrivent le même endpoint HTTP', () => {
    const contract = validContract();
    const duplicate = structuredClone(contract.operations[0]);
    duplicate.id = 'cms.list-home-blocks-again';
    contract.operations.push(duplicate);
    assert.match(
        validateBackendContract(contract, schema).join('\n'),
        /duplicate \["base-settings","GET","\/cms\/home-block-infos\/actives\/pwa"\] endpoint/
    );
});

test('rejette des valeurs autorisées incompatibles avec le type du champ', () => {
    const contract = validContract();
    contract.models[0].fields[0].allowed_values = [42];
    assert.match(
        validateBackendContract(contract, schema).join('\n'),
        /value does not match string/
    );
});

test('représente une réponse tableau sans inventer de propriété items', () => {
    const contract = validContract();
    assert.deepEqual(contract.models[1], {
        id: 'home-block-list',
        kind: 'array',
        status: 'planned',
        description: 'Liste des blocs éditoriaux.',
        evidence: evidence('$.models.home-block-list'),
        items: { kind: 'model', model_id: 'home-block' },
    });
    assert.deepEqual(validateBackendContract(contract, schema), []);
});

test('sépare un analogue reference du contrat cible planned', () => {
    const dishonestPromotion = validContract();
    dishonestPromotion.sources[0].status = 'reference';
    dishonestPromotion.sources[0].authority = 'observational';
    const errors = validateBackendContract(dishonestPromotion, schema).join(
        '\n'
    );
    assert.match(errors, /planned exceeds its strongest target evidence/);

    const reference = validContract();
    reference.contract.status = 'reference';
    reference.sources[0].status = 'reference';
    reference.sources[0].authority = 'observational';
    for (const collection of [
        reference.services,
        reference.security_schemes,
        reference.models,
        reference.operations,
    ]) {
        for (const entity of collection) entity.status = 'reference';
    }
    assert.deepEqual(validateBackendContract(reference, schema), []);
});

test('le statut global reflète toujours l’élément cible le moins mature', () => {
    const contract = validContract();
    contract.sources.push({
        id: 'implementation',
        kind: 'legacy-code',
        authority: 'observational',
        status: 'implemented',
        snapshot_uri: 'contracts/implementation.ts',
        sha256: 'b'.repeat(64),
    });
    contract.operations[0].status = 'implemented';
    contract.operations[0].evidence.push({
        source_id: 'implementation',
        locator: '$.operation',
    });
    assert.deepEqual(validateBackendContract(contract, schema), []);

    contract.contract.status = 'implemented';
    assert.match(
        validateBackendContract(contract, schema).join('\n'),
        /must equal the least mature target entity/
    );
});

test('verified-live exige une observation runtime et jamais une déclaration manuelle', () => {
    const dishonest = validContract();
    dishonest.contract.status = 'verified-live';
    dishonest.sources[0].status = 'verified-live';
    dishonest.sources[0].authority = 'observational';
    for (const collection of [
        dishonest.services,
        dishonest.security_schemes,
        dishonest.models,
        dishonest.operations,
    ]) {
        for (const entity of collection) entity.status = 'verified-live';
    }
    let errors = validateBackendContract(dishonest, schema).join('\n');
    assert.match(errors, /manual sources cannot prove verified-live/);
    assert.match(errors, /verified-live requires runtime-observation evidence/);

    dishonest.sources[0].kind = 'runtime-observation';
    errors = validateBackendContract(dishonest, schema).join('\n');
    assert.doesNotMatch(errors, /verified-live requires/);
    assert.equal(errors, '');
});

test('rejette une contrainte incompatible, inversée ou une expression invalide', () => {
    const contract = validContract();
    contract.models[0].fields[0].constraints = {
        min_length: 10,
        max_length: 2,
        pattern: '[',
    };
    let errors = validateBackendContract(contract, schema).join('\n');
    assert.match(errors, /min_length exceeds max_length/);
    assert.match(errors, /invalid regular expression/);

    contract.models[0].fields[0].constraints = { minimum: 1 };
    errors = validateBackendContract(contract, schema).join('\n');
    assert.match(errors, /minimum: incompatible with declared type/);
});

test('borne la taille des expressions régulières métier avant leur analyse', () => {
    const contract = validContract();
    contract.models[0].fields[0].constraints = { pattern: 'a'.repeat(513) };
    const errors = validateBackendContract(contract, schema).join('\n');
    assert.match(errors, /must contain at most 512 chars/);
});

test('vérifie les snapshots de provenance octet par octet', async () => {
    const root = await mkdtemp(join(tmpdir(), 'backend-contract-'));
    await mkdir(join(root, 'contracts'));
    const content = Buffer.from('{"source":"manual"}\n');
    await writeFile(join(root, 'contracts/source.json'), content);
    const hash = createHash('sha256').update(content).digest('hex');
    assert.deepEqual(
        await verifyBackendContractSnapshots(
            validContract('contracts/source.json', hash),
            root
        ),
        []
    );

    await writeFile(join(root, 'contracts/source.json'), '{"tampered":true}\n');
    assert.match(
        (
            await verifyBackendContractSnapshots(
                validContract('contracts/source.json', hash),
                root
            )
        ).join('\n'),
        /sha256 mismatch/
    );
});

test('refuse traversée de chemin et snapshot symbolique', async () => {
    const root = await mkdtemp(join(tmpdir(), 'backend-contract-'));
    const outside = join(root, '..', 'outside-backend-contract.json');
    await writeFile(outside, '{}\n');
    const hash = createHash('sha256').update('{}\n').digest('hex');
    assert.match(
        (
            await verifyBackendContractSnapshots(
                validContract('../outside-backend-contract.json', hash),
                root
            )
        ).join('\n'),
        /escapes workspace/
    );

    await mkdir(join(root, 'contracts'));
    await symlink(outside, join(root, 'contracts/source.json'));
    assert.match(
        (
            await verifyBackendContractSnapshots(
                validContract('contracts/source.json', hash),
                root
            )
        ).join('\n'),
        /regular non-symlink file/
    );
});
