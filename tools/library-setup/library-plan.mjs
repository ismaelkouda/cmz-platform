import { createHash } from 'node:crypto';

function fail(message) {
    throw new Error(`library plan: ${message}`);
}

function stable(value) {
    if (Array.isArray(value)) return value.map(stable);
    if (value !== null && typeof value === 'object') {
        return Object.fromEntries(
            Object.keys(value)
                .sort()
                .map((key) => [key, stable(value[key])])
        );
    }
    return value;
}

export function stableJson(value) {
    return JSON.stringify(stable(value));
}

function validSnapshot(entries, label) {
    if (!Array.isArray(entries)) fail(`${label} n'est pas un tableau`);
    const paths = new Set();
    for (const entry of entries) {
        if (
            !entry ||
            typeof entry.path !== 'string' ||
            paths.has(entry.path) ||
            !['100644', '100755', '120000'].includes(entry.mode) ||
            !Number.isInteger(entry.bytes) ||
            entry.bytes < 0 ||
            !/^[a-f0-9]{64}$/.test(entry.sha256 ?? '')
        ) {
            fail(`${label} contient une entrée invalide`);
        }
        paths.add(entry.path);
    }
    return new Map(entries.map((entry) => [entry.path, entry]));
}

export function buildLibraryChangeSet(beforeEntries, afterEntries) {
    const before = validSnapshot(beforeEntries, 'snapshot initial');
    const after = validSnapshot(afterEntries, 'snapshot final');
    const changes = [];
    const deleted = [];
    const created = [];
    for (const [path, previous] of before) {
        const next = after.get(path);
        if (!next) {
            deleted.push(previous);
        } else if (
            previous.mode !== next.mode ||
            previous.sha256 !== next.sha256
        ) {
            changes.push({
                op: 'modify',
                path,
                mode: next.mode,
                sha256_before: previous.sha256,
                sha256_after: next.sha256,
            });
        }
    }
    for (const [path, next] of after) {
        if (!before.has(path)) created.push(next);
    }

    const createdByIdentity = new Map();
    for (const entry of created) {
        const key = `${entry.mode}\0${entry.sha256}`;
        const values = createdByIdentity.get(key) ?? [];
        values.push(entry);
        createdByIdentity.set(key, values);
    }
    for (const previous of deleted.sort((a, b) =>
        a.path.localeCompare(b.path)
    )) {
        const key = `${previous.mode}\0${previous.sha256}`;
        const matches = createdByIdentity.get(key);
        if (matches?.length) {
            matches.sort((a, b) => a.path.localeCompare(b.path));
            const next = matches.shift();
            changes.push({
                op: 'rename',
                path: next.path,
                from_path: previous.path,
                mode: next.mode,
                sha256_before: previous.sha256,
                sha256_after: next.sha256,
            });
        } else {
            changes.push({
                op: 'delete',
                path: previous.path,
                mode: previous.mode,
                sha256_before: previous.sha256,
            });
        }
    }
    for (const values of createdByIdentity.values()) {
        for (const next of values) {
            changes.push({
                op: 'create',
                path: next.path,
                mode: next.mode,
                sha256_after: next.sha256,
            });
        }
    }
    changes.sort((left, right) =>
        `${left.path}\0${left.op}`.localeCompare(`${right.path}\0${right.op}`)
    );
    const payload = { schema_version: '1.0.0', changes };
    return {
        ...payload,
        change_set_id: `changes:${createHash('sha256').update(stableJson(payload)).digest('hex')}`,
    };
}

export function buildLibraryPlan(inputs) {
    const required = [
        'app',
        'library',
        'platform',
        'commit',
        'recipe_sha256',
        'recipe_schema_sha256',
        'policy_sha256',
        'policy_schema_sha256',
        'compat_sha256',
        'compat_schema_sha256',
        'runner_sha256',
        'nx_json_sha256',
        'tsconfig_sha256',
        'gitattributes_sha256',
        'app_tree_sha256',
        'package_json_initial_oid',
        'package_json_final_oid',
        'bun_lock_initial_oid',
        'bun_lock_final_oid',
        'node_version',
        'bun_version',
        'nx_version',
        'framework_version',
        'schematic_version',
        'change_set_id',
    ];
    const missing = required.filter(
        (key) => typeof inputs[key] !== 'string' || inputs[key].length === 0
    );
    if (missing.length) fail(`entrées absentes : ${missing.join(', ')}`);
    const payload = { schema_version: '1.0.0', ...inputs };
    const hash = createHash('sha256').update(stableJson(payload)).digest('hex');
    return { ...payload, plan_id: `library-plan:${hash}` };
}
