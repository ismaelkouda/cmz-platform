import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
    cpSync,
    mkdtempSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { validateRecipes } from '../check-library-setup.mjs';
import { validateCompatibilityMatrices } from './compatibility.mjs';
import {
    buildVerificationFromExecution,
    requiredProofIds,
    verificationFailures,
    verificationInputs,
} from './compatibility-promotion.mjs';
import { buildLibraryPlan, stableJson } from './library-plan.mjs';
import {
    compatibilityTrackDigest,
    libraryRunnerDigest,
} from './tooling-fingerprint.mjs';

const ROOT = new URL('../..', import.meta.url).pathname;
const HEAD = execFileSync('git', ['-C', ROOT, 'rev-parse', 'HEAD'], {
    encoding: 'utf8',
}).trim();

function sha256(value) {
    return createHash('sha256').update(value).digest('hex');
}

function recipe() {
    return validateRecipes(ROOT).recipes.get('angular/angular-material');
}

function track() {
    return JSON.parse(
        readFileSync(
            join(
                ROOT,
                'conventions/libraries/angular/angular-material.compat.json'
            ),
            'utf8'
        )
    ).tracks[0];
}

function execution(overrides = {}) {
    const { plan: planOverrides = {}, ...executionOverrides } = overrides;
    const sourceRecipe = recipe();
    const sourceTrack = track();
    const inputs = verificationInputs(ROOT, sourceRecipe);
    const changePayload = {
        schema_version: '1.0.0',
        changes: [
            {
                op: 'create',
                path: 'apps/backoffice-angular/proof',
                mode: '100644',
                sha256_after: '1'.repeat(64),
            },
        ],
    };
    const changeSet = {
        ...changePayload,
        change_set_id: `changes:${sha256(stableJson(changePayload))}`,
    };
    const planInputs = {
        app: 'backoffice-angular',
        library: sourceRecipe.library,
        platform: sourceRecipe.platform,
        commit: HEAD,
        recipe_sha256: inputs.recipe,
        recipe_schema_sha256: inputs.recipe_schema,
        policy_sha256: inputs.policy,
        policy_schema_sha256: inputs.policy_schema,
        compat_sha256: sha256(
            readFileSync(
                join(
                    ROOT,
                    'conventions/libraries/angular/angular-material.compat.json'
                )
            )
        ),
        compat_schema_sha256: inputs.compat_schema,
        runner_sha256: libraryRunnerDigest(ROOT),
        nx_json_sha256: inputs.nx_json,
        tsconfig_sha256: inputs.tsconfig,
        gitattributes_sha256: inputs.gitattributes,
        app_tree_sha256: '2'.repeat(64),
        package_json_initial_oid: '3'.repeat(40),
        package_json_final_oid: '4'.repeat(40),
        bun_lock_initial_oid: '5'.repeat(40),
        bun_lock_final_oid: '6'.repeat(40),
        node_version: '22.22.3',
        bun_version: '1.3.14',
        nx_version: '23.1.0',
        framework_version: '22.0.7',
        schematic_version: Object.entries(sourceTrack.packages)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([name, version]) => `${name}@${version}`)
            .join(','),
        change_set_id: changeSet.change_set_id,
    };
    return {
        published: false,
        changeSet,
        plan: buildLibraryPlan({ ...planInputs, ...planOverrides }),
        runtimeProofs: requiredProofIds(sourceRecipe),
        ...executionOverrides,
    };
}

function verification() {
    return buildVerificationFromExecution({
        root: ROOT,
        recipe: recipe(),
        track: track(),
        app: 'backoffice-angular',
        execution: execution(),
    });
}

function fixture(t) {
    const root = mkdtempSync(join(tmpdir(), 'cmz-promotion-'));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    cpSync(join(ROOT, 'conventions'), join(root, 'conventions'), {
        recursive: true,
    });
    cpSync(join(ROOT, 'tools'), join(root, 'tools'), { recursive: true });
    for (const path of [
        'package.json',
        'bun.lock',
        'nx.json',
        'tsconfig.base.json',
        '.gitattributes',
    ]) {
        cpSync(join(ROOT, path), join(root, path));
    }
    return root;
}

test('la preuve vient d’un résultat complet dont plan et change-set sont recalculés', () => {
    const built = verification();
    assert.equal(built.commit, HEAD);
    assert.equal(built.track_sha256, compatibilityTrackDigest(track()));
    assert.deepEqual(built.proofs, requiredProofIds(recipe()));
    assert.deepEqual(verificationFailures(ROOT, recipe(), track(), built), []);

    const forgedPlan = execution();
    forgedPlan.plan.plan_id = `library-plan:${'0'.repeat(64)}`;
    assert.throws(
        () =>
            buildVerificationFromExecution({
                root: ROOT,
                recipe: recipe(),
                track: track(),
                app: 'backoffice-angular',
                execution: forgedPlan,
            }),
        /plan_id ne correspond pas/
    );

    const forgedChangeSet = execution();
    forgedChangeSet.changeSet.change_set_id = `changes:${'0'.repeat(64)}`;
    assert.throws(
        () =>
            buildVerificationFromExecution({
                root: ROOT,
                recipe: recipe(),
                track: track(),
                app: 'backoffice-angular',
                execution: forgedChangeSet,
            }),
        /change_set_id ne correspond pas/
    );
});

test('aucune liste déclarative ne remplace les oracles, coexistence comprise', () => {
    assert.ok(
        requiredProofIds(recipe()).includes('material-tailwind-render-together')
    );
    for (const runtimeProofs of [
        [],
        ['material-component-compiles'],
        [...requiredProofIds(recipe()), 'preuve-inventee'],
    ]) {
        assert.throws(
            () =>
                buildVerificationFromExecution({
                    root: ROOT,
                    recipe: recipe(),
                    track: track(),
                    app: 'backoffice-angular',
                    execution: { ...execution(), runtimeProofs },
                }),
            /preuves exécutées/
        );
    }
});

test('app, publication, commit, runner et vecteur de versions sont liés', () => {
    assert.throws(
        () =>
            buildVerificationFromExecution({
                root: ROOT,
                recipe: recipe(),
                track: track(),
                app: 'app-qui-n-existe-pas',
                execution: execution(),
            }),
        /concordance app/
    );
    assert.throws(
        () =>
            buildVerificationFromExecution({
                root: ROOT,
                recipe: recipe(),
                track: track(),
                app: 'backoffice-angular',
                execution: execution({ published: true }),
            }),
        /dry-run non publié/
    );
    assert.throws(
        () =>
            buildVerificationFromExecution({
                root: ROOT,
                recipe: recipe(),
                track: track(),
                app: 'backoffice-angular',
                execution: execution({ plan: { framework_version: '23.0.0' } }),
            }),
        /framework 23.0.0 hors/
    );
});

test('modifier la piste, la politique, le lockfile ou le runner périme la preuve', (t) => {
    const built = verification();
    const root = fixture(t);
    assert.deepEqual(
        verificationFailures(root, recipe(), track(), built, { gitRoot: ROOT }),
        []
    );

    const changedTrack = structuredClone(track());
    changedTrack.dependency_section = 'devDependencies';
    assert.ok(
        verificationFailures(root, recipe(), changedTrack, built, {
            gitRoot: ROOT,
        }).some((failure) => /piste a changé/.test(failure))
    );

    for (const [path, expected] of [
        ['conventions/libraries/resolution-policy.json', /policy a changé/],
        ['bun.lock', /bun_lock a changé/],
        ['tools/library-setup/sandbox.mjs', /runner a changé/],
    ]) {
        const isolated = fixture(t);
        writeFileSync(
            join(isolated, path),
            `${readFileSync(join(isolated, path), 'utf8')}\n`
        );
        assert.ok(
            verificationFailures(isolated, recipe(), track(), built, {
                gitRoot: ROOT,
            }).some((failure) => expected.test(failure)),
            path
        );
    }
});

test('la gate refuse les promotions inventées et les états contradictoires', (t) => {
    const root = fixture(t);
    const path = join(
        root,
        'conventions/libraries/angular/angular-material.compat.json'
    );
    const matrix = JSON.parse(readFileSync(path, 'utf8'));
    matrix.tracks[0].status = 'verified';
    matrix.tracks[0].verification = {
        ...verification(),
        commit: '0'.repeat(40),
    };
    writeFileSync(path, `${JSON.stringify(matrix, null, 2)}\n`);
    const recipes = validateRecipes(root);
    const result = validateCompatibilityMatrices(root, recipes.recipes, {
        gitRoot: ROOT,
    });
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((error) => /absent du dépôt/.test(error)));

    matrix.tracks[0].status = 'candidate';
    writeFileSync(path, `${JSON.stringify(matrix, null, 2)}\n`);
    assert.ok(
        validateCompatibilityMatrices(root, recipes.recipes, {
            gitRoot: ROOT,
        }).errors.some((error) => /candidate avec une vérification/.test(error))
    );
});
