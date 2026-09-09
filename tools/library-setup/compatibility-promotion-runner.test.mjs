import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
    cpSync,
    existsSync,
    mkdtempSync,
    readFileSync,
    realpathSync,
    writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { validateRecipes } from '../check-library-setup.mjs';
import { loadLibraryConfiguration } from './add-library-core.mjs';
import {
    verificationInputs,
    requiredProofIds,
} from './compatibility-promotion.mjs';
import {
    acquirePromotionLock,
    promoteCompatibilityTrack,
    releasePromotionLock,
} from './compatibility-promotion-runner.mjs';
import { buildLibraryPlan, stableJson } from './library-plan.mjs';
import { dependencyProjectionSha256 } from './dependency-resolution.mjs';
import { gitBlobOid } from './git-tree.mjs';
import { libraryRunnerDigest } from './tooling-fingerprint.mjs';
import { removeTemporaryFixture } from '../test-support/remove-temporary-fixture.mjs';

const SOURCE = new URL('../..', import.meta.url).pathname;
const LIVE_START = 'Mon Sep  8 00:00:00 2026';
const processProbe = (pid) => (pid === process.pid ? LIVE_START : '');

function sha256(value) {
    return createHash('sha256').update(value).digest('hex');
}

function git(root, args) {
    return execFileSync('git', ['-C', root, ...args], {
        encoding: 'utf8',
        env: {
            ...process.env,
            GIT_AUTHOR_NAME: 'CMZ Test',
            GIT_AUTHOR_EMAIL: 'cmz-test@example.invalid',
            GIT_COMMITTER_NAME: 'CMZ Test',
            GIT_COMMITTER_EMAIL: 'cmz-test@example.invalid',
        },
    }).trim();
}

function repository(t) {
    const root = realpathSync(
        mkdtempSync(join(tmpdir(), 'cmz-promotion-runner-'))
    );
    t.after(() => {
        // Le verrou est le seul résidu métier susceptible de survivre au
        // scénario : sa présence après le test serait un défaut, jamais un
        // flake à masquer. Une fois cette absence prouvée, les retries bornés de
        // `fs.rm` absorbent uniquement les ENOTEMPTY transitoires observés sur
        // le filesystem du runner Linux pendant le teardown de `.git`.
        assert.equal(
            existsSync(join(root, '.git/cmz-library-promotion.lock')),
            false,
            'le verrou de promotion doit être libéré avant le teardown'
        );
        removeTemporaryFixture(root, 'cmz-promotion-runner-');
    });
    for (const path of ['conventions', 'tools', 'apps/backoffice-angular']) {
        cpSync(join(SOURCE, path), join(root, path), { recursive: true });
    }
    for (const path of [
        'package.json',
        'bun.lock',
        'nx.json',
        'tsconfig.base.json',
        '.gitattributes',
    ]) {
        cpSync(join(SOURCE, path), join(root, path));
    }
    for (const library of ['angular-material', 'tailwind', 'transloco']) {
        const path = join(
            root,
            `conventions/libraries/angular/${library}.compat.json`
        );
        const matrix = JSON.parse(readFileSync(path, 'utf8'));
        for (const track of matrix.tracks) {
            track.status = 'candidate';
            track.verification = null;
        }
        writeFileSync(path, `${JSON.stringify(matrix, null, 2)}\n`);
    }
    git(root, ['init', '--quiet']);
    git(root, ['add', '.']);
    git(root, ['commit', '--quiet', '-m', 'fixture']);
    return root;
}

function fakeExecution(root, app, library, runtimeProofs) {
    const configuration = loadLibraryConfiguration(root, app, library, {
        requiredTrackStatus: 'candidate',
    });
    const { recipe, track, versions } = configuration;
    const inputs = verificationInputs(
        root,
        recipe,
        validateRecipes(root).recipes
    );
    const changePayload = {
        schema_version: '1.0.0',
        changes: [
            {
                op: 'create',
                path: `apps/${app}/promotion-proof`,
                mode: '100644',
                sha256_after: '1'.repeat(64),
            },
        ],
    };
    const changeSet = {
        ...changePayload,
        change_set_id: `changes:${sha256(stableJson(changePayload))}`,
    };
    const matrix = readFileSync(
        join(
            root,
            `conventions/libraries/${recipe.platform}/${library}.compat.json`
        )
    );
    const format = git(root, ['rev-parse', '--show-object-format']);
    const plan = buildLibraryPlan({
        app,
        library,
        platform: recipe.platform,
        commit: git(root, ['rev-parse', 'HEAD']),
        recipe_sha256: inputs.recipe,
        recipe_schema_sha256: inputs.recipe_schema,
        policy_sha256: inputs.policy,
        policy_schema_sha256: inputs.policy_schema,
        compat_sha256: sha256(matrix),
        compat_schema_sha256: inputs.compat_schema,
        runner_sha256: libraryRunnerDigest(root),
        nx_json_sha256: inputs.nx_json,
        tsconfig_sha256: inputs.tsconfig,
        gitattributes_sha256: inputs.gitattributes,
        app_tree_sha256: '2'.repeat(64),
        package_json_initial_oid: gitBlobOid(
            readFileSync(join(root, 'package.json')),
            format
        ),
        package_json_final_oid: '4'.repeat(format === 'sha1' ? 40 : 64),
        bun_lock_initial_oid: gitBlobOid(
            readFileSync(join(root, 'bun.lock')),
            format
        ),
        bun_lock_final_oid: '6'.repeat(format === 'sha1' ? 40 : 64),
        dependency_initial_sha256: dependencyProjectionSha256(
            readFileSync(join(root, 'package.json')),
            readFileSync(join(root, 'bun.lock')),
            track
        ),
        dependency_final_sha256: '7'.repeat(64),
        node_version: versions.node,
        bun_version: versions.bun,
        nx_version: versions.nx,
        framework_version: versions[recipe.platform],
        schematic_version: Object.entries(track.packages)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([name, version]) => `${name}@${version}`)
            .join(','),
        change_set_id: changeSet.change_set_id,
    });
    return {
        published: false,
        plan,
        changeSet,
        runtimeProofs,
    };
}

test('la commande promeut uniquement la piste réellement qualifiée', async (t) => {
    const root = repository(t);
    const source = loadLibraryConfiguration(
        root,
        'backoffice-angular',
        'angular-material',
        { requiredTrackStatus: 'candidate' }
    );
    const result = await promoteCompatibilityTrack({
        repository: root,
        app: 'backoffice-angular',
        library: 'angular-material',
        execute: async () =>
            fakeExecution(
                root,
                'backoffice-angular',
                'angular-material',
                requiredProofIds(source.recipe, validateRecipes(root).recipes)
            ),
        processProbe,
    });
    assert.equal(result.verification.track_sha256.length, 64);
    const selected = loadLibraryConfiguration(
        root,
        'backoffice-angular',
        'angular-material'
    );
    assert.equal(selected.track.status, 'verified');
    assert.deepEqual(git(root, ['status', '--short']).split('\n'), [
        'M conventions/libraries/angular/angular-material.compat.json',
    ]);
});

test('une preuve incomplète restaure la matrice octet pour octet', async (t) => {
    const root = repository(t);
    const path = join(
        root,
        'conventions/libraries/angular/angular-material.compat.json'
    );
    const before = readFileSync(path);
    await assert.rejects(
        () =>
            promoteCompatibilityTrack({
                repository: root,
                app: 'backoffice-angular',
                library: 'angular-material',
                execute: async () =>
                    fakeExecution(
                        root,
                        'backoffice-angular',
                        'angular-material',
                        ['material-component-compiles']
                    ),
                processProbe,
            }),
        /preuves exécutées/
    );
    assert.deepEqual(readFileSync(path), before);
    assert.equal(git(root, ['status', '--porcelain']), '');
});

test('le verrou sérialise les promotions et récupère un propriétaire mort', async (t) => {
    const root = repository(t);
    const first = acquirePromotionLock(root, { processProbe });
    let executed = false;
    try {
        await assert.rejects(
            () =>
                promoteCompatibilityTrack({
                    repository: root,
                    app: 'backoffice-angular',
                    library: 'angular-material',
                    execute: async () => {
                        executed = true;
                    },
                    processProbe,
                }),
            /promotion déjà active/
        );
        assert.equal(executed, false);
    } finally {
        releasePromotionLock(first);
    }

    const stale = acquirePromotionLock(root, { processProbe });
    writeFileSync(
        stale.path,
        `${JSON.stringify({
            ...stale.document,
            pid: 2_147_483_647,
            started_at: 'processus-mort',
        })}\n`,
        { mode: 0o600 }
    );
    const recovered = acquirePromotionLock(root, { processProbe });
    releasePromotionLock(recovered);
});

test('une édition concurrente de matrice est conservée et bloque la promotion', async (t) => {
    const root = repository(t);
    const path = join(
        root,
        'conventions/libraries/angular/angular-material.compat.json'
    );
    const edited = `${readFileSync(path, 'utf8')}\n`;
    await assert.rejects(
        () =>
            promoteCompatibilityTrack({
                repository: root,
                app: 'backoffice-angular',
                library: 'angular-material',
                execute: async () => {
                    writeFileSync(path, edited);
                    const source = loadLibraryConfiguration(
                        root,
                        'backoffice-angular',
                        'angular-material',
                        { requiredTrackStatus: 'candidate' }
                    );
                    return fakeExecution(
                        root,
                        'backoffice-angular',
                        'angular-material',
                        requiredProofIds(
                            source.recipe,
                            validateRecipes(root).recipes
                        )
                    );
                },
                processProbe,
            }),
        /a changé pendant la qualification/
    );
    assert.equal(readFileSync(path, 'utf8'), edited);
});
