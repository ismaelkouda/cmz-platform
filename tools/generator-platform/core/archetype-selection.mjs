import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { parseDocument } from 'yaml';

import { validateJsonSchema } from '../validate-ir.mjs';
import { FORM_SELECTORS } from './form-selectors.mjs';

export const ROLE_PIPELINES = Object.freeze({
    screen: Object.freeze({
        producer: 'page-realization-contract',
        consumer: 'page-realization-work-order',
    }),
});

function fail(message) {
    throw new Error(`archetype selection: ${message}`);
}

function sha256(content) {
    return createHash('sha256').update(content).digest('hex');
}

function readJson(path, label) {
    const metadata = lstatSync(path);
    if (!metadata.isFile() || metadata.isSymbolicLink())
        fail(`${label} must be a regular file`);
    return JSON.parse(readFileSync(path, 'utf8'));
}

function assertInside(root, path, label) {
    const rootReal = realpathSync(root);
    const pathReal = realpathSync(path);
    const rel = relative(rootReal, pathReal);
    if (rel === '..' || rel.startsWith(`..${sep}`))
        fail(`${label} escapes the workspace`);
}

export function parseArchetypeContract(content, schema, label = 'contract') {
    if (!content.startsWith('---\n'))
        fail(`${label}: missing YAML frontmatter`);
    const end = content.indexOf('\n---\n', 4);
    if (end < 0) fail(`${label}: unterminated YAML frontmatter`);
    const document = parseDocument(content.slice(4, end), { uniqueKeys: true });
    if (document.errors.length > 0)
        fail(`${label}: invalid YAML (${document.errors[0].message})`);
    const frontmatter = document.toJS();
    const violations = validateJsonSchema(frontmatter, schema);
    if (violations.length > 0) fail(`${label}: ${violations.join('\n')}`);
    return { frontmatter, body: content.slice(end + 5) };
}

export function validateArchetypeDocuments({
    registry,
    target,
    contracts,
    schemas,
    selectors = FORM_SELECTORS,
}) {
    const violations = [
        ...validateJsonSchema(registry, schemas.registry),
        ...validateJsonSchema(target, schemas.target),
    ];
    if (violations.length > 0) fail(violations.join('\n'));
    if (registry.schema_version !== target.schema_version)
        fail('registry and target schema versions differ');

    const registryIds = registry.roles.map(({ id }) => id);
    if (new Set(registryIds).size !== registryIds.length)
        fail('duplicate role id in registry');
    if (
        JSON.stringify([...registryIds].sort()) !==
        JSON.stringify(Object.keys(ROLE_PIPELINES).sort())
    ) {
        fail(
            'registry roles must match implemented producer/consumer pipelines exactly'
        );
    }
    for (const role of registry.roles) {
        const pipeline = ROLE_PIPELINES[role.id];
        if (
            role.producer !== pipeline.producer ||
            role.consumer !== pipeline.consumer
        ) {
            fail(`${role.id}: producer or consumer is not implemented`);
        }
    }
    const targetIds = Object.keys(target.roles).sort();
    if (JSON.stringify([...registryIds].sort()) !== JSON.stringify(targetIds))
        fail('target roles must cover the registry exactly');

    const referenced = new Set();
    for (const role of registryIds) {
        const entries = target.roles[role];
        if (entries.at(-1)?.selector !== 'always')
            fail(`${role}: final selector must be always`);
        const seenSelectors = new Set();
        for (const entry of entries) {
            if (seenSelectors.has(entry.selector))
                fail(`${role}: duplicate selector ${entry.selector}`);
            seenSelectors.add(entry.selector);
            if (entry.selector === 'always' && entry !== entries.at(-1))
                fail(`${role}: always must be final`);
            if (entry.selector !== 'always') {
                if (!entry.selector.startsWith(`${role}.`))
                    fail(
                        `${role}: selector ${entry.selector} belongs to another role`
                    );
                if (typeof selectors[entry.selector] !== 'function')
                    fail(`${role}: unknown selector ${entry.selector}`);
            }
            const contract = contracts[entry.archetype];
            if (!contract) fail(`${role}: missing contract ${entry.archetype}`);
            if (
                contract.frontmatter.role !== role ||
                contract.frontmatter.archetype !== entry.archetype
            ) {
                fail(`${role}: incoherent contract ${entry.archetype}`);
            }
            referenced.add(entry.archetype);
        }
    }
    const orphans = Object.keys(contracts).filter((id) => !referenced.has(id));
    if (orphans.length > 0)
        fail(
            `frontmatter contracts without a role: ${orphans.sort().join(', ')}`
        );
    return true;
}

export function loadArchetypeSystem(root, stack = 'angular') {
    const schemaRoot = join(root, 'tools/generator-platform/schemas');
    const schemas = {
        registry: readJson(
            join(schemaRoot, 'role-registry.schema.json'),
            'role registry schema'
        ),
        target: readJson(
            join(schemaRoot, 'archetype-roles.schema.json'),
            'target roles schema'
        ),
        contract: readJson(
            join(schemaRoot, 'archetype-contract.schema.json'),
            'archetype contract schema'
        ),
    };
    const registry = readJson(
        join(root, 'tools/generator-platform/role-registry.json'),
        'role registry'
    );
    const target = readJson(
        join(root, `conventions/archetypes/${stack}/roles.json`),
        'target roles'
    );
    if (target.stack !== stack) fail(`expected ${stack} target roles`);

    const directory = join(root, `conventions/archetypes/${stack}`);
    assertInside(root, directory, 'archetype directory');
    const contracts = {};
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
        if (!entry.name.endsWith('.contract.md')) continue;
        const path = join(directory, entry.name);
        if (!entry.isFile() || entry.isSymbolicLink())
            fail(`${entry.name}: contract must be a regular file`);
        const content = readFileSync(path, 'utf8');
        if (!content.startsWith('---\n')) continue;
        const parsed = parseArchetypeContract(
            content,
            schemas.contract,
            entry.name
        );
        const id = parsed.frontmatter.archetype;
        if (contracts[id]) fail(`duplicate archetype contract ${id}`);
        contracts[id] = {
            ...parsed,
            path: relative(root, path).split(sep).join('/'),
            sha256: sha256(content),
        };
    }
    validateArchetypeDocuments({ registry, target, contracts, schemas });
    return { registry, target, contracts, schemas };
}

export function selectArchetype(system, roleNode) {
    const registered = system.registry.roles.find(
        ({ id }) => id === roleNode.role
    );
    if (!registered) fail(`unregistered produced role ${roleNode.role}`);
    const entries = system.target.roles[roleNode.role];
    for (const entry of entries) {
        if (
            entry.selector === 'always' ||
            FORM_SELECTORS[entry.selector](structuredClone(roleNode.payload))
        ) {
            const contract = system.contracts[entry.archetype];
            return Object.freeze({
                stack: system.target.stack,
                role: roleNode.role,
                archetype: entry.archetype,
                selector: entry.selector,
                contract: {
                    path: contract.path,
                    sha256: contract.sha256,
                    shape: contract.frontmatter.shape,
                    forbid: contract.frontmatter.forbid,
                },
            });
        }
    }
    fail(`${roleNode.role}: no archetype selected`);
}
