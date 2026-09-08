import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { lstatSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import semver from 'semver';

import {
    dependencyClosureSha256,
    dependencyProjectionSha256,
} from './dependency-resolution.mjs';
import { buildLibraryPlan, stableJson } from './library-plan.mjs';
import {
    compatibilityTrackDigest,
    libraryRunnerDigest,
} from './tooling-fingerprint.mjs';

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

function git(root, args, { ignoreFailure = false } = {}) {
    try {
        return execFileSync(
            'git',
            [
                '-C',
                resolve(root),
                '--no-replace-objects',
                '--no-lazy-fetch',
                ...args,
            ],
            {
                encoding: 'utf8',
                stdio: ['ignore', 'pipe', 'pipe'],
                env: {
                    PATH: process.env.PATH,
                    LANG: 'C',
                    LC_ALL: 'C',
                    GIT_CONFIG_NOSYSTEM: '1',
                    GIT_CONFIG_GLOBAL: '/dev/null',
                    GIT_CONFIG_SYSTEM: '/dev/null',
                    GIT_OPTIONAL_LOCKS: '0',
                    GIT_TERMINAL_PROMPT: '0',
                },
            }
        ).trim();
    } catch {
        if (ignoreFailure) return undefined;
        fail(`git ${args[0]} a échoué`);
    }
}

function objectFormat(root) {
    const format = git(root, ['rev-parse', '--show-object-format']);
    if (!['sha1', 'sha256'].includes(format)) {
        fail(`format d'objet Git non supporté : ${format}`);
    }
    return format;
}

export function commitExists(root, commit) {
    let format;
    try {
        format = objectFormat(root);
    } catch {
        return false;
    }
    const length = format === 'sha1' ? 40 : 64;
    if (!new RegExp(`^[a-f0-9]{${length}}$`).test(commit ?? '')) return false;
    return (
        git(root, ['cat-file', '-e', `${commit}^{commit}`], {
            ignoreFailure: true,
        }) !== undefined
    );
}

export function verificationInputs(root, recipe) {
    const prefix = `conventions/libraries/${recipe.platform}`;
    return {
        recipe: sha256(
            regularFile(root, `${prefix}/${recipe.library}.setup.json`)
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
        gitattributes: sha256(regularFile(root, '.gitattributes')),
        runner: libraryRunnerDigest(root),
    };
}

/**
 * Toutes les acceptances de la bibliothèque et de chaque composition dans les
 * deux sens. Une règle Material→Tailwind doit aussi être prouvée quand la piste
 * Tailwind est qualifiée.
 */
export function requiredProofIds(recipe, recipeRegistry) {
    if (!(recipeRegistry instanceof Map)) {
        fail('registre de recettes requis pour calculer les preuves');
    }
    const ids = [
        ...(recipe.runtime_acceptance ?? []).map((entry) => entry.id),
        ...(recipe.coexistence ?? []).flatMap((block) =>
            (block.runtime_acceptance ?? []).map((entry) => entry.id)
        ),
        ...[...recipeRegistry.values()].flatMap((candidate) =>
            candidate.platform === recipe.platform
                ? (candidate.coexistence ?? [])
                      .filter((block) => block.with === recipe.library)
                      .flatMap((block) =>
                          (block.runtime_acceptance ?? []).map(
                              (entry) => entry.id
                          )
                      )
                : []
        ),
    ].sort();
    if (new Set(ids).size !== ids.length) {
        fail(`identifiant de preuve dupliqué pour ${recipe.library}`);
    }
    return ids;
}

function assertExactProofs(recipe, recipeRegistry, proofs) {
    const required = requiredProofIds(recipe, recipeRegistry);
    const observed = [...(proofs ?? [])].sort();
    if (JSON.stringify(observed) !== JSON.stringify(required)) {
        fail(
            `preuves exécutées ${observed.join(',') || '(aucune)'} ≠ acceptances déclarées ${required.join(',')}`
        );
    }
    return required;
}

function validateChangeSet(changeSet) {
    if (
        changeSet?.schema_version !== '1.0.0' ||
        !Array.isArray(changeSet.changes)
    ) {
        fail('change-set absent ou invalide');
    }
    if (changeSet.changes.length === 0) {
        fail("la qualification n'a produit aucun changement");
    }
    const payload = {
        schema_version: changeSet.schema_version,
        changes: changeSet.changes,
    };
    const expected = `changes:${sha256(stableJson(payload))}`;
    if (changeSet.change_set_id !== expected) {
        fail('change_set_id ne correspond pas au contenu du change-set');
    }
    return expected;
}

function validatePlan(plan, { app, recipe, track, changeSetId, root }) {
    if (!plan || typeof plan !== 'object') fail('plan absent');
    const { plan_id: observedId, ...inputs } = plan;
    const rebuilt = buildLibraryPlan(inputs);
    if (observedId !== rebuilt.plan_id) {
        fail('plan_id ne correspond pas au contenu du plan');
    }
    if (
        plan.app !== app ||
        plan.library !== recipe.library ||
        plan.platform !== recipe.platform ||
        plan.change_set_id !== changeSetId
    ) {
        fail('plan sans concordance app/bibliothèque/plateforme/change-set');
    }
    if (plan.runner_sha256 !== libraryRunnerDigest(root)) {
        fail('plan produit par un runner différent du runner courant');
    }
    const currentInputs = verificationInputs(root, recipe);
    const planInputs = {
        recipe_sha256: currentInputs.recipe,
        recipe_schema_sha256: currentInputs.recipe_schema,
        policy_sha256: currentInputs.policy,
        policy_schema_sha256: currentInputs.policy_schema,
        compat_schema_sha256: currentInputs.compat_schema,
        runner_sha256: currentInputs.runner,
        nx_json_sha256: currentInputs.nx_json,
        tsconfig_sha256: currentInputs.tsconfig,
        gitattributes_sha256: currentInputs.gitattributes,
    };
    for (const [key, expected] of Object.entries(planInputs)) {
        if (plan[key] !== expected) {
            fail(`${key} du plan différent de l'entrée courante`);
        }
    }
    if (!commitExists(root, plan.commit)) {
        fail(`commit du plan absent : ${plan.commit}`);
    }
    const head = git(root, ['rev-parse', '--verify', 'HEAD']);
    if (plan.commit !== head) {
        fail(`le plan ne porte pas le HEAD courant ${head}`);
    }
    const oidLength = objectFormat(root) === 'sha1' ? 40 : 64;
    for (const key of [
        'package_json_initial_oid',
        'package_json_final_oid',
        'bun_lock_initial_oid',
        'bun_lock_final_oid',
    ]) {
        if (!new RegExp(`^[a-f0-9]{${oidLength}}$`).test(plan[key] ?? '')) {
            fail(`${key} invalide pour le format d'objet du dépôt`);
        }
    }
    for (const key of [
        'dependency_initial_sha256',
        'dependency_final_sha256',
    ]) {
        if (!/^[a-f0-9]{64}$/.test(plan[key] ?? '')) {
            fail(`${key} absent ou invalide`);
        }
    }
    const packages = Object.fromEntries(
        Object.entries(track.packages).sort(([left], [right]) =>
            left.localeCompare(right)
        )
    );
    const expectedSchematic = Object.entries(packages)
        .map(([name, version]) => `${name}@${version}`)
        .join(',');
    if (plan.schematic_version !== expectedSchematic) {
        fail('versions de paquets du plan différentes de la piste');
    }
    const tested = {
        node: plan.node_version,
        bun: plan.bun_version,
        nx: plan.nx_version,
        framework: plan.framework_version,
        packages,
    };
    for (const tool of ['node', 'bun', 'nx', 'framework']) {
        if (
            !semver.valid(tested[tool]) ||
            !semver.satisfies(tested[tool], track.requirements[tool], {
                includePrerelease: false,
            })
        ) {
            fail(`${tool} ${tested[tool]} hors de la piste ${track.id}`);
        }
    }
    return {
        planId: observedId,
        tested,
        dependencyStateSha256: {
            initial: plan.dependency_initial_sha256,
            final: plan.dependency_final_sha256,
        },
    };
}

/** Valide une sortie complète de l'exécuteur de qualification. */
export function buildVerificationFromExecution({
    root,
    recipe,
    recipeRegistry,
    track,
    app,
    execution,
}) {
    if (execution?.published !== false) {
        fail('la qualification doit être un dry-run non publié');
    }
    const changeSetId = validateChangeSet(execution.changeSet);
    const { planId, tested, dependencyStateSha256 } = validatePlan(
        execution.plan,
        {
            app,
            recipe,
            track,
            changeSetId,
            root,
        }
    );
    const proofs = assertExactProofs(
        recipe,
        recipeRegistry,
        execution.runtimeProofs
    );
    const payload = {
        schema_version: '1.0.0',
        commit: execution.plan.commit,
        app,
        plan_id: planId,
        change_set_id: changeSetId,
        app_tree_sha256: execution.plan.app_tree_sha256,
        track_sha256: compatibilityTrackDigest(track),
        tested_versions: tested,
        dependency_state_sha256: dependencyStateSha256,
        proofs,
        inputs_sha256: verificationInputs(root, recipe),
    };
    return {
        ...payload,
        evidence_sha256: sha256(stableJson(payload)),
    };
}

export function verificationFailures(
    root,
    recipe,
    track,
    verification,
    { recipeRegistry } = {}
) {
    const failures = [];
    const { evidence_sha256: observedEvidence, ...evidencePayload } =
        verification;
    if (observedEvidence !== sha256(stableJson(evidencePayload))) {
        failures.push(
            "l'empreinte de l'attestation ne correspond pas à son contenu"
        );
    }
    if (!commitExists(root, verification.commit)) {
        failures.push(
            `commit ${verification.commit} absent du dépôt : vérification invérifiable`
        );
    }
    try {
        assertExactProofs(recipe, recipeRegistry, verification.proofs);
    } catch (error) {
        failures.push(error.message);
    }
    if (verification.track_sha256 !== compatibilityTrackDigest(track)) {
        failures.push('la piste a changé depuis sa qualification');
    }
    const exactPackages = Object.fromEntries(
        Object.entries(track.packages).sort(([left], [right]) =>
            left.localeCompare(right)
        )
    );
    if (
        JSON.stringify(verification.tested_versions?.packages) !==
        JSON.stringify(exactPackages)
    ) {
        failures.push('les versions de paquets testées diffèrent de la piste');
    }
    for (const tool of ['node', 'bun', 'nx', 'framework']) {
        const version = verification.tested_versions?.[tool];
        if (
            !semver.valid(version) ||
            !semver.satisfies(version, track.requirements[tool], {
                includePrerelease: false,
            })
        ) {
            failures.push(`${tool} testé absent, invalide ou hors piste`);
        }
    }
    try {
        const manifest = regularFile(root, 'package.json');
        const lock = regularFile(root, 'bun.lock');
        const initial = dependencyProjectionSha256(manifest, lock, track);
        let final;
        try {
            final = dependencyClosureSha256(manifest, lock, track);
        } catch {
            final = undefined;
        }
        if (
            initial !== verification.dependency_state_sha256?.initial &&
            final !== verification.dependency_state_sha256?.final
        ) {
            failures.push(
                'l’état des dépendances ne correspond ni à la projection initiale ni à la fermeture finale qualifiée'
            );
        }
    } catch (error) {
        failures.push(error.message);
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
