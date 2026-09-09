import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
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
    dependencyClosureSha256,
    dependencyProjectionSha256,
} from './dependency-resolution.mjs';
import { gitBlobOid } from './git-tree.mjs';
import {
    compatibilityTrackDigest,
    libraryRunnerDigest,
} from './tooling-fingerprint.mjs';
import { removeTemporaryFixture } from '../test-support/remove-temporary-fixture.mjs';
import {
    fixtureGit as git,
    initFixtureRepo,
} from '../test-support/fixture-git.mjs';

const ROOT = new URL('../..', import.meta.url).pathname;
const HEAD = execFileSync('git', ['-C', ROOT, 'rev-parse', 'HEAD'], {
    encoding: 'utf8',
}).trim();

function sha256(value) {
    return createHash('sha256').update(value).digest('hex');
}

function recipe() {
    return recipes().get('angular/angular-material');
}

function recipes() {
    return validateRecipes(ROOT).recipes;
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
    const inputs = verificationInputs(ROOT, sourceRecipe, recipes());
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
    const format = execFileSync(
        'git',
        ['-C', ROOT, 'rev-parse', '--show-object-format'],
        { encoding: 'utf8' }
    ).trim();
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
        package_json_initial_oid: gitBlobOid(
            readFileSync(join(ROOT, 'package.json')),
            format
        ),
        package_json_final_oid: '4'.repeat(format === 'sha1' ? 40 : 64),
        bun_lock_initial_oid: gitBlobOid(
            readFileSync(join(ROOT, 'bun.lock')),
            format
        ),
        bun_lock_final_oid: '6'.repeat(format === 'sha1' ? 40 : 64),
        dependency_initial_sha256: dependencyProjectionSha256(
            readFileSync(join(ROOT, 'package.json')),
            readFileSync(join(ROOT, 'bun.lock')),
            sourceTrack
        ),
        dependency_final_sha256: '7'.repeat(64),
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
        runtimeProofs: requiredProofIds(sourceRecipe, recipes()),
        ...executionOverrides,
    };
}

function verification() {
    return buildVerificationFromExecution({
        root: ROOT,
        recipe: recipe(),
        recipeRegistry: recipes(),
        track: track(),
        app: 'backoffice-angular',
        execution: execution(),
    });
}

function fixture(t) {
    const root = mkdtempSync(join(tmpdir(), 'cmz-promotion-'));
    t.after(() => removeTemporaryFixture(root, 'cmz-promotion-'));
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
    initFixtureRepo(root);
    git(root, ['add', '.']);
    git(root, ['commit', '--quiet', '-m', 'fixture']);
    return root;
}

function rebindCommit(root, evidence) {
    const rebound = structuredClone(evidence);
    rebound.commit = git(root, ['rev-parse', 'HEAD']);
    const { evidence_sha256: _ignored, ...payload } = rebound;
    rebound.evidence_sha256 = sha256(stableJson(payload));
    return rebound;
}

test('la preuve vient d’un résultat complet dont plan et change-set sont recalculés', () => {
    const built = verification();
    assert.equal(built.commit, HEAD);
    assert.equal(built.track_sha256, compatibilityTrackDigest(track()));
    assert.deepEqual(built.proofs, requiredProofIds(recipe(), recipes()));
    assert.deepEqual(
        verificationFailures(ROOT, recipe(), track(), built, {
            recipeRegistry: recipes(),
        }),
        []
    );

    const forgedPlan = execution();
    forgedPlan.plan.plan_id = `library-plan:${'0'.repeat(64)}`;
    assert.throws(
        () =>
            buildVerificationFromExecution({
                root: ROOT,
                recipe: recipe(),
                recipeRegistry: recipes(),
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
                recipeRegistry: recipes(),
                track: track(),
                app: 'backoffice-angular',
                execution: forgedChangeSet,
            }),
        /change_set_id ne correspond pas/
    );
});

test('aucune liste déclarative ne remplace les oracles, coexistence comprise', () => {
    assert.ok(
        requiredProofIds(recipe(), recipes()).includes(
            'material-tailwind-render-together'
        )
    );
    assert.ok(
        requiredProofIds(recipes().get('angular/tailwind'), recipes()).includes(
            'material-tailwind-render-together'
        ),
        'la qualification Tailwind doit aussi prouver la règle possédée par Material'
    );
    for (const runtimeProofs of [
        [],
        ['material-component-compiles'],
        [...requiredProofIds(recipe(), recipes()), 'preuve-inventee'],
    ]) {
        assert.throws(
            () =>
                buildVerificationFromExecution({
                    root: ROOT,
                    recipe: recipe(),
                    recipeRegistry: recipes(),
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
                recipeRegistry: recipes(),
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
                recipeRegistry: recipes(),
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
                recipeRegistry: recipes(),
                track: track(),
                app: 'backoffice-angular',
                execution: execution({ plan: { framework_version: '23.0.0' } }),
            }),
        /framework 23.0.0 hors/
    );
});

test('modifier la piste, la politique ou le runner périme la preuve', (t) => {
    const root = fixture(t);
    const built = rebindCommit(root, verification());
    assert.deepEqual(
        verificationFailures(root, recipe(), track(), built, {
            recipeRegistry: recipes(),
        }),
        []
    );

    const changedTrack = structuredClone(track());
    changedTrack.dependency_section = 'devDependencies';
    assert.ok(
        verificationFailures(root, recipe(), changedTrack, built, {
            recipeRegistry: recipes(),
        }).some((failure) => /piste a changé/.test(failure))
    );

    for (const [path, expected] of [
        ['conventions/libraries/resolution-policy.json', /policy a changé/],
        ['tools/library-setup/sandbox.mjs', /runner a changé/],
    ]) {
        const isolated = fixture(t);
        const isolatedEvidence = rebindCommit(isolated, verification());
        writeFileSync(
            join(isolated, path),
            `${readFileSync(join(isolated, path), 'utf8')}\n`
        );
        assert.ok(
            verificationFailures(
                isolated,
                recipe(),
                track(),
                isolatedEvidence,
                {
                    recipeRegistry: recipes(),
                }
            ).some((failure) => expected.test(failure)),
            path
        );
    }
});

test('modifier le contrat de coexistence réciproque périme aussi la preuve', (t) => {
    const root = fixture(t);
    const initialRegistry = validateRecipes(root).recipes;
    const tailwind = initialRegistry.get('angular/tailwind');
    const before = verificationInputs(root, tailwind, initialRegistry);

    const materialPath = join(
        root,
        'conventions/libraries/angular/angular-material.setup.json'
    );
    const materialDocument = JSON.parse(readFileSync(materialPath, 'utf8'));
    const reciprocal = materialDocument.coexistence.find(
        ({ with: library }) => library === 'tailwind'
    );
    reciprocal.runtime_acceptance[0].description +=
        ' Contrat modifié sans renommer la preuve.';
    writeFileSync(
        materialPath,
        `${JSON.stringify(materialDocument, null, 2)}\n`
    );
    const changedRegistry = validateRecipes(root).recipes;
    const after = verificationInputs(
        root,
        changedRegistry.get('angular/tailwind'),
        changedRegistry
    );
    assert.equal(after.recipe, before.recipe);
    assert.notEqual(after.proof_contracts, before.proof_contracts);
});

test('une bibliothèque indépendante ne périme ni la projection initiale ni la fermeture finale', (t) => {
    const root = fixture(t);
    const built = rebindCommit(root, verification());
    const lock = readFileSync(join(root, 'bun.lock'), 'utf8');
    writeFileSync(
        join(root, 'bun.lock'),
        lock.replace(
            '"packages": {',
            '"packages": {\n    "independent-proof": ["independent-proof@1.0.0", "", {}, "sha512-eA=="],'
        )
    );
    assert.deepEqual(
        verificationFailures(root, recipe(), track(), built, {
            recipeRegistry: recipes(),
        }),
        []
    );

    const manifest = JSON.parse(readFileSync(join(root, 'package.json')));
    manifest.dependencies['@angular/material'] = 'catalog:';
    manifest.dependencies['@angular/cdk'] = 'catalog:';
    manifest.workspaces.catalog['@angular/material'] = '22.0.5';
    manifest.workspaces.catalog['@angular/cdk'] = '22.0.5';
    const finalLock = {
        workspaces: {
            '': {
                dependencies: {
                    '@angular/material': 'catalog:',
                    '@angular/cdk': 'catalog:',
                },
            },
        },
        catalog: {
            '@angular/material': '22.0.5',
            '@angular/cdk': '22.0.5',
        },
        packages: {
            '@angular/material': [
                '@angular/material@22.0.5',
                '',
                { dependencies: { '@angular/cdk': '22.0.5' } },
                'sha512-material',
            ],
            '@angular/cdk': ['@angular/cdk@22.0.5', '', {}, 'sha512-cdk'],
        },
    };
    writeFileSync(join(root, 'package.json'), `${JSON.stringify(manifest)}\n`);
    writeFileSync(join(root, 'bun.lock'), `${JSON.stringify(finalLock)}\n`);
    const qualified = structuredClone(built);
    qualified.dependency_state_sha256.initial = '0'.repeat(64);
    qualified.dependency_state_sha256.final = dependencyClosureSha256(
        readFileSync(join(root, 'package.json')),
        readFileSync(join(root, 'bun.lock')),
        track()
    );
    const { evidence_sha256: _ignored, ...payload } = qualified;
    qualified.evidence_sha256 = sha256(stableJson(payload));
    assert.deepEqual(
        verificationFailures(root, recipe(), track(), qualified, {
            recipeRegistry: recipes(),
        }),
        []
    );

    finalLock.packages.independent = [
        'independent@1.0.0',
        '',
        {},
        'sha512-independent',
    ];
    writeFileSync(join(root, 'bun.lock'), `${JSON.stringify(finalLock)}\n`);
    assert.deepEqual(
        verificationFailures(root, recipe(), track(), qualified, {
            recipeRegistry: recipes(),
        }),
        []
    );

    finalLock.packages['@angular/cdk'][0] = '@angular/cdk@22.0.6';
    writeFileSync(join(root, 'bun.lock'), `${JSON.stringify(finalLock)}\n`);
    assert.ok(
        verificationFailures(root, recipe(), track(), qualified, {
            recipeRegistry: recipes(),
        }).some((failure) => /projection initiale/.test(failure))
    );
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
        ...rebindCommit(root, verification()),
        commit: '0'.repeat(40),
    };
    writeFileSync(path, `${JSON.stringify(matrix, null, 2)}\n`);
    const recipes = validateRecipes(root);
    const result = validateCompatibilityMatrices(root, recipes.recipes);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((error) => /absent du dépôt/.test(error)));

    matrix.tracks[0].status = 'candidate';
    writeFileSync(path, `${JSON.stringify(matrix, null, 2)}\n`);
    assert.ok(
        validateCompatibilityMatrices(root, recipes.recipes).errors.some(
            (error) => /candidate avec une vérification/.test(error)
        )
    );
});
