import assert from 'node:assert/strict';
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
    buildVerification,
    requiredProofIds,
    verificationFailures,
    verificationInputs,
} from './compatibility-promotion.mjs';

const REPO_ROOT = new URL('../..', import.meta.url).pathname;
const HEAD = execFileSync('git', ['-C', REPO_ROOT, 'rev-parse', 'HEAD'], {
    encoding: 'utf8',
}).trim();

/** Racine jetable portant les contrats réellement consommés par la gate. */
function fixture(t) {
    const root = mkdtempSync(join(tmpdir(), 'cmz-promotion-'));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    cpSync(join(REPO_ROOT, 'conventions'), join(root, 'conventions'), {
        recursive: true,
    });
    cpSync(
        join(REPO_ROOT, 'tools/library-setup'),
        join(root, 'tools/library-setup'),
        { recursive: true }
    );
    for (const file of ['nx.json', 'tsconfig.base.json']) {
        cpSync(join(REPO_ROOT, file), join(root, file));
    }
    cpSync(
        join(REPO_ROOT, 'tools/scaffold-tailwind.mjs'),
        join(root, 'tools/scaffold-tailwind.mjs')
    );
    // Le dépôt Git réel sert d'autorité pour l'existence des commits ; la
    // racine jetable n'en est pas un, donc les contrôles de commit s'y font
    // contre REPO_ROOT.
    return root;
}

function matrixPath(root) {
    return join(
        root,
        'conventions/libraries/angular/angular-material.compat.json'
    );
}

function promote(root, verification) {
    const path = matrixPath(root);
    const matrix = JSON.parse(readFileSync(path, 'utf8'));
    matrix.tracks[0].status = 'verified';
    matrix.tracks[0].verification = verification;
    writeFileSync(path, `${JSON.stringify(matrix, null, 2)}\n`);
}

function gate(root) {
    const recipes = validateRecipes(root);
    assert.deepEqual(recipes.errors, []);
    return validateCompatibilityMatrices(root, recipes.recipes, {
        gitRoot: REPO_ROOT,
    });
}

function materialRecipe() {
    return validateRecipes(REPO_ROOT).recipes.get('angular/angular-material');
}

test('une promotion inventée est refusée : SHA inexistant, aucune preuve', (t) => {
    const root = fixture(t);
    // Exactement l'attaque qui PASSAIT avant ce lot, vérifiée le 2026-09-08.
    promote(root, {
        commit: '0'.repeat(40),
        app: 'backoffice-angular',
        plan_id: `library-plan:${'a'.repeat(64)}`,
        proofs: ['material-component-compiles'],
        inputs_sha256: verificationInputs(root, materialRecipe()),
    });
    const result = gate(root);
    assert.equal(result.ok, false);
    assert.ok(
        result.errors.some((error) => /absent du dépôt/.test(error)),
        result.errors.join(' ; ')
    );
});

test('une vérification devient caduque dès qu’une entrée change', (t) => {
    const root = fixture(t);
    const recipe = materialRecipe();
    const verification = buildVerification({
        root,
        recipe,
        commit: HEAD,
        gitRoot: REPO_ROOT,
        app: 'backoffice-angular',
        planId: `library-plan:${'b'.repeat(64)}`,
        proofs: requiredProofIds(recipe),
    });
    promote(root, verification);
    assert.deepEqual(gate(root).errors, [], 'vérification fraîche acceptée');

    // Une seule entrée bouge : la politique de résolution.
    const policy = join(root, 'conventions/libraries/resolution-policy.json');
    const document = JSON.parse(readFileSync(policy, 'utf8'));
    document.browser.version = '1.0.0.0';
    writeFileSync(policy, `${JSON.stringify(document, null, 2)}\n`);

    const stale = gate(root);
    assert.equal(stale.ok, false);
    assert.ok(
        stale.errors.some((error) =>
            /policy a changé depuis la vérification/.test(error)
        ),
        stale.errors.join(' ; ')
    );
});

test('l’outillage compte : toucher un module du runner périme la piste', (t) => {
    const root = fixture(t);
    const recipe = materialRecipe();
    promote(
        root,
        buildVerification({
            root,
            recipe,
            commit: HEAD,
            gitRoot: REPO_ROOT,
            app: 'backoffice-angular',
            planId: `library-plan:${'c'.repeat(64)}`,
            proofs: requiredProofIds(recipe),
        })
    );
    assert.deepEqual(gate(root).errors, []);

    const module = join(root, 'tools/library-setup/sandbox.mjs');
    writeFileSync(module, `${readFileSync(module, 'utf8')}\n// dérive\n`);

    assert.ok(
        gate(root).errors.some((error) =>
            /runner a changé depuis la vérification/.test(error)
        )
    );
});

test('les preuves déclarées doivent être exactement celles de la recette', (t) => {
    const root = fixture(t);
    const recipe = materialRecipe();
    assert.throws(
        () =>
            buildVerification({
                root,
                recipe,
                commit: HEAD,
                gitRoot: REPO_ROOT,
                app: 'backoffice-angular',
                planId: `library-plan:${'d'.repeat(64)}`,
                proofs: [],
            }),
        /preuves exécutées \(aucune\)/
    );
    assert.throws(
        () =>
            buildVerification({
                root,
                recipe,
                commit: HEAD,
                gitRoot: REPO_ROOT,
                app: 'backoffice-angular',
                planId: `library-plan:${'d'.repeat(64)}`,
                proofs: ['preuve-inventee'],
            }),
        /≠ acceptances déclarées/
    );
    const complete = buildVerification({
        root,
        recipe,
        commit: HEAD,
        gitRoot: REPO_ROOT,
        app: 'backoffice-angular',
        planId: `library-plan:${'d'.repeat(64)}`,
        proofs: requiredProofIds(recipe),
    });
    assert.deepEqual(
        verificationFailures(root, recipe, complete, { gitRoot: REPO_ROOT }),
        [],
        'un bloc produit par buildVerification doit être accepté par la gate'
    );
});

test('candidate et verified sont exclusifs, dans les deux sens', (t) => {
    const root = fixture(t);
    const path = matrixPath(root);
    const matrix = JSON.parse(readFileSync(path, 'utf8'));
    matrix.tracks[0].verification = {
        commit: HEAD,
        gitRoot: REPO_ROOT,
        app: 'backoffice-angular',
        plan_id: `library-plan:${'e'.repeat(64)}`,
        proofs: requiredProofIds(materialRecipe()),
        inputs_sha256: verificationInputs(root, materialRecipe()),
    };
    writeFileSync(path, `${JSON.stringify(matrix, null, 2)}\n`);
    assert.ok(
        gate(root).errors.some((error) =>
            /candidate avec une vérification/.test(error)
        )
    );

    matrix.tracks[0].status = 'verified';
    matrix.tracks[0].verification = null;
    writeFileSync(path, `${JSON.stringify(matrix, null, 2)}\n`);
    assert.ok(
        gate(root).errors.some((error) =>
            /verified sans bloc de vérification/.test(error)
        )
    );
});
