import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import {
    hashEvidenceSources,
    validateWorkflowBehavior,
    validateWorkflowEvidence,
} from '../core/workflow-action-model.mjs';

export const workflowEvidenceSources = [
    {
        id: 'details-permissions',
        path: 'libs/workflow-details/domain/src/lib/utils/workflow-details-permissions.util.ts',
    },
    {
        id: 'qualification-rules',
        path: 'libs/workflow-details/domain/src/lib/value-objects/workflow-details-qualification.vo.ts',
    },
    {
        id: 'details-orchestration',
        path: 'libs/requests/application/src/lib/facades/requests-details.facade.ts',
    },
    {
        id: 'details-transport',
        path: 'libs/requests/data/src/lib/sources/requests-details.api.ts',
    },
    {
        id: 'export-orchestration',
        path: 'libs/requests/ui/src/lib/utils/requests-list-export.util.ts',
    },
    {
        id: 'export-transport',
        path: 'libs/requests/data/src/lib/sources/tasks-requests.api.ts',
    },
];

function requirePattern(content, pattern, message) {
    if (!pattern.test(content))
        throw new Error(`workflow source drift: ${message}`);
}

export async function adaptRequestsWorkflow(repositoryRoot) {
    const contents = new Map(
        await Promise.all(
            workflowEvidenceSources.map(async (source) => [
                source.id,
                await readFile(resolve(repositoryRoot, source.path), 'utf8'),
            ])
        )
    );
    const permissions = contents.get('details-permissions');
    requirePattern(
        permissions,
        /permission\s*&&\s*props\.status\s*===\s*WorkflowDetailsStatus\.PENDING/,
        'take must require permission and pending status'
    );
    requirePattern(
        permissions,
        /props\.qualificationState\s*===\s*WorkflowDetailsQualificationState\.PENDING/,
        'approve must require pending qualification'
    );
    requirePattern(
        permissions,
        /workflowDetailsPermissionsReject[\s\S]*?permission\s*&&\s*props\.status\s*===\s*WorkflowDetailsStatus\.IN_PROGRESS/,
        'reject must remain possible for an in-progress item'
    );

    const qualification = contents.get('qualification-rules');
    requirePattern(
        qualification,
        /decision !== 'accepted' && decision !== 'rejected'/,
        'qualification decisions'
    );
    requirePattern(
        qualification,
        /approvalType === 'callback'[\s\S]*?!callbackType/,
        'callback type requirement'
    );
    requirePattern(
        qualification,
        /approvalType === 'edit' \|\| approvalType === 'callback'/,
        'edit field branch'
    );

    const details = contents.get('details-orchestration');
    requirePattern(
        details,
        /queuesFacade\.reload\(\);\s*this\.tasksFacade\.reload\(\);/,
        'take refresh order'
    );
    requirePattern(
        details,
        /tasksFacade\.reload\(\);\s*this\.allFacade\.reload\(\);/g,
        'qualification refresh order'
    );
    requirePattern(
        details,
        /finalize\(\(\) => this\._actionLoading\.set\(false\)\)/,
        'loading finalization'
    );

    const transport = contents.get('details-transport');
    for (const suffix of ['take', 'approve', 'reject']) {
        requirePattern(
            transport,
            new RegExp(`/${suffix}\\\``),
            `${suffix} endpoint`
        );
    }

    const exportFlow = contents.get('export-orchestration');
    requirePattern(
        exportFlow,
        /const rows = await params\.fetchRows\(\)/,
        'async row callback'
    );
    requirePattern(
        exportFlow,
        /await exportTableToExcel\(/,
        'awaited file write'
    );
    requirePattern(exportFlow, /!params\.canExport/, 'export permission guard');
    requirePattern(
        exportFlow,
        /params\.loading \|\| params\.exporting \|\| params\.totalCount < 1/,
        'export availability guards'
    );
    requirePattern(
        contents.get('export-transport'),
        /TASKS_ENDPOINTS|REQUESTS_ENDPOINTS\.TASKS_EXPORT/,
        'export endpoint'
    );

    const evidence = {
        schema_version: '1.0.0',
        sources: await hashEvidenceSources(
            repositoryRoot,
            workflowEvidenceSources
        ),
        claims: [
            {
                subject: 'operation.take',
                source_refs: [
                    'details-permissions',
                    'details-orchestration',
                    'details-transport',
                ],
            },
            {
                subject: 'operation.qualify',
                source_refs: [
                    'details-permissions',
                    'qualification-rules',
                    'details-orchestration',
                    'details-transport',
                ],
            },
            {
                subject: 'operation.export',
                source_refs: ['export-orchestration', 'export-transport'],
            },
        ],
    };
    const behavior = validateWorkflowBehavior({
        schema_version: '1.0.0',
        domain: {
            id: 'requests-workflow',
            description:
                'Take, qualification and filtered export of work items',
        },
        state: {
            statuses: ['pending', 'in-progress', 'approved', 'rejected'],
            qualification_statuses: ['pending', 'completed'],
        },
        permissions: ['take', 'qualify', 'reject', 'export'],
        operations: [
            {
                id: 'take',
                kind: 'transition',
                topology: 'sequential',
                permission: 'take',
                from: ['pending'],
                to: 'in-progress',
                branches: [],
                rules: [],
                steps: [
                    'external_call:take',
                    'notify:take',
                    'refresh:queues',
                    'refresh:tasks',
                ],
            },
            {
                id: 'qualify',
                kind: 'transition',
                topology: 'sequential',
                permission: 'qualify',
                from: ['in-progress'],
                to: 'branch',
                branches: [
                    {
                        when: 'accepted',
                        permission: 'qualify',
                        qualification_from: 'pending',
                        qualification_to: 'completed',
                        to: 'approved',
                    },
                    {
                        when: 'rejected',
                        permission: 'reject',
                        qualification_from: '',
                        qualification_to: 'completed',
                        to: 'rejected',
                    },
                ],
                rules: [
                    'rejected_requires_reason_comment',
                    'callback_requires_type',
                    'edit_or_callback_requires_comment_and_fields',
                ],
                steps: [
                    'validate:qualification',
                    'external_call:decision',
                    'notify:decision',
                    'refresh:tasks',
                    'refresh:all',
                ],
            },
            {
                id: 'export',
                kind: 'export',
                topology: 'async_callback',
                permission: 'export',
                from: ['state-preserving'],
                to: 'state-preserving',
                branches: [
                    {
                        when: 'rows-found',
                        permission: 'export',
                        qualification_from: '',
                        qualification_to: '',
                        to: 'write-file',
                    },
                    {
                        when: 'no-rows',
                        permission: 'export',
                        qualification_from: '',
                        qualification_to: '',
                        to: 'notify-no-data',
                    },
                ],
                rules: [
                    'not_loading',
                    'not_exporting',
                    'positive_total',
                    'no_rows_no_write',
                    'errors_notified',
                ],
                steps: [
                    'callback:fetch-rows',
                    'branch:rows',
                    'await:write-file',
                ],
            },
        ],
    });
    validateWorkflowEvidence(evidence, behavior);
    return { evidence, behavior };
}
