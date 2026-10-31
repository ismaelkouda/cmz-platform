import { spawnSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { sha256 } from '../core/generation-manifest.mjs';
import { prepareFixture, TOOLS_ROOT } from './external-application-fixture.mjs';

const json = (value) => JSON.stringify(value, null, 2) + '\n';

// Both datasets are synthetic structural declarations, not captured traffic.
export function observationDocuments() {
    const notes = {
        schema_version: '1.0.0',
        kind: 'observation-projection',
        source_id: 'notes-fixture',
        origin: 'fixture',
        captured_at: '2026-10-01T00:00:00.000Z',
        context_alias: 'synthetic-notes',
        operations: [
            {
                id: 'list-notes',
                method: 'GET',
                path: '/notes',
                cases: [
                    {
                        id: 'one-note',
                        status: 200,
                        content_type: 'application/json',
                        shape: {
                            kind: 'array',
                            length: 1,
                            items: [
                                {
                                    kind: 'object',
                                    fields: [
                                        {
                                            name: 'title',
                                            shape: {
                                                kind: 'scalar',
                                                type: 'string',
                                            },
                                        },
                                        {
                                            name: 'a/b~c',
                                            shape: { kind: 'null' },
                                        },
                                        {
                                            name: 'optional',
                                            shape: { kind: 'absent' },
                                        },
                                    ],
                                },
                            ],
                        },
                    },
                    {
                        id: 'empty-notes',
                        status: 200,
                        content_type: 'application/json',
                        shape: { kind: 'array', length: 0, items: [] },
                    },
                ],
            },
        ],
    };
    const meter = {
        schema_version: '1.0.0',
        kind: 'observation-projection',
        source_id: 'meter-fixture',
        origin: 'fixture',
        captured_at: '2026-10-02T00:00:00.000Z',
        context_alias: 'synthetic-meter',
        operations: [
            {
                id: 'read-meter',
                method: 'GET',
                path: '/meter',
                cases: [
                    {
                        id: 'boolean-status',
                        status: 200,
                        content_type: 'application/json',
                        shape: { kind: 'scalar', type: 'boolean' },
                    },
                    {
                        id: 'integer-status',
                        status: 200,
                        content_type: 'application/json',
                        shape: { kind: 'scalar', type: 'integer' },
                    },
                    {
                        id: 'error',
                        status: 503,
                        content_type: 'application/problem+json',
                        shape: {
                            kind: 'object',
                            fields: [
                                {
                                    name: 'code',
                                    shape: { kind: 'scalar', type: 'string' },
                                },
                            ],
                        },
                    },
                ],
            },
        ],
    };
    const selection = {
        schema_version: '1.0.0',
        kind: 'observation-selection',
        sources: [
            {
                id: notes.source_id,
                path: 'descriptions/notes.projection.json',
                sha256: sha256(json(notes)),
            },
            {
                id: meter.source_id,
                path: 'descriptions/meter.projection.json',
                sha256: sha256(json(meter)),
            },
        ],
        facts: [
            ...notes.operations[0].cases.map((entry, index) => ({
                id: 'notes-' + index,
                source_id: notes.source_id,
                operation_id: 'list-notes',
                case_id: entry.id,
                pointer: `/operations/0/cases/${index}/shape`,
                expected: structuredClone(entry.shape),
            })),
            ...meter.operations[0].cases.map((entry, index) => ({
                id: 'meter-' + index,
                source_id: meter.source_id,
                operation_id: 'read-meter',
                case_id: entry.id,
                pointer: `/operations/0/cases/${index}/shape`,
                expected: structuredClone(entry.shape),
            })),
        ],
    };
    return { projections: [notes, meter], selection };
}

export async function observationFixture(t) {
    const fixture = await prepareFixture(t);
    const documents = observationDocuments();
    const selectionPath = 'descriptions/inspection.selection.json';
    async function write(next = documents) {
        for (const [index, projection] of next.projections.entries()) {
            const source = next.selection.sources[index];
            const bytes = json(projection);
            source.sha256 = sha256(bytes);
            await writeFile(join(fixture.root, source.path), bytes);
        }
        await writeFile(
            join(fixture.root, selectionPath),
            json(next.selection)
        );
    }
    await write();
    return { ...fixture, documents, selectionPath, write };
}

export function inspectionCli(root, selectionPath, extra = []) {
    return spawnSync(
        process.execPath,
        [
            join(TOOLS_ROOT, 'tools/inspect-runtime-observations.mjs'),
            '--target-root',
            root,
            '--selection',
            selectionPath,
            ...extra,
        ],
        {
            cwd: TOOLS_ROOT,
            encoding: 'utf8',
            timeout: 30000,
            maxBuffer: 1048576,
        }
    );
}
