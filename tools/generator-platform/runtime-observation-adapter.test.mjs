import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile, symlink, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

import { compileRuntimeObservationModels } from './adapters/runtime-observation-adapter.mjs';
import { observationDiagnostic } from './core/runtime-observation-evidence.mjs';
import { observationModelFixture } from './test-support/observation-evidence-fixture.mjs';
import {
    hash,
    snapshotTree,
    TOOLS_ROOT,
} from './test-support/external-application-fixture.mjs';

const options = (fixture) => ({
    targetRoot: fixture.root,
    mappingPath: fixture.mappingPath,
});
const compile = (fixture) => compileRuntimeObservationModels(options(fixture));
const sentinel = 'PRIVATE_SENTINEL_MUST_NOT_LEAK_R1';
const rejected = async (fixture, code) =>
    assert.rejects(compile(fixture), (error) => {
        assert.equal(observationDiagnostic(error), code);
        assert.equal(error.stack, code);
        assert.equal(error.cause, undefined);
        assert.ok(!String(error).includes(sentinel));
        return true;
    });

for (const variant of ['parcels', 'stars'])
    test(`R1 native compilation: ${variant}`, async (t) => {
        const fixture = await observationModelFixture(t, variant);
        const before = await snapshotTree(fixture.root);
        const result = await compile(fixture);
        assert.equal(result.status, 'reference');
        assert.equal(result.network_verified, false);
        assert.equal(result.qualification, 'structural-only');
        assert.equal(result.bindings[0].fact_id, 'sample-root');
        assert.equal(
            result.sources.find(
                (source) => source.id === 'response-declarations'
            ).kind,
            'manual'
        );
        assert.deepEqual(await snapshotTree(fixture.root), before);
        if (variant === 'parcels') {
            assert.equal(
                result.request_models[0].fields[0].constraints.min_length,
                2
            );
            assert.equal(result.requests[0].request.body.required, true);
            assert.deepEqual(
                result.response_models[0].fields.map(
                    ({ name, required, nullable }) => ({
                        name,
                        required,
                        nullable,
                    })
                ),
                [
                    { name: 'accepted', required: true, nullable: false },
                    { name: 'reading', required: true, nullable: true },
                    { name: 'packages', required: true, nullable: false },
                ]
            );
            assert.ok(
                result.response_models[0].fields[0].evidence.some(
                    (entry) =>
                        entry.locator ===
                        '/operations/0/cases/0/shape/fields/0/shape'
                )
            );
            assert.ok(
                result.requests[0].request.body.evidence.some(
                    (entry) =>
                        entry.locator === '#/paths/~1parcels/post/requestBody'
                )
            );
        } else {
            assert.deepEqual(
                result.response_models.map((model) => model.kind),
                ['array', 'object']
            );
            assert.equal(result.response_models[1].fields[1].name, 'toString');
            assert.equal(
                result.requests[0].request.parameters[0].constraints.minimum,
                1
            );
            assert.equal(result.request_models.length, 0);
        }
        assert.ok(result.unknowns.includes('private-runtime-binding'));
    });

test('R1 declarations are required, reconciled and never network authority', async (t) => {
    const fixture = await observationModelFixture(t);
    const pristine = structuredClone(fixture.documents);
    async function mutate(change, code) {
        for (const key of Object.keys(pristine)) {
            if (typeof pristine[key] === 'object') {
                const target = fixture.documents[key];
                for (const name of Object.keys(target)) delete target[name];
                Object.assign(target, structuredClone(pristine[key]));
            } else fixture.documents[key] = pristine[key];
        }
        change(fixture.documents);
        await fixture.write();
        await rejected(fixture, code);
    }
    await t.test('required unknown', () =>
        mutate((d) => {
            delete d.annotations.models[0].fields[0].required;
        }, 'OBS_SCHEMA')
    );
    await t.test('nullable unknown', () =>
        mutate((d) => {
            delete d.annotations.models[0].fields[0].nullable;
        }, 'OBS_SCHEMA')
    );
    await t.test('null contradicts declaration', () =>
        mutate((d) => {
            d.annotations.models[0].fields[1].nullable = false;
        }, 'OBS_CONFLICT')
    );
    await t.test('empty array without item complement', () =>
        mutate((d) => {
            delete d.annotations.models[0].fields[2].type.items;
        }, 'OBS_SCHEMA')
    );
    await t.test('observed type contradicts declaration', () =>
        mutate((d) => {
            d.annotations.models[0].fields[0].type.name = 'string';
        }, 'OBS_CONFLICT')
    );
    await t.test('missing observed field declaration', () =>
        mutate((d) => {
            d.annotations.models[0].fields.pop();
        }, 'OBS_COMPLEMENT')
    );
    await t.test('manual promotion', () =>
        mutate((d) => {
            d.annotations.network_verified = true;
        }, 'OBS_SCHEMA')
    );
    await t.test('fixture relabelled code', () =>
        mutate((d) => {
            d.annotations.origin = 'declared-code';
        }, 'OBS_CONFLICT')
    );
    await t.test('wrong operation', () =>
        mutate((d) => {
            d.mapping.bindings[0].request.operation_id = 'other';
        }, 'OBS_BINDING')
    );
    await t.test('wrong base path', () =>
        mutate((d) => {
            d.mapping.bindings[0].request.base_path = '/v3';
        }, 'OBS_BINDING')
    );
    await t.test('wrong case', () =>
        mutate((d) => {
            d.annotations.provenance.cases[0].case_id = 'other';
        }, 'OBS_CONFLICT')
    );
    await t.test('wrong date', () =>
        mutate((d) => {
            d.annotations.provenance.captured_at = '2026-10-04T00:00:00.000Z';
        }, 'OBS_CONFLICT')
    );
    await t.test('source lines not present', () =>
        mutate((d) => {
            d.annotations.provenance.fragment.last_line = 40;
        }, 'OBS_COMPLEMENT')
    );
    await t.test('unresolved type even in empty array', () =>
        mutate((d) => {
            d.annotations.models[0].fields[2].type.items = {
                kind: 'model',
                model_id: 'missing',
            };
        }, 'OBS_COMPLEMENT')
    );
    await t.test('duplicate field', () =>
        mutate((d) => {
            d.annotations.models[0].fields.push(
                structuredClone(d.annotations.models[0].fields[0])
            );
        }, 'OBS_IDENTITY')
    );
    await t.test('prototype property rejected', () =>
        mutate((d) => {
            d.annotations.models[0].fields[0].toString = sentinel;
        }, 'OBS_SCHEMA')
    );
    await t.test(
        'dynamic dictionaries cannot become fixed observed properties',
        () =>
            mutate((d) => {
                d.annotations.models[0].kind = 'map';
                d.annotations.models[0].additionalProperties = {
                    type: 'string',
                };
            }, 'OBS_SCHEMA')
    );
    await t.test('recursive model without witness shortcut', () =>
        mutate((d) => {
            d.annotations.models[0].fields[2].type.items = {
                kind: 'model',
                model_id: 'dispatch-reply',
            };
        }, 'OBS_COMPLEMENT')
    );
});

test('R1 exact snapshots, physical paths and byte limits precede parsing', async (t) => {
    const fixture = await observationModelFixture(t);
    const p = join(fixture.root, fixture.documents.mapping.annotations.path);
    const bytes = await readFile(p);
    await writeFile(p, bytes + '\n');
    await rejected(fixture, 'OBS_HASH');
    await fixture.write();
    const fragment = join(
        fixture.root,
        fixture.documents.annotations.provenance.fragment.path
    );
    await writeFile(fragment, sentinel);
    await rejected(fixture, 'OBS_HASH');
    await fixture.write();
    await unlink(p);
    await symlink(fragment, p);
    await rejected(fixture, 'OBS_FILE');
    await unlink(p);
    await fixture.write();
    const large = Buffer.alloc(65537, 65);
    await writeFile(p, large);
    fixture.documents.mapping.annotations.sha256 = hash(large);
    await writeFile(
        join(fixture.root, fixture.mappingPath),
        JSON.stringify(fixture.documents.mapping)
    );
    await rejected(fixture, 'OBS_LIMIT');
});

test('R1 all native parser errors stay bounded and absent from stdout/stderr', async (t) => {
    const fixture = await observationModelFixture(t);
    const invalid = `{"a":"${sentinel}","a":false}`;
    const path = fixture.documents.mapping.annotations.path;
    await writeFile(join(fixture.root, path), invalid);
    fixture.documents.mapping.annotations.sha256 = hash(invalid);
    await writeFile(
        join(fixture.root, fixture.mappingPath),
        JSON.stringify(fixture.documents.mapping)
    );
    const adapter = pathToFileURL(
        join(
            TOOLS_ROOT,
            'tools/generator-platform/adapters/runtime-observation-adapter.mjs'
        )
    ).href;
    const core = pathToFileURL(
        join(
            TOOLS_ROOT,
            'tools/generator-platform/core/runtime-observation-evidence.mjs'
        )
    ).href;
    const script = `import {compileRuntimeObservationModels as compile} from ${JSON.stringify(adapter)};
        import {observationDiagnostic} from ${JSON.stringify(core)};
        try { console.log(JSON.stringify(await compile(JSON.parse(process.argv[1])))); }
        catch (error) { console.error(observationDiagnostic(error)); process.exitCode=1; }`;
    const result = spawnSync(
        process.execPath,
        ['--input-type=module', '-e', script, JSON.stringify(options(fixture))],
        { encoding: 'utf8', timeout: 30000, maxBuffer: 1048576 }
    );
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr.trim(), 'OBS_PARSE');
    assert.ok(!(result.stdout + result.stderr).includes(sentinel));
});

test('R1 private metadata and values do not appear in the candidate', async (t) => {
    const fixture = await observationModelFixture(t);
    const d = fixture.documents;
    d.openapi.servers = [{ url: 'http://127.0.0.1:9876/' }];
    d.openapi.info = { title: sentinel, description: sentinel };
    d.openapi.components.schemas.ParcelInput.description = sentinel;
    d.openapi.components.schemas.ParcelInput.properties.label.description =
        sentinel;
    d.annotations.provenance.image_digest = 'sha256:' + 'e'.repeat(64);
    d.fragment = sentinel + '\n';
    d.openapi.components.schemas.Unused = { oneOf: [{ type: 'null' }] };
    d.annotations.models.push({
        id: 'unselected',
        kind: 'scalar',
        type: { kind: 'primitive', name: 'boolean' },
    });
    await fixture.write();
    const result = await compile(fixture);
    const serialized = JSON.stringify(result);
    for (const forbidden of [
        sentinel,
        '127.0.0.1',
        'sha256:' + 'e'.repeat(64),
        'unselected',
    ])
        assert.ok(!serialized.includes(forbidden));
    assert.equal(result.network_verified, false);
    assert.deepEqual(
        result.request_models.map((model) => model.id),
        ['parcel-input']
    );
});
