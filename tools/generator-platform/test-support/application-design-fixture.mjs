import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
    compileStructuredBackendDefinition,
    serializeCanonicalBackendContract,
} from '../core/structured-backend-adapter.mjs';

export function sha256(content) {
    return createHash('sha256').update(content).digest('hex');
}

function evidence() {
    return [
        { source_id: 'clean-street-brief', locator: 'validated-project-sheet' },
    ];
}

export function backendDefinition() {
    return {
        schema_version: '1.0.0',
        kind: 'backend-contract-definition',
        contract: {
            id: 'clean-street-api',
            title: 'Clean Street API',
            version: '1.0.0',
            status: 'planned',
            description: 'Planned target API.',
        },
        source: { id: 'clean-street-api-plan', authority: 'declared' },
        services: [
            {
                id: 'public-api',
                description: 'Citizen API.',
                base_urls: [
                    {
                        environment: 'development',
                        url: 'https://api.clean-street.example/v1/',
                    },
                ],
            },
        ],
        security_schemes: [
            {
                id: 'citizen-token',
                kind: 'bearer',
                description: 'Citizen session token.',
            },
        ],
        models: [
            {
                id: 'create-report',
                kind: 'object',
                description: 'New waste report.',
                fields: [
                    {
                        name: 'description',
                        description: 'Waste description.',
                        required: true,
                        nullable: false,
                        type: { kind: 'primitive', name: 'string' },
                    },
                ],
            },
            {
                id: 'report',
                kind: 'object',
                description: 'Created waste report.',
                fields: [
                    {
                        name: 'id',
                        description: 'Stable report id.',
                        required: true,
                        nullable: false,
                        type: { kind: 'primitive', name: 'uuid' },
                    },
                ],
            },
        ],
        operations: [
            {
                id: 'create-report',
                service_id: 'public-api',
                description: 'Create one waste report.',
                method: 'POST',
                path: '/reports',
                access: {
                    mode: 'authenticated',
                    security_scheme_ids: ['citizen-token'],
                    permissions: [],
                },
                request: {
                    parameters: [],
                    body: {
                        required: true,
                        media_types: ['application/json'],
                        model_id: 'create-report',
                    },
                },
                responses: [
                    {
                        status: 201,
                        outcome: 'success',
                        description: 'Report created.',
                        body: {
                            media_type: 'application/json',
                            model_id: 'report',
                            envelope: { kind: 'none' },
                        },
                    },
                ],
            },
        ],
    };
}

export function applicationDesign(briefHash, contractHash, pathPrefix = '') {
    const prefixed = (path) => (pathPrefix ? `${pathPrefix}/${path}` : path);
    const landingId = 'page_1111111111111111';
    const reportId = 'page_2222222222222222';
    return {
        schema_version: '1.0.0',
        kind: 'application-design',
        design: {
            id: 'clean-street',
            title: 'Clean Street',
            version: '1.0.0',
            status: 'approved',
            problem: 'Residents need to report illegal waste deposits.',
            primary_outcome: 'A geolocated report is submitted and trackable.',
            description: 'Citizen reporting experience.',
            evidence: evidence(),
        },
        sources: [
            {
                id: 'clean-street-brief',
                kind: 'project-brief',
                snapshot_uri: prefixed('design/project-brief.md'),
                sha256: briefHash,
            },
        ],
        backend_contracts: [
            {
                id: 'clean-street-api',
                role: 'target',
                snapshot_uri: prefixed('contracts/backend.contract.json'),
                sha256: contractHash,
            },
        ],
        audiences: [
            {
                id: 'citizen',
                title: 'Citizen',
                description: 'Resident or passer-by.',
                evidence: evidence(),
            },
        ],
        experiences: [
            {
                id: 'citizen-web',
                title: 'Citizen web experience',
                description: 'Installable citizen web application.',
                channel: 'web',
                audience_ids: ['citizen'],
                entry_page_id: landingId,
                page_ids: [landingId, reportId],
                offline_policy: 'shell-only',
                evidence: evidence(),
            },
        ],
        pages: [
            {
                id: landingId,
                title: 'Welcome',
                purpose: 'Explain the service and start reporting.',
                path: '/',
                experience_ids: ['citizen-web'],
                access: { mode: 'public', permissions: [] },
                initial_state_id: 'ready',
                states: [
                    {
                        id: 'ready',
                        kind: 'ready',
                        description: 'Landing content is visible.',
                        announcement: 'Clean Street is ready.',
                    },
                ],
                controls: [],
                actions: [
                    {
                        id: 'start-report',
                        kind: 'navigate',
                        label: 'Report waste',
                        description: 'Open the reporting page.',
                        available_in_state_ids: ['ready'],
                        input_bindings: [],
                        destination_page_id: reportId,
                    },
                ],
                loads: [],
                data_bindings: [],
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
                                id: 'start-actions',
                                kind: 'action-group',
                                accessible_name: 'Reporting actions',
                                content: 'Start a report',
                                control_ids: [],
                                action_ids: ['start-report'],
                                data_binding_ids: [],
                            },
                        ],
                    },
                ],
                evidence: evidence(),
            },
            {
                id: reportId,
                title: 'Create a report',
                purpose: 'Submit one described waste deposit.',
                path: '/report',
                experience_ids: ['citizen-web'],
                access: { mode: 'authenticated', permissions: [] },
                initial_state_id: 'ready',
                states: [
                    {
                        id: 'ready',
                        kind: 'ready',
                        description: 'The form is ready.',
                        announcement: 'Report form ready.',
                    },
                    {
                        id: 'submitted',
                        kind: 'success',
                        description: 'The report is stored.',
                        announcement: 'Report submitted.',
                    },
                    {
                        id: 'failed',
                        kind: 'error',
                        description: 'The report failed.',
                        announcement: 'Submission failed.',
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
                        id: 'description',
                        kind: 'multiline-text',
                        label: 'Description',
                        description: 'Describe the waste deposit.',
                        required: true,
                    },
                ],
                actions: [
                    {
                        id: 'submit-report',
                        kind: 'backend',
                        label: 'Submit report',
                        description: 'Send the report to the target API.',
                        available_in_state_ids: ['ready'],
                        input_bindings: [
                            {
                                control_id: 'description',
                                target_kind: 'body-field',
                                target_name: 'description',
                            },
                        ],
                        operation_ref: {
                            contract_id: 'clean-street-api',
                            operation_id: 'create-report',
                        },
                        success_state_id: 'submitted',
                        error_state_id: 'failed',
                    },
                ],
                loads: [],
                data_bindings: [],
                regions: [
                    {
                        id: 'main',
                        role: 'main',
                        accessible_name: 'Report form',
                        elements: [
                            {
                                id: 'report-heading',
                                kind: 'heading',
                                accessible_name: 'Report heading',
                                content: 'Report waste',
                                control_ids: [],
                                action_ids: [],
                                data_binding_ids: [],
                            },
                            {
                                id: 'report-form',
                                kind: 'form',
                                accessible_name: 'Waste report form',
                                content: 'Waste report fields',
                                control_ids: ['description'],
                                action_ids: ['submit-report'],
                                data_binding_ids: [],
                            },
                        ],
                    },
                ],
                evidence: evidence(),
            },
        ],
        unknowns: [],
    };
}

export async function writeApplicationDesignFixture(
    root,
    backendContractSchema,
    pathPrefix = ''
) {
    const fixtureRoot = join(root, pathPrefix);
    const prefixed = (path) => (pathPrefix ? `${pathPrefix}/${path}` : path);
    await mkdir(join(fixtureRoot, 'contracts'), { recursive: true });
    await mkdir(join(fixtureRoot, 'design'), { recursive: true });
    const brief = Buffer.from('# Clean Street\n\nValidated project brief.\n');
    await writeFile(join(fixtureRoot, 'design/project-brief.md'), brief);
    const definition = Buffer.from(
        `${JSON.stringify(backendDefinition(), null, 2)}\n`
    );
    await writeFile(
        join(fixtureRoot, 'contracts/backend.definition.json'),
        definition
    );
    const contract = compileStructuredBackendDefinition({
        definition: JSON.parse(definition.toString('utf8')),
        snapshotUri: prefixed('contracts/backend.definition.json'),
        snapshotSha256: sha256(definition),
        backendContractSchema,
    });
    const contractContent = Buffer.from(
        serializeCanonicalBackendContract(contract)
    );
    await writeFile(
        join(fixtureRoot, 'contracts/backend.contract.json'),
        contractContent
    );
    const design = applicationDesign(
        sha256(brief),
        sha256(contractContent),
        pathPrefix
    );
    return { brief, contract, contractContent, design };
}
