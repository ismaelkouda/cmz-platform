import assert from 'node:assert/strict';
import {
    readFile,
    rename,
    symlink,
    truncate,
    unlink,
    writeFile,
} from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

import { parseArgs } from '../inspect-runtime-observations.mjs';
import {
    inspectRuntimeObservations,
    observationDiagnostic,
    OBSERVATION_LIMITS,
    resolveObservationPointer,
} from './core/runtime-observation-evidence.mjs';
import { sha256, stableStringify } from './core/generation-manifest.mjs';
import { validateJsonSchema } from './validate-ir.mjs';
import {
    snapshotTree,
    TOOLS_ROOT,
} from './test-support/external-application-fixture.mjs';
import {
    inspectionCli,
    observationDocuments,
    observationFixture,
} from './test-support/observation-evidence-fixture.mjs';

const SENTINEL = 'FICTITIOUS_SECRET_MUST_NEVER_REACH_DIAGNOSTICS';
const json = (value) => JSON.stringify(value, null, 2) + '\n';
const inspect = (fixture) =>
    inspectRuntimeObservations({
        targetRoot: fixture.root,
        selectionPath: fixture.selectionPath,
    });

function rejectedCli(result, code) {
    assert.equal(result.error, undefined);
    assert.equal(result.signal, null);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /^OBS_[A-Z]+\n$/);
    if (code) assert.equal(result.stderr, code + '\n');
    assert.ok(result.stderr.length <= 32);
    assert.ok(!result.stderr.includes(SENTINEL));
}

async function rejectedCore(fixture, code) {
    await assert.rejects(inspect(fixture), (error) => {
        assert.equal(observationDiagnostic(error), code);
        assert.equal(error.message, code);
        assert.equal(error.stack, code);
        assert.equal(error.cause, undefined);
        assert.ok(!JSON.stringify(error).includes(SENTINEL));
        return true;
    });
}

test('inspection CLI: two independent synthetic datasets, unknowns and no writes', async (t) => {
    const fixture = await observationFixture(t);
    const before = await snapshotTree(fixture.root);
    const result = inspectionCli(fixture.root, fixture.selectionPath);
    assert.equal(result.error, undefined);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, '');
    const inventory = JSON.parse(result.stdout);
    assert.equal(result.stdout, stableStringify(inventory) + '\n');
    assert.deepEqual(await snapshotTree(fixture.root), before);
    assert.equal(inventory.kind, 'observation-inventory');
    assert.equal(inventory.qualification, 'structural-only');
    assert.equal(inventory.network_verified, false);
    assert.equal(inventory.facts.length, 5);
    assert.deepEqual(
        inventory.sources.map((source) => source.origin),
        ['fixture', 'fixture']
    );
    assert.equal(
        inventory.selection_sha256,
        sha256(await readFile(join(fixture.root, fixture.selectionPath)))
    );
    assert.deepEqual(
        inventory.facts.map((fact) => fact.observation),
        fixture.documents.selection.facts.map((fact) => fact.expected)
    );
    assert.ok(inventory.facts[0].unknowns.includes('non-null-type'));
    assert.ok(inventory.facts[0].unknowns.includes('presence-guarantee'));
    assert.ok(inventory.facts[1].unknowns.includes('item-type'));
    assert.deepEqual(
        inventory.facts.map((fact) => fact.status),
        [200, 200, 200, 200, 503]
    );
    assert.equal(inventory.facts[4].content_type, 'application/problem+json');
    assert.notEqual(inventory.sources[0].sha256, inventory.sources[1].sha256);
    for (const fact of inventory.facts) {
        assert.ok(fact.unknowns.includes('network-authenticity'));
        assert.ok(fact.unknowns.includes('permissions'));
        assert.ok(fact.unknowns.includes('required-fields'));
    }
    assert.ok(!result.stdout.includes('verified-live'));
    const schema = JSON.parse(
        await readFile(
            join(
                TOOLS_ROOT,
                'tools/generator-platform/schemas/observation-evidence.schema.json'
            ),
            'utf8'
        )
    );
    assert.deepEqual(validateJsonSchema(inventory, schema), []);
    const forged = { ...inventory, network_verified: true };
    assert.notEqual(validateJsonSchema(forged, schema).length, 0);
    const selected = observationDocuments();
    selected.selection.facts = [1, 2].map((index) => ({
        id: 'field-' + index,
        source_id: 'notes-fixture',
        operation_id: 'list-notes',
        case_id: 'one-note',
        pointer: `/operations/0/cases/0/shape/items/0/fields/${index}/shape`,
        expected: { kind: index === 1 ? 'null' : 'absent' },
    }));
    await fixture.write(selected);
    assert.deepEqual(
        (await inspect(fixture)).facts.map((fact) => fact.observation),
        [{ kind: 'null' }, { kind: 'absent' }]
    );
});

test('RFC6901: escapes, own keys, no normalization and null/false/zero/absence', () => {
    const value = JSON.parse(
        '{"a/b":{"~1":false},"":0,"n":null,"array":[0,false,null],"é":1,"é":2,"__proto__":3,"%2F":4}'
    );
    assert.equal(resolveObservationPointer(value, ''), value);
    assert.equal(resolveObservationPointer(value, '/'), 0);
    assert.equal(resolveObservationPointer(value, '/a~1b/~01'), false);
    assert.equal(resolveObservationPointer(value, '/n'), null);
    assert.equal(resolveObservationPointer(value, '/array/0'), 0);
    assert.equal(resolveObservationPointer(value, '/array/1'), false);
    assert.equal(resolveObservationPointer(value, '/array/2'), null);
    assert.equal(resolveObservationPointer(value, '/é'), 1);
    assert.equal(resolveObservationPointer(value, '/é'), 2);
    assert.equal(resolveObservationPointer(value, '/__proto__'), 3);
    assert.equal(resolveObservationPointer(value, '/%2F'), 4);
    for (const pointer of [
        '/missing',
        '/toString',
        '/constructor',
        '/array/length',
        '/array/01',
        '/array/+1',
        '/array/-1',
        '/array/1.0',
        '/array/-',
        '/array/3',
        '/array/9007199254740993',
        '/array/0/x',
        '/n/x',
        '/~',
        '/~2',
        '#/n',
        'n',
    ]) {
        assert.throws(
            () => resolveObservationPointer(value, pointer),
            (error) => observationDiagnostic(error) === 'OBS_POINTER'
        );
    }
    assert.throws(() =>
        resolveObservationPointer(Object.create({ secret: true }), '/secret')
    );
});

test('CLI arguments are explicit, unique and cannot change output or provenance', () => {
    assert.deepEqual(
        parseArgs(['--selection', 's.json', '--target-root', '/product']),
        {
            selectionPath: 's.json',
            targetRoot: '/product',
        }
    );
    for (const args of [
        [],
        ['--selection', 's.json'],
        ['--selection', 's.json', '--selection', 'other.json'],
        ['--out', SENTINEL, '--target-root', '/product'],
        ['--target-root', '', '--selection', 's.json'],
        ['--target-root', '/product', '--selection', '--apply'],
    ])
        assert.equal(parseArgs(args), null);
});

test('hash and fact bindings: byte drift, exchanged source, wrong case/operation/assertion', async (t) => {
    const fixture = await observationFixture(t);
    await t.test('one byte changed, without rebinding selection', async () => {
        const path = join(
            fixture.root,
            fixture.documents.selection.sources[0].path
        );
        await writeFile(path, (await readFile(path)).toString() + ' ');
        await rejectedCore(fixture, 'OBS_HASH');
    });
    await t.test(
        'source bytes exchanged between independent datasets',
        async () => {
            await fixture.write(observationDocuments());
            const sources = fixture.documents.selection.sources;
            await writeFile(
                join(fixture.root, sources[0].path),
                await readFile(join(fixture.root, sources[1].path))
            );
            await rejectedCore(fixture, 'OBS_HASH');
        }
    );
    const cases = [
        [
            'false source id',
            (d) => {
                d.selection.facts[0].source_id = 'absent';
            },
            'OBS_IDENTITY',
        ],
        [
            'wrong operation',
            (d) => {
                d.selection.facts[0].operation_id = 'other';
            },
            'OBS_BINDING',
        ],
        [
            'valid pointer into another case with matching shape',
            (d) => {
                d.selection.facts[0].pointer = '/operations/0/cases/1/shape';
                d.selection.facts[0].expected =
                    d.projections[0].operations[0].cases[1].shape;
            },
            'OBS_BINDING',
        ],
        [
            'valid pointer into another operation',
            (d) => {
                const other = structuredClone(d.projections[0].operations[0]);
                other.id = 'other-operation';
                d.projections[0].operations.push(other);
                d.selection.facts[0].pointer = '/operations/1/cases/0/shape';
            },
            'OBS_BINDING',
        ],
        [
            'different structural fact',
            (d) => {
                d.selection.facts[0].expected = { kind: 'null' };
            },
            'OBS_ASSERTION',
        ],
        [
            'missing pointer',
            (d) => {
                d.selection.facts[0].pointer = '/operations/0/cases/0/absent';
            },
            'OBS_POINTER',
        ],
        [
            'ambiguous array index',
            (d) => {
                d.selection.facts[0].pointer = '/operations/00/cases/0/shape';
            },
            'OBS_POINTER',
        ],
        [
            'metadata instead of shape',
            (d) => {
                d.selection.facts[0].pointer = '/operations/0';
            },
            'OBS_BINDING',
        ],
    ];
    for (const [name, mutate, code] of cases)
        await t.test(name, async () => {
            const documents = observationDocuments();
            mutate(documents);
            await fixture.write(documents);
            await rejectedCore(fixture, code);
        });
    await fixture.write(observationDocuments());
    assert.equal((await inspect(fixture)).facts.length, 5);
});

test('duplicate identities, raw data and unsupported assurance are refused', async (t) => {
    const fixture = await observationFixture(t);
    const mutations = [
        [
            'source id',
            (d) => {
                d.selection.sources[1].id = d.selection.sources[0].id;
            },
            'OBS_IDENTITY',
        ],
        [
            'source path',
            (d) => {
                d.selection.sources[1].path = d.selection.sources[0].path;
            },
            'OBS_IDENTITY',
        ],
        [
            'fact id',
            (d) => {
                d.selection.facts[1].id = d.selection.facts[0].id;
            },
            'OBS_IDENTITY',
        ],
        [
            'operation id',
            (d) => {
                d.projections[0].operations.push(
                    structuredClone(d.projections[0].operations[0])
                );
            },
            'OBS_IDENTITY',
        ],
        [
            'case id',
            (d) => {
                d.projections[0].operations[0].cases[1].id = 'one-note';
            },
            'OBS_IDENTITY',
        ],
        [
            'field name',
            (d) => {
                d.projections[0].operations[0].cases[0].shape.items[0].fields[1].name =
                    'title';
            },
            'OBS_IDENTITY',
        ],
        [
            'raw header',
            (d) => {
                d.projections[0].headers = { authorization: SENTINEL };
            },
            'OBS_SCHEMA',
        ],
        [
            'raw response',
            (d) => {
                d.projections[0].operations[0].cases[0].body = SENTINEL;
            },
            'OBS_SCHEMA',
        ],
        [
            'scalar value',
            (d) => {
                d.projections[1].operations[0].cases[0].shape.value = false;
            },
            'OBS_SCHEMA',
        ],
        [
            'raw origin URL',
            (d) => {
                d.projections[0].operations[0].path =
                    'https://invalid.example/' + SENTINEL;
            },
            'OBS_SCHEMA',
        ],
        [
            'query data',
            (d) => {
                d.projections[0].operations[0].path =
                    '/notes?token=' + SENTINEL;
            },
            'OBS_SCHEMA',
        ],
        [
            'verified-live',
            (d) => {
                d.projections[0].origin = 'verified-live';
            },
            'OBS_SCHEMA',
        ],
        [
            'invented status',
            (d) => {
                d.projections[0].status = 'verified-live';
            },
            'OBS_SCHEMA',
        ],
        [
            'invalid date',
            (d) => {
                d.projections[0].captured_at = '2026-02-30T00:00:00.000Z';
            },
            'OBS_SCHEMA',
        ],
        [
            'array count mismatch',
            (d) => {
                d.projections[0].operations[0].cases[0].shape.length = 0;
            },
            'OBS_SCHEMA',
        ],
    ];
    for (const [name, mutate, code] of mutations)
        await t.test(name, async () => {
            const documents = observationDocuments();
            mutate(documents);
            await fixture.write(documents);
            await rejectedCore(fixture, code);
            rejectedCli(
                inspectionCli(fixture.root, fixture.selectionPath),
                code
            );
        });
    const documents = observationDocuments();
    documents.projections[1].origin = 'declared-observation';
    await fixture.write(documents);
    const inventory = await inspect(fixture);
    assert.deepEqual(
        inventory.sources.map((source) => source.origin),
        ['fixture', 'declared-observation']
    );
    assert.equal(inventory.network_verified, false);
    assert.equal(inventory.qualification, 'structural-only');
});

test('closed schemas reject inherited names in shapes, assertions and sources', async (t) => {
    const fixture = await observationFixture(t);
    const positions = ['shape', 'expected', 'both', 'source', 'projection'];
    // Enumerate the runtime prototype, not a second production blacklist.
    for (const key of Object.getOwnPropertyNames(Object.prototype)) {
        for (const position of positions) {
            await t.test(`${position}: own ${key}`, async () => {
                const documents = observationDocuments();
                const projection = documents.projections[1];
                const shape = projection.operations[0].cases[0].shape;
                const expected = documents.selection.facts[2].expected;
                const source = documents.selection.sources[1];
                const targets = {
                    shape: [shape],
                    expected: [expected],
                    both: [shape, expected],
                    source: [source],
                    projection: [projection],
                };
                for (const target of targets[position]) {
                    Object.defineProperty(target, key, {
                        value: SENTINEL,
                        enumerable: true,
                        configurable: true,
                        writable: true,
                    });
                    assert.equal(Object.hasOwn(target, key), true);
                }
                // Rebind only fixture hashes, so schema closure, rather than
                // a hash mismatch, must reject even coherent shape/expected.
                await fixture.write(documents);
                const before = await snapshotTree(fixture.root);
                await rejectedCore(fixture, 'OBS_SCHEMA');
                rejectedCli(
                    inspectionCli(fixture.root, fixture.selectionPath),
                    'OBS_SCHEMA'
                );
                assert.deepEqual(await snapshotTree(fixture.root), before);
            });
        }
    }

    const documents = observationDocuments();
    const shape = documents.projections[0].operations[0].cases[0].shape;
    shape.items[0].fields[0].name = 'toString';
    documents.selection.facts[0].expected = structuredClone(shape);
    await fixture.write(documents);
    const before = await snapshotTree(fixture.root);
    const inventory = await inspect(fixture);
    assert.equal(
        inventory.facts[0].observation.items[0].fields[0].name,
        'toString'
    );
    const result = inspectionCli(fixture.root, fixture.selectionPath);
    assert.equal(result.error, undefined);
    assert.equal(result.signal, null);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, '');
    assert.deepEqual(JSON.parse(result.stdout), inventory);
    assert.equal(inventory.network_verified, false);
    assert.deepEqual(await snapshotTree(fixture.root), before);
});

test('parser and file diagnostics never expose malformed-input sentinels', async (t) => {
    const fixture = await observationFixture(t);
    for (const text of [
        `{"x":"${SENTINEL}","x":"${SENTINEL}"}`,
        `{"x":"${SENTINEL}":null}`,
        `{"x": ["${SENTINEL}"]`,
    ]) {
        await writeFile(join(fixture.root, fixture.selectionPath), text);
        await rejectedCore(fixture, 'OBS_PARSE');
        rejectedCli(
            inspectionCli(fixture.root, fixture.selectionPath),
            'OBS_PARSE'
        );
    }
    // Failure in the SECOND projection must not publish an earlier partial result.
    await fixture.write(observationDocuments());
    const documents = observationDocuments();
    const malformed = `{"x":"${SENTINEL}","x":0}`;
    documents.selection.sources[1].sha256 = sha256(malformed);
    await writeFile(
        join(fixture.root, documents.selection.sources[1].path),
        malformed
    );
    await writeFile(
        join(fixture.root, fixture.selectionPath),
        json(documents.selection)
    );
    await rejectedCore(fixture, 'OBS_PARSE');
    const before = await snapshotTree(fixture.root);
    rejectedCli(
        inspectionCli(fixture.root, fixture.selectionPath),
        'OBS_PARSE'
    );
    assert.deepEqual(await snapshotTree(fixture.root), before);
    rejectedCli(
        inspectionCli(fixture.root, 'descriptions/' + SENTINEL + '.json'),
        'OBS_FILE'
    );
    rejectedCli(
        inspectionCli(fixture.root, fixture.selectionPath, ['--' + SENTINEL]),
        'OBS_ARGUMENTS'
    );
    assert.equal(observationDiagnostic(new Error(SENTINEL)), 'OBS_INTERNAL');
});

test('bounds reject before parsing and before recursive schema validation', async (t) => {
    const fixture = await observationFixture(t);
    const path = join(fixture.root, fixture.selectionPath);
    await writeFile(path, SENTINEL);
    await truncate(path, OBSERVATION_LIMITS.documentBytes + 1);
    await rejectedCore(fixture, 'OBS_LIMIT');
    rejectedCli(
        inspectionCli(fixture.root, fixture.selectionPath),
        'OBS_LIMIT'
    );
    await writeFile(
        path,
        '{"x":' + '['.repeat(25) + '0' + ']'.repeat(25) + '}'
    );
    await rejectedCore(fixture, 'OBS_LIMIT');
    await writeFile(path, json({ x: 'x'.repeat(1025) }));
    await rejectedCore(fixture, 'OBS_LIMIT');
    const tooMany = observationDocuments();
    tooMany.selection.facts = Array.from({ length: 65 }, (_, index) => ({
        ...tooMany.selection.facts[0],
        id: 'fact-' + index,
        expected: { kind: 'null' },
    }));
    await fixture.write(tooMany);
    await rejectedCore(fixture, 'OBS_LIMIT');
    const tooWide = observationDocuments();
    const shape = tooWide.projections[0].operations[0].cases[0].shape.items[0];
    shape.fields = Array.from({ length: 33 }, (_, index) => ({
        name: 'field' + index,
        shape: { kind: 'null' },
    }));
    await fixture.write(tooWide);
    await rejectedCore(fixture, 'OBS_LIMIT');
    await fixture.write(observationDocuments());
    assert.equal((await inspect(fixture)).facts.length, 5);
    const marker = join(fixture.root, '.cmz/application-workspace.json');
    const original = await readFile(marker);
    await truncate(marker, OBSERVATION_LIMITS.markerBytes + 1);
    await rejectedCore(fixture, 'OBS_LIMIT');
    await writeFile(marker, original);
    const source = join(
        fixture.root,
        fixture.documents.selection.sources[0].path
    );
    await truncate(source, OBSERVATION_LIMITS.documentBytes + 1);
    await rejectedCore(fixture, 'OBS_LIMIT');
});

test('physical roots, traversal, symbolic leaves/ancestors and ownership drift', async (t) => {
    const fixture = await observationFixture(t);
    for (const path of [
        '../escape.json',
        '/absolute.json',
        'descriptions/../escape.json',
        '.cmz/application-workspace.json',
        'package.json',
    ])
        rejectedCli(inspectionCli(fixture.root, path), 'OBS_FILE');
    rejectedCli(inspectionCli(TOOLS_ROOT, fixture.selectionPath), 'OBS_ROOT');
    rejectedCli(
        inspectionCli(join(fixture.parent, 'missing'), fixture.selectionPath),
        'OBS_ROOT'
    );
    rejectedCli(inspectionCli(fixture.parent, fixture.selectionPath));
    rejectedCli(inspectionCli('relative', fixture.selectionPath), 'OBS_ROOT');
    const original = join(fixture.root, fixture.selectionPath);
    const saved = original + '.saved';
    await rename(original, saved);
    await symlink(saved, original);
    rejectedCli(inspectionCli(fixture.root, fixture.selectionPath), 'OBS_FILE');
    await unlink(original);
    await rename(saved, original);
    const descriptions = join(fixture.root, 'descriptions');
    await rename(descriptions, descriptions + '-saved');
    await symlink(descriptions + '-saved', descriptions);
    rejectedCli(inspectionCli(fixture.root, fixture.selectionPath));
    await unlink(descriptions);
    await rename(descriptions + '-saved', descriptions);
    const alias = join(fixture.parent, 'alias');
    await symlink(fixture.root, alias);
    rejectedCli(inspectionCli(alias, fixture.selectionPath), 'OBS_ROOT');
    const owned = join(fixture.root, 'package.json');
    const bytes = await readFile(owned);
    await writeFile(owned, bytes.toString() + ' ');
    rejectedCli(inspectionCli(fixture.root, fixture.selectionPath), 'OBS_ROOT');
    await writeFile(owned, bytes);
    assert.equal((await inspect(fixture)).facts.length, 5);
});
