import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function assertExactKeys(value, allowed, path) {
    for (const key of Object.keys(value)) {
        assert(allowed.includes(key), `${path}: unsupported property ${key}`);
    }
}

export function validateWorkflowBehavior(model) {
    assertExactKeys(
        model,
        ['schema_version', 'domain', 'state', 'permissions', 'operations'],
        '$'
    );
    assert(model.schema_version === '1.0.0', '$.schema_version: unsupported');
    assertExactKeys(model.domain, ['id', 'description'], '$.domain');
    assert(/^[a-z][a-z0-9-]*$/.test(model.domain.id), '$.domain.id: invalid');
    assertExactKeys(
        model.state,
        ['statuses', 'qualification_statuses'],
        '$.state'
    );
    assert(
        new Set(model.state.statuses).size === model.state.statuses.length,
        '$.state.statuses: duplicate'
    );
    assert(
        new Set(model.state.qualification_statuses).size ===
            model.state.qualification_statuses.length,
        '$.state.qualification_statuses: duplicate'
    );
    assert(
        model.state.statuses.includes('pending'),
        '$.state: pending missing'
    );
    assert(
        model.state.statuses.includes('in-progress'),
        '$.state: in-progress missing'
    );
    assert(
        model.state.qualification_statuses.includes('pending'),
        '$.state: qualification pending missing'
    );
    assert(Array.isArray(model.permissions), '$.permissions: array');
    const permissionIds = new Set(model.permissions);
    assert(
        permissionIds.size === model.permissions.length,
        '$.permissions: duplicate'
    );

    assert(Array.isArray(model.operations), '$.operations: array');
    const operationIds = new Set();
    for (const [index, operation] of model.operations.entries()) {
        const path = `$.operations[${index}]`;
        assertExactKeys(
            operation,
            [
                'id',
                'kind',
                'topology',
                'permission',
                'from',
                'to',
                'branches',
                'rules',
                'steps',
            ],
            path
        );
        assert(!operationIds.has(operation.id), `${path}.id: duplicate`);
        operationIds.add(operation.id);
        assert(
            ['transition', 'export'].includes(operation.kind),
            `${path}.kind: unsupported`
        );
        assert(
            ['sequential', 'async_callback'].includes(operation.topology),
            `${path}.topology: unsupported`
        );
        assert(
            permissionIds.has(operation.permission),
            `${path}.permission: unknown`
        );
        assert(
            Array.isArray(operation.from) && operation.from.length > 0,
            `${path}.from`
        );
        assert(
            Array.isArray(operation.steps) && operation.steps.length > 0,
            `${path}.steps`
        );
        assert(Array.isArray(operation.branches), `${path}.branches`);
        assert(Array.isArray(operation.rules), `${path}.rules`);
        for (const [branchIndex, branch] of operation.branches.entries()) {
            const branchPath = `${path}.branches[${branchIndex}]`;
            assertExactKeys(
                branch,
                [
                    'when',
                    'permission',
                    'qualification_from',
                    'qualification_to',
                    'to',
                ],
                branchPath
            );
            assert(
                permissionIds.has(branch.permission),
                `${branchPath}.permission: unknown`
            );
            assert(
                branch.qualification_from === '' ||
                    model.state.qualification_statuses.includes(
                        branch.qualification_from
                    ),
                `${branchPath}.qualification_from: unknown`
            );
            assert(
                branch.qualification_to === '' ||
                    model.state.qualification_statuses.includes(
                        branch.qualification_to
                    ),
                `${branchPath}.qualification_to: unknown`
            );
        }
        assert(
            new Set(operation.rules).size === operation.rules.length,
            `${path}.rules: duplicate`
        );
        if (operation.kind === 'transition') {
            for (const status of operation.from) {
                assert(
                    model.state.statuses.includes(status),
                    `${path}.from: unknown status ${status}`
                );
            }
            assert(
                operation.to === 'branch' ||
                    model.state.statuses.includes(operation.to),
                `${path}.to: unknown status ${operation.to}`
            );
            for (const branch of operation.branches) {
                assert(
                    model.state.statuses.includes(branch.to),
                    `${path}.branches: unknown status ${branch.to}`
                );
            }
        }
    }

    assert(operationIds.has('take'), '$.operations: take missing');
    assert(operationIds.has('qualify'), '$.operations: qualify missing');
    assert(operationIds.has('export'), '$.operations: export missing');
    return model;
}

export function validateWorkflowEvidence(evidence, behavior) {
    assertExactKeys(evidence, ['schema_version', 'sources', 'claims'], '$');
    assert(
        evidence.schema_version === '1.0.0',
        '$.schema_version: unsupported'
    );
    assert(
        Array.isArray(evidence.sources) && evidence.sources.length > 0,
        '$.sources'
    );
    const ids = new Set();
    for (const [index, source] of evidence.sources.entries()) {
        const path = `$.sources[${index}]`;
        assertExactKeys(source, ['id', 'path', 'sha256'], path);
        assert(!ids.has(source.id), `${path}.id: duplicate`);
        ids.add(source.id);
        assert(/^[a-f0-9]{64}$/.test(source.sha256), `${path}.sha256: invalid`);
    }
    assert(
        Array.isArray(evidence.claims) && evidence.claims.length > 0,
        '$.claims'
    );
    const subjects = new Set();
    for (const [index, claim] of evidence.claims.entries()) {
        const path = `$.claims[${index}]`;
        assertExactKeys(claim, ['subject', 'source_refs'], path);
        assert(!subjects.has(claim.subject), `${path}.subject: duplicate`);
        subjects.add(claim.subject);
        assert(
            Array.isArray(claim.source_refs) && claim.source_refs.length > 0,
            `${path}.source_refs`
        );
        for (const reference of claim.source_refs) {
            assert(ids.has(reference), `${path}: unknown source ${reference}`);
        }
    }
    for (const operation of behavior.operations) {
        assert(
            subjects.has(`operation.${operation.id}`),
            `operation ${operation.id}: missing evidence claim`
        );
    }
    return evidence;
}

export async function hashEvidenceSources(repositoryRoot, sources) {
    return Promise.all(
        sources.map(async ({ id, path }) => {
            const content = await readFile(resolve(repositoryRoot, path));
            return {
                id,
                path,
                sha256: createHash('sha256').update(content).digest('hex'),
            };
        })
    );
}
