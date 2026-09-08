import assert from 'node:assert/strict';
import {
    chmod,
    mkdir,
    mkdtemp,
    rm,
    symlink,
    writeFile,
} from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { snapshotFilesystem, snapshotSha256 } from './filesystem-snapshot.mjs';
import { buildLibraryChangeSet, buildLibraryPlan } from './library-plan.mjs';

const hash = (character) => character.repeat(64);
const entry = (path, sha256, mode = '100644') => ({
    path,
    mode,
    bytes: 1,
    sha256,
});

test('change-set déterministe couvre create, modify, delete, rename et mode', () => {
    const before = [
        entry('delete', hash('a')),
        entry('modify', hash('b')),
        entry('rename-from', hash('c')),
        entry('mode', hash('d')),
    ];
    const after = [
        entry('create', hash('e')),
        entry('modify', hash('f')),
        entry('rename-to', hash('c')),
        entry('mode', hash('d'), '100755'),
    ];
    const first = buildLibraryChangeSet(before, after);
    const second = buildLibraryChangeSet(
        [...before].reverse(),
        [...after].reverse()
    );
    assert.deepEqual(first, second);
    assert.deepEqual(first.changes.map(({ op }) => op).sort(), [
        'create',
        'delete',
        'modify',
        'modify',
        'rename',
    ]);
    assert.match(first.change_set_id, /^changes:[a-f0-9]{64}$/);
});

test('plan_id change pour chaque entrée gouvernante', () => {
    const inputs = Object.fromEntries(
        [
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
        ].map((key) => [key, key])
    );
    const baseline = buildLibraryPlan(inputs);
    assert.match(baseline.plan_id, /^library-plan:[a-f0-9]{64}$/);
    for (const key of Object.keys(inputs)) {
        const changed = buildLibraryPlan({
            ...inputs,
            [key]: `${inputs[key]}-changed`,
        });
        assert.notEqual(changed.plan_id, baseline.plan_id, key);
    }
});

test('snapshot refuse spéciaux et exclusions fournies par lien', async (t) => {
    const root = realpathSync(await mkdtemp(join(tmpdir(), 'cmz-snapshot-')));
    t.after(() => rm(root, { recursive: true, force: true }));
    await writeFile(join(root, 'a'), 'a');
    await chmod(join(root, 'a'), 0o755);
    await mkdir(join(root, 'node_modules'));
    await writeFile(join(root, 'node_modules/ignored'), 'x');
    const snapshot = snapshotFilesystem(root, {
        excludedDirectories: ['node_modules'],
    });
    assert.deepEqual(
        snapshot.map(({ path, mode }) => ({ path, mode })),
        [{ path: 'a', mode: '100755' }]
    );
    assert.match(snapshotSha256(snapshot), /^[a-f0-9]{64}$/);

    await rm(join(root, 'node_modules'), { recursive: true });
    await symlink(root, join(root, 'node_modules'));
    assert.throws(
        () =>
            snapshotFilesystem(root, { excludedDirectories: ['node_modules'] }),
        /exclusion.*vrai répertoire/
    );
});
