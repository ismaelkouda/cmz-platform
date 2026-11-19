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

// R1 corpora are fictitious and structurally different. Neither is live proof.
export async function observationModelFixture(t, variant = 'parcels') {
    const fixture = await prepareFixture(t);
    const parcels = variant === 'parcels';
    const scalar = (type) => ({ kind: 'scalar', type });
    const primitive = (name) => ({ kind: 'primitive', name });
    const field = (name, type, nullable = false) => ({
        name,
        required: true,
        nullable,
        type,
    });
    const operation = {
        id: parcels ? 'submit-parcel' : 'list-stars',
        method: parcels ? 'POST' : 'GET',
        path: parcels ? '/parcels' : '/stars',
    };
    const shape = parcels
        ? {
              kind: 'object',
              fields: [
                  { name: 'accepted', shape: scalar('boolean') },
                  { name: 'reading', shape: { kind: 'null' } },
                  {
                      name: 'packages',
                      shape: { kind: 'array', length: 0, items: [] },
                  },
              ],
          }
        : {
              kind: 'array',
              length: 1,
              items: [
                  {
                      kind: 'object',
                      fields: [
                          { name: 'luminosity', shape: scalar('number') },
                          { name: 'toString', shape: scalar('string') },
                      ],
                  },
              ],
          };
    const projection = {
        schema_version: '1.0.0',
        kind: 'observation-projection',
        source_id: variant + '-fixture',
        origin: 'fixture',
        captured_at: '2026-10-03T00:00:00.000Z',
        context_alias: 'synthetic-' + variant,
        operations: [
            {
                ...operation,
                cases: [
                    {
                        id: 'sample',
                        status: 200,
                        content_type: 'application/json',
                        shape,
                    },
                ],
            },
        ],
    };
    const inspection = {
        schema_version: '1.0.0',
        kind: 'observation-selection',
        sources: [
            {
                id: projection.source_id,
                path: 'descriptions/model.projection.json',
                sha256: '',
            },
        ],
        facts: [
            {
                id: 'sample-root',
                source_id: projection.source_id,
                operation_id: operation.id,
                case_id: 'sample',
                pointer: '/operations/0/cases/0/shape',
                expected: structuredClone(shape),
            },
        ],
    };
    const openapi = {
        openapi: '3.1.2',
        components: {
            schemas: parcels
                ? {
                      ParcelInput: {
                          type: 'object',
                          description: 'Parcel request.',
                          additionalProperties: false,
                          required: ['label'],
                          properties: {
                              label: {
                                  type: 'string',
                                  minLength: 2,
                                  description: 'Parcel label.',
                              },
                          },
                      },
                  }
                : {},
        },
        paths: {
            [operation.path]: {
                [operation.method.toLowerCase()]: {
                    operationId: parcels ? 'submitParcel' : 'listStars',
                    security: [],
                    ...(parcels
                        ? {
                              requestBody: {
                                  required: true,
                                  content: {
                                      'application/json': {
                                          schema: {
                                              $ref: '#/components/schemas/ParcelInput',
                                          },
                                      },
                                  },
                              },
                          }
                        : {
                              parameters: [
                                  {
                                      name: 'limit',
                                      in: 'query',
                                      required: false,
                                      description: 'Maximum results.',
                                      schema: { type: 'integer', minimum: 1 },
                                  },
                              ],
                          }),
                    responses: {
                        200: {
                            description: 'Untyped response.',
                            content: {
                                'application/json': {
                                    schema: { type: 'object' },
                                },
                            },
                        },
                    },
                },
            },
        },
    };
    const fragment =
        'Synthetic declaration; never a capture or executable source.\n';
    const annotations = {
        schema_version: '1.1.0',
        kind: 'observation-model-annotations',
        origin: 'fixture',
        provenance: {
            context_alias: projection.context_alias,
            service_commit: 'a'.repeat(40),
            image_digest: 'sha256:' + 'b'.repeat(64),
            acquisition_id: 'synthetic-' + variant,
            captured_at: projection.captured_at,
            observation_sha256: '',
            base_path: '/v1.0',
            fragment: {
                path: 'descriptions/reference.txt',
                sha256: '',
                first_line: 1,
                last_line: 1,
            },
            cases: [
                {
                    operation_id: operation.id,
                    method: operation.method,
                    path: operation.path,
                    case_id: 'sample',
                    status: 200,
                    content_type: 'application/json',
                },
            ],
        },
        models: parcels
            ? [
                  {
                      id: 'dispatch-reply',
                      kind: 'object',
                      fields: [
                          field('accepted', primitive('boolean')),
                          field('reading', primitive('number'), true),
                          field('packages', {
                              kind: 'array',
                              items: primitive('integer'),
                          }),
                      ],
                  },
              ]
            : [
                  {
                      id: 'constellation',
                      kind: 'array',
                      items: { kind: 'model', model_id: 'star-item' },
                  },
                  {
                      id: 'star-item',
                      kind: 'object',
                      fields: [
                          field('luminosity', primitive('number')),
                          field('toString', primitive('string')),
                      ],
                  },
              ],
    };
    const mapping = {
        schema_version: '1.1.0',
        kind: 'observation-model-selection',
        observations: {
            path: 'descriptions/model.inspection.json',
            sha256: '',
        },
        openapi: {
            id: 'request-spec',
            path: 'descriptions/model.openapi.json',
            sha256: '',
        },
        annotations: {
            id: 'response-declarations',
            path: 'descriptions/model.annotations.json',
            sha256: '',
        },
        bindings: [
            {
                fact_id: 'sample-root',
                response_model_id: parcels ? 'dispatch-reply' : 'constellation',
                request: {
                    operation_id: operation.id,
                    method: operation.method,
                    path: operation.path,
                    base_path: '/v1.0',
                },
            },
        ],
    };
    const documents = {
        projection,
        inspection,
        openapi,
        annotations,
        mapping,
        fragment,
    };
    const mappingPath = 'descriptions/models.selection.json';
    async function write() {
        const save = async (path, bytes) => {
            await writeFile(join(fixture.root, path), bytes);
            return sha256(bytes);
        };
        annotations.provenance.fragment.sha256 = await save(
            annotations.provenance.fragment.path,
            documents.fragment
        );
        inspection.sources[0].sha256 = await save(
            inspection.sources[0].path,
            json(projection)
        );
        annotations.provenance.observation_sha256 =
            inspection.sources[0].sha256;
        mapping.observations.sha256 = await save(
            mapping.observations.path,
            json(inspection)
        );
        mapping.openapi.sha256 = await save(
            mapping.openapi.path,
            json(openapi)
        );
        mapping.annotations.sha256 = await save(
            mapping.annotations.path,
            json(annotations)
        );
        await save(mappingPath, json(mapping));
    }
    await write();
    return { ...fixture, documents, mappingPath, write };
}
