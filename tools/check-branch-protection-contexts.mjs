#!/usr/bin/env node
/**
 * check-branch-protection-contexts.mjs — audit gouvernance `main`
 *
 * Même classe de bug que `check-ci-wiring.mjs`, côté forge : la liste
 * `required_status_checks.contexts` de `.github/branch-protection.main.json`
 * est maintenue à la main. Rien ne garantit qu'elle reste synchronisée avec
 * les jobs bloquants réellement produits par `.github/workflows/ci.yml` sur
 * une PR vers `main`. Deux dérives silencieuses possibles :
 *
 *   1. Un job bloquant ajouté / renommé dans `ci.yml` mais absent des
 *      contextes → la PR peut être fusionnée sans que ce job soit vert.
 *   2. Un contexte requis obsolète (job supprimé / renommé) → GitHub attend
 *      indéfiniment un check qui n'arrivera jamais : **toutes les PR sont
 *      bloquées**.
 *
 * Ce script impose l'égalité stricte entre :
 *   - l'ensemble des noms de check-runs des jobs bloquants de `ci.yml`
 *     (matrices dépliées) ;
 *   - `required_status_checks.contexts` du JSON de protection.
 *
 * « Bloquant » = tout job, SAUF :
 *   - un job portant `continue-on-error: true` au niveau job ;
 *   - un job explicitement listé dans `STEP_LEVEL_REPORT_ONLY` (rapport seul
 *     via `continue-on-error` au niveau step — cf. `sast` / Semgrep, T4-3).
 *
 * Fail-closed : tout NOUVEAU job est requis par défaut. Pour en exclure un,
 * il faut consciemment l'ajouter ci-dessous, avec sa justification.
 *
 * Usage : bun run check:branch-protection-contexts
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse as parseYaml } from 'yaml';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WORKFLOW_PATH = join(ROOT, '.github/workflows/ci.yml');
const PROTECTION_PATH = join(ROOT, '.github/branch-protection.main.json');

/**
 * Jobs `ci.yml` volontairement non bloquants alors qu'ils n'ont PAS de
 * `continue-on-error` au niveau job (il porte sur une step). Clé = clé de job.
 */
export const STEP_LEVEL_REPORT_ONLY = new Set([
    // T4-3 — Semgrep en rapport seul pour ce rollout : le step `scan` porte
    // `continue-on-error: true` et n'utilise pas `--error`. À retirer d'ici
    // quand le job repassera bloquant (cf. docstring du job dans ci.yml).
    'sast',
]);

/** Produit cartésien des axes de matrice `{ k: [v1, v2], ... }`. */
export function cartesianProduct(axes) {
    return Object.entries(axes).reduce(
        (combos, [key, values]) =>
            combos.flatMap((combo) =>
                (Array.isArray(values) ? values : [values]).map((value) => ({
                    ...combo,
                    [key]: value,
                }))
            ),
        [{}]
    );
}

/**
 * Déplie `strategy.matrix` en la liste des combinaisons effectives, en
 * appliquant `exclude` puis `include` (sémantique GitHub, cas usuels).
 */
export function expandMatrix(matrix) {
    if (!matrix || typeof matrix !== 'object') return [{}];

    const { include = [], exclude = [], ...axes } = matrix;
    let combos = Object.keys(axes).length ? cartesianProduct(axes) : [];

    for (const removed of exclude) {
        combos = combos.filter(
            (combo) =>
                !Object.entries(removed).every(([k, v]) => combo[k] === v)
        );
    }

    for (const added of include) {
        const axisKeys = Object.keys(axes);
        const overlap = Object.keys(added).filter((k) => axisKeys.includes(k));
        const target = combos.find((combo) =>
            overlap.every((k) => combo[k] === added[k])
        );
        if (overlap.length && target) {
            Object.assign(target, added);
        } else {
            combos.push({ ...added });
        }
    }

    return combos.length ? combos : [{}];
}

/** Remplace les `${{ matrix.<clef> }}` d'un gabarit de nom par la combinaison. */
export function renderName(template, combo) {
    const unresolved = [];
    const rendered = template.replace(
        /\$\{\{\s*matrix\.([\w.-]+)\s*\}\}/g,
        (_, key) => {
            if (!(key in combo)) {
                unresolved.push(key);
                return _;
            }
            return String(combo[key]);
        }
    );
    if (unresolved.length) {
        throw new Error(
            `Gabarit de nom non résolu (${unresolved.join(', ')}) : ` +
                `"${template}" — étendre check-branch-protection-contexts.mjs.`
        );
    }
    return rendered;
}

/** Le nom de check-run GitHub pour un job (matrice dépliée si besoin). */
export function jobContexts(jobKey, job) {
    const base = typeof job?.name === 'string' ? job.name : jobKey;
    const matrix = job?.strategy?.matrix;
    if (!matrix) return [base];

    const combos = expandMatrix(matrix);
    const templated = /\$\{\{\s*matrix\./.test(base);
    return combos.map((combo) =>
        templated
            ? renderName(base, combo)
            : `${base} (${Object.values(combo).join(', ')})`
    );
}

/** True si le job est volontairement non bloquant. */
export function isReportOnly(jobKey, job) {
    return (
        job?.['continue-on-error'] === true ||
        STEP_LEVEL_REPORT_ONLY.has(jobKey)
    );
}

/** Vérifie que le workflow se déclenche bien sur une PR vers `main`. */
export function assertPullRequestToMain(workflow, label) {
    // YAML parse `on:` en clé booléenne `true` dans certains cas.
    const on = workflow?.on ?? workflow?.true;
    const pr = on?.pull_request;
    const branches = pr?.branches ?? [];
    if (!pr || !branches.includes('main')) {
        throw new Error(
            `${label} : ne se déclenche pas sur \`pull_request\` vers \`main\` — ` +
                `le modèle des status checks requis ne s'applique plus, revoir ce script.`
        );
    }
}

/** Ensemble des contextes bloquants attendus, calculé depuis `ci.yml`. */
export function expectedContexts(workflowContent, label = 'ci.yml') {
    let workflow;
    try {
        workflow = parseYaml(workflowContent);
    } catch (error) {
        throw new Error(`${label} : YAML invalide (${error.message})`);
    }
    assertPullRequestToMain(workflow, label);

    const jobs = workflow?.jobs ?? {};
    const missingExclusions = [...STEP_LEVEL_REPORT_ONLY].filter(
        (key) => !(key in jobs)
    );
    if (missingExclusions.length) {
        throw new Error(
            `STEP_LEVEL_REPORT_ONLY référence des jobs absents de ${label} ` +
                `(${missingExclusions.join(', ')}) — renommage non répercuté ?`
        );
    }

    const contexts = new Set();
    for (const [jobKey, job] of Object.entries(jobs)) {
        if (isReportOnly(jobKey, job)) continue;
        for (const context of jobContexts(jobKey, job)) contexts.add(context);
    }
    return contexts;
}

/** Contextes déclarés dans le JSON de protection. */
export function declaredContexts(
    protectionContent,
    label = 'branch-protection'
) {
    let json;
    try {
        json = JSON.parse(protectionContent);
    } catch (error) {
        throw new Error(`${label} : JSON invalide (${error.message})`);
    }
    const contexts = json?.required_status_checks?.contexts;
    if (!Array.isArray(contexts)) {
        throw new Error(
            `${label} : \`required_status_checks.contexts\` absent ou non-liste.`
        );
    }
    return contexts;
}

/** { missing, stale } — asymétries entre attendu et déclaré. */
export function diffContexts(expected, declared) {
    const declaredSet = new Set(declared);
    return {
        missing: [...expected].filter((c) => !declaredSet.has(c)).sort(),
        stale: declared.filter((c) => !expected.has(c)).sort(),
        duplicates: declared.filter((c, i) => declared.indexOf(c) !== i).sort(),
    };
}

function main() {
    const expected = expectedContexts(readFileSync(WORKFLOW_PATH, 'utf8'));
    const declared = declaredContexts(readFileSync(PROTECTION_PATH, 'utf8'));
    const { missing, stale, duplicates } = diffContexts(expected, declared);

    console.log(
        `[check:branch-protection-contexts] ${expected.size} job(s) bloquant(s) ` +
            `dans ci.yml · ${declared.length} contexte(s) requis déclaré(s).`
    );

    if (!missing.length && !stale.length && !duplicates.length) {
        console.log(
            '\n✔ `.github/branch-protection.main.json` couvre exactement les ' +
                'jobs bloquants de `ci.yml`.'
        );
        return;
    }

    if (missing.length) {
        console.error(
            '\n✖ Job(s) bloquant(s) de `ci.yml` absent(s) des contextes requis ' +
                '(fusionnable sans ce job vert) :\n'
        );
        for (const c of missing) console.error(`  + ${c}`);
    }
    if (stale.length) {
        console.error(
            '\n✖ Contexte(s) requis sans job correspondant dans `ci.yml` ' +
                "(GitHub attend un check qui n'arrivera jamais → toute PR bloquée) :\n"
        );
        for (const c of stale) console.error(`  - ${c}`);
    }
    if (duplicates.length) {
        console.error('\n✖ Contexte(s) requis en double :\n');
        for (const c of duplicates) console.error(`  ! ${c}`);
    }
    console.error(
        '\nMettre à jour `required_status_checks.contexts` dans ' +
            '`.github/branch-protection.main.json` puis `bun run protect:main`. ' +
            'Un job volontairement en rapport seul se déclare dans ' +
            'STEP_LEVEL_REPORT_ONLY (ce fichier) avec sa justification.'
    );
    process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
