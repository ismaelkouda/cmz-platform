import { spawnSync } from 'node:child_process';
import { chmod, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { sha256 } from '../core/generation-manifest.mjs';
import { loadJson } from '../validate-ir.mjs';
import { prepareFixture, TOOLS_ROOT } from './external-application-fixture.mjs';
import {
    planStructuredBackendPublication,
    publishStructuredBackendContract,
} from '../core/structured-backend-publication.mjs';

const json = (value) => JSON.stringify(value, null, 2) + '\n';
export const primitive = (name) => ({ kind: 'primitive', name });
export const scalar = (type) => ({ kind: 'scalar', type });
export const objectShape = (fields) => ({
    kind: 'object',
    coverage: 'all',
    fields: Object.entries(fields).map(([name, shape]) => ({ name, shape })),
});
export const arrayShape = (items, min = 1, max = min) => ({
    kind: 'array',
    coverage: 'all',
    min_length: min,
    max_length: max,
    items,
});
export const fixtureProof = [{ source_id: 'declaration', locator: 'L1-L2' }];
const field = (name, type, nullable = false) => ({
    name,
    type,
    nullable,
    required: true,
    evidence: fixtureProof,
});

// Two fictional domains with different request/security/response shapes. No
// captured value, provider origin or network qualification is used by CI.
export async function observedBackendFixture(t, variant = 'dispatch') {
    const base = await prepareFixture(t);
    const privateRoot = join(base.parent, 'private');
    await mkdir(privateRoot, { mode: 0o700 });
    await chmod(privateRoot, 0o700);
    const dispatch = variant === 'dispatch';
    const id = dispatch ? 'submit-dispatch' : 'read-observatory';
    const method = dispatch ? 'POST' : 'GET';
    const route = dispatch ? '/dispatches' : '/observatory';
    const mapId = dispatch ? 'labels' : 'readings';
    const responseId = dispatch ? 'dispatch-result' : 'observatory-result';
    const source = 'Synthetic source declaration.\nNo network assertion.\n';
    const openapi = {
        openapi: '3.1.2',
        servers: [{ url: 'http://private-fixture.invalid/api' }],
        paths: {
            [route]: {
                [method.toLowerCase()]: {
                    operationId: id,
                    ...(dispatch
                        ? {
                              requestBody: {
                                  required: true,
                                  content: {
                                      'application/json': {
                                          schema: {
                                              $ref: '#/components/schemas/DispatchInput',
                                          },
                                      },
                                  },
                              },
                          }
                        : {
                              parameters: [
                                  {
                                      name: 'page',
                                      in: 'query',
                                      required: false,
                                      schema: { type: 'integer', minimum: 1 },
                                  },
                              ],
                          }),
                    responses: { 200: { description: 'Unknown body.' } },
                },
            },
        },
        components: {
            schemas: dispatch
                ? {
                      DispatchInput: {
                          type: 'object',
                          required: ['email'],
                          properties: {
                              email: {
                                  type: 'string',
                                  format: 'email',
                                  maxLength: 255,
                              },
                          },
                      },
                  }
                : {},
        },
    };
    const mapType = dispatch
        ? { kind: 'array', items: primitive('string') }
        : primitive('number');
    const declarations = {
        schema_version: '1.2.0',
        kind: 'sourced-backend-declarations',
        fragments: [
            {
                id: 'declaration',
                path: 'source.txt',
                sha256: sha256(source),
                commit: 'a'.repeat(40),
                start_line: 1,
                end_line: 2,
            },
        ],
        service_evidence: fixtureProof,
        security_schemes: dispatch
            ? []
            : [
                  {
                      id: 'telescope-token',
                      kind: 'bearer',
                      evidence: fixtureProof,
                  },
              ],
        models: [
            {
                id: responseId,
                kind: 'object',
                fields: [
                    field(
                        dispatch ? 'accepted' : 'enabled',
                        primitive('boolean')
                    ),
                    field(mapId, { kind: 'model', model_id: mapId }),
                    field('retired', primitive('null'), true),
                ],
                evidence: fixtureProof,
            },
            {
                id: mapId,
                kind: 'object',
                fields: [],
                additional_properties: mapType,
                evidence: fixtureProof,
            },
        ],
        operations: [
            {
                id,
                method,
                path: '/api' + route,
                access: {
                    mode: dispatch ? 'public' : 'authenticated',
                    security_scheme_ids: dispatch ? [] : ['telescope-token'],
                    permissions: [],
                },
                evidence: fixtureProof,
            },
        ],
    };
    const witnesses = {
        schema_version: '1.2.0',
        kind: 'observed-backend-witnesses',
        origin: 'fixture',
        sources: [
            {
                id: 'synthetic-declaration',
                path: 'source.txt',
                sha256: sha256(source),
            },
        ],
        qualification: 'structural-only',
        network_verified: false,
        cases: [
            {
                id: 'sample',
                method,
                path: '/api' + route,
                status: 200,
                content_type: 'application/json',
                shape: objectShape({
                    [dispatch ? 'accepted' : 'enabled']: scalar('boolean'),
                    [mapId]: {
                        kind: 'map',
                        entries: dispatch ? 50 : 2,
                        coverage: 'all',
                        values: [
                            dispatch
                                ? arrayShape([scalar('string')], 0, 4)
                                : scalar('number'),
                        ],
                    },
                    retired: { kind: 'null' },
                }),
            },
        ],
    };
    const definition = {
        schema_version: '1.2.0',
        kind: 'observed-backend-definition',
        contract: {
            id: dispatch ? 'dispatch-api' : 'observatory-api',
            version: '1.0.0',
        },
        service: {
            id: dispatch ? 'dispatch' : 'observatory',
            runtime_binding: 'private-fixture',
        },
        openapi: {
            path: 'openapi.json',
            sha256: '',
            bytes: 0,
            base_path: '/api',
            profile: { bytes: 1048576 },
        },
        binding: { path: 'binding.json', sha256: '' },
        observation: { path: 'witnesses.json', sha256: '' },
        annotations: { path: 'declarations.json', sha256: '' },
        snapshots: {
            openapi: 'descriptions/selected.openapi.json',
            observations: 'descriptions/selected.observations.json',
            declarations: 'descriptions/selected.declarations.json',
        },
        operations: [
            {
                id,
                method,
                source_path: route,
                path: '/api' + route,
                status: 200,
                case_id: 'sample',
                shape_pointer: '/cases/0',
                body_pointer: '',
                model_id: responseId,
                envelope: { kind: 'none' },
            },
        ],
    };
    const documents = {
        openapi,
        binding: {
            alias: 'private-fixture',
            origin: 'http://private-fixture.invalid',
            base_path: '/api',
        },
        observation: witnesses,
        annotations: declarations,
    };
    const definitionPath = 'descriptions/observed.definition.json';
    async function write() {
        await writeFile(join(privateRoot, 'source.txt'), source);
        for (const [name, value] of Object.entries(documents)) {
            const bytes = json(value);
            await writeFile(join(privateRoot, definition[name].path), bytes);
            definition[name].sha256 = sha256(bytes);
            if (name === 'openapi')
                definition[name].bytes = Buffer.byteLength(bytes);
        }
        await writeFile(join(base.root, definitionPath), json(definition));
    }
    await write();
    const backendContractSchema = await loadJson(
        new URL('../schemas/backend-contract.schema.json', import.meta.url)
    );
    const options = {
        workspaceRoot: TOOLS_ROOT,
        targetRoot: base.root,
        privateRoot,
        definitionPath,
        outputPath: 'descriptions/observed.backend.json',
        adapter: 'runtime-observation',
        backendContractSchema,
    };
    return {
        ...base,
        privateRoot,
        documents,
        definition,
        definitionPath,
        options,
        write,
    };
}

export async function publishObservedSources(fixture) {
    const plans = [];
    for (const [snapshotId, outputPath] of Object.entries(
        fixture.definition.snapshots
    )) {
        const options = { ...fixture.options, snapshotId, outputPath };
        const plan = await planStructuredBackendPublication(options);
        await publishStructuredBackendContract({
            ...options,
            planId: plan.plan_id,
        });
        plans.push(plan);
    }
    return plans;
}

export function observedBackendCli(fixture, extra = []) {
    return spawnSync(
        process.execPath,
        [
            join(TOOLS_ROOT, 'tools/compile-backend-contract.mjs'),
            '--adapter',
            'runtime-observation',
            '--target-root',
            fixture.root,
            '--private-root',
            fixture.privateRoot,
            '--definition',
            fixture.definitionPath,
            '--out',
            fixture.options.outputPath,
            '--dry-run',
            ...extra,
        ],
        { encoding: 'utf8' }
    );
}
