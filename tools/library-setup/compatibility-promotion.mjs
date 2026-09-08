import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { lstatSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

function fail(message) {
    throw new Error(`library compatibility promotion: ${message}`);
}

function sha256(content) {
    return createHash('sha256').update(content).digest('hex');
}

function regularFile(root, relativePath) {
    const absolute = join(root, relativePath);
    const stats = lstatSync(absolute);
    if (stats.isSymbolicLink() || !stats.isFile()) {
        fail(`${relativePath} n'est pas un fichier régulier`);
    }
    return readFileSync(absolute);
}

/**
 * Empreinte de l'outillage qui a produit une vérification : tout
 * `tools/library-setup/*.mjs` hors tests, dans un ordre stable.
 *
 * `add-library-core` calcule aujourd'hui une empreinte équivalente pour le
 * `plan_id`. La duplication est assumée et temporaire : ce module appartient au
 * lot « promotion des matrices », `add-library-core` au lot « processus LLM »,
 * et le protocole de duo interdit d'écrire hors de sa propriété avant le SHA
 * gelé. La convergence attendue est que `add-library-core` importe CETTE
 * fonction — l'inverse créerait une dépendance du contrôle vers l'exécutant.
 */
export function runnerDigest(root) {
    const directory = join(root, 'tools/library-setup');
    const hash = createHash('sha256');
    for (const name of readdirSync(directory).sort()) {
        if (!name.endsWith('.mjs') || name.endsWith('.test.mjs')) continue;
        const stats = lstatSync(join(directory, name));
        if (stats.isSymbolicLink())
            fail(`lien symbolique dans le runner : ${name}`);
        if (!stats.isFile()) continue;
        hash.update(name)
            .update('\0')
            .update(readFileSync(join(directory, name)))
            .update('\0');
    }
    return hash.digest('hex');
}

/**
 * Entrées GLOBALES au dépôt dont dépend le sens d'une vérification. Y figure
 * tout ce qui, en changeant, rend caduque la phrase « cette piste a été
 * vérifiée » — sans y figurer ce qui dépend de l'application choisie, qui n'est
 * pas reproductible par une gate statique.
 *
 * Conséquence assumée : pendant une phase de construction active, toute
 * modification de l'outillage périme les pistes vérifiées. C'est la vérité, pas
 * un défaut — `verified` signifie « vérifié contre exactement cet outillage ».
 */
export function verificationInputs(root, recipe) {
    const platform = recipe.platform;
    const library = recipe.library;
    return {
        recipe: sha256(
            regularFile(
                root,
                `conventions/libraries/${platform}/${library}.setup.json`
            )
        ),
        recipe_schema: sha256(
            regularFile(root, 'conventions/libraries/library-setup.schema.json')
        ),
        compat_schema: sha256(
            regularFile(
                root,
                'conventions/libraries/library-compat.schema.json'
            )
        ),
        policy: sha256(
            regularFile(root, 'conventions/libraries/resolution-policy.json')
        ),
        policy_schema: sha256(
            regularFile(
                root,
                'conventions/libraries/resolution-policy.schema.json'
            )
        ),
        nx_json: sha256(regularFile(root, 'nx.json')),
        tsconfig: sha256(regularFile(root, 'tsconfig.base.json')),
        runner: runnerDigest(root),
    };
}

/** Identifiants des acceptances que la recette impose, hors coexistence. */
export function requiredProofIds(recipe) {
    return (recipe.runtime_acceptance ?? []).map((entry) => entry.id).sort();
}

/**
 * `gitRoot` est l'AUTORITÉ Git, distincte de la racine de contenu inspectée.
 * En production les deux coïncident. Les tests inspectent une racine jetable
 * qui n'est pas un dépôt : ils désignent alors le dépôt réel, faute de quoi le
 * contrôle échouerait pour une raison sans rapport avec ce qu'il vérifie.
 */
export function commitExists(root, commit) {
    if (!/^[a-f0-9]{40}$/.test(commit ?? '')) return false;
    try {
        execFileSync(
            'git',
            ['-C', root, 'cat-file', '-e', `${commit}^{commit}`],
            {
                stdio: 'ignore',
                env: { PATH: process.env.PATH, GIT_TERMINAL_PROMPT: '0' },
            }
        );
        return true;
    } catch {
        return false;
    }
}

/**
 * Construit le bloc de vérification à partir d'une exécution RÉUSSIE. Aucune
 * promotion ne doit être écrite à la main : c'est cette fonction qui est
 * l'autorité, et la gate refuse tout bloc qu'elle n'aurait pas pu produire.
 */
export function buildVerification({
    root,
    recipe,
    commit,
    app,
    planId,
    proofs,
    gitRoot = root,
}) {
    if (!commitExists(gitRoot, commit))
        fail(`commit inconnu du dépôt : ${commit}`);
    if (!/^[a-z][a-z0-9-]*$/.test(app ?? '')) fail(`app invalide : ${app}`);
    if (!/^library-plan:[a-f0-9]{64}$/.test(planId ?? '')) {
        fail(`plan_id invalide : ${planId}`);
    }
    const required = requiredProofIds(recipe);
    const observed = [...(proofs ?? [])].sort();
    if (JSON.stringify(observed) !== JSON.stringify(required)) {
        fail(
            `preuves exécutées ${observed.join(',') || '(aucune)'} ≠ acceptances déclarées ${required.join(',')}`
        );
    }
    return {
        commit,
        app,
        plan_id: planId,
        proofs: required,
        inputs_sha256: verificationInputs(root, recipe),
    };
}

/**
 * @returns {string[]} raisons pour lesquelles la vérification ne tient plus.
 * Vide = la piste peut rester `verified`.
 */
export function verificationFailures(
    root,
    recipe,
    verification,
    { gitRoot = root } = {}
) {
    const failures = [];
    if (!commitExists(gitRoot, verification.commit)) {
        failures.push(
            `commit ${verification.commit} absent du dépôt : vérification invérifiable`
        );
    }
    const required = requiredProofIds(recipe);
    const observed = [...(verification.proofs ?? [])].sort();
    if (JSON.stringify(observed) !== JSON.stringify(required)) {
        failures.push(
            `preuves ${observed.join(',') || '(aucune)'} ≠ acceptances déclarées ${required.join(',')}`
        );
    }
    let current;
    try {
        current = verificationInputs(root, recipe);
    } catch (error) {
        failures.push(error.message);
        return failures;
    }
    for (const [key, value] of Object.entries(current)) {
        if (verification.inputs_sha256?.[key] !== value) {
            failures.push(
                `${key} a changé depuis la vérification : la piste doit repasser en candidate`
            );
        }
    }
    return failures;
}
