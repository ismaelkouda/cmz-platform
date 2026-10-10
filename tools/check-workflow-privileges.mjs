#!/usr/bin/env node
/**
 * check-workflow-privileges.mjs — moindre privilège des workflows GitHub
 *
 * Constat du 2026-10-09 : trois workflows ne déclaraient aucun bloc
 * `permissions` et héritaient du défaut du dépôt (`write`), et le secret
 * `NX_CLOUD_ACCESS_TOKEN` était injecté au niveau du workflow. Le code d'une
 * PR de branche interne s'exécutait donc avec un jeton en écriture et un
 * secret réutilisable.
 *
 * Ce garde refuse le retour de cette classe de défaut. Tout ce qu'il ne
 * reconnaît pas est refusé :
 *
 *   1. événements : un workflow ne se déclenche que sur `REVIEWED_EVENTS`.
 *      Les règles suivantes ne valent que pour eux : sous
 *      `pull_request_target` ou `workflow_run`, `github.ref` désigne `main`
 *      alors que le code exécuté peut venir d'une PR ;
 *   2. jeton : soit un bloc `permissions` racine sans écriture, soit un bloc
 *      `permissions` sur chaque job ;
 *   3. écritures : une permission `write` de job figure dans
 *      `ALLOWED_JOB_WRITES`, qui lie le fichier, le job, les périmètres et
 *      les événements du workflow. Le job porte une condition qui commence
 *      par `github.ref == 'refs/heads/main' &&` et ne contient aucun `||` ;
 *   4. secrets : un secret n'est remis que sous la forme exacte
 *      `${{ github.ref == 'refs/heads/main' && secrets.NOM || '' }}`, dans
 *      l'`env` d'une étape `run`. Jamais au workflow, à un job, à une action
 *      tierce ni dans le texte d'un script. Comparer un secret à la chaîne
 *      vide ne le remet à personne. Toute autre mention du contexte
 *      `secrets` (indexée, `toJSON`, `secrets: inherit`) est refusée.
 *      Le jeton du job s'écrit `github.token` : il est borné par la règle 2 ;
 *   5. destinataires : chaque remise figure dans `ALLOWED_SECRET_HANDOVERS`,
 *      qui lie le fichier, le job, l'`id` de l'étape, la variable
 *      d'environnement et le secret. Une remise absente de la liste, une
 *      étape sans `id`, un `id` porté par deux étapes ou une entrée que le
 *      workflow ne remet plus échouent : la forme correcte ne suffit pas.
 *
 * Limites assumées :
 *   - un workflow modifié sur une branche peut retirer ces protections pour
 *     sa propre exécution. Ce garde protège `main` contre l'oubli et la
 *     régression ; il ne remplace pas la revue des modifications de
 *     `.github/` ;
 *   - il ne suit pas une valeur qu'un script recopie dans `$GITHUB_ENV` ou
 *     `$GITHUB_OUTPUT` ;
 *   - il lie une remise à l'`id` d'une étape, pas au texte de son script :
 *     changer ce que lance une étape listée reste du ressort de la revue ;
 *   - il ne connaît pas les droits du secret lui-même (lecture seule ou
 *     écriture côté fournisseur), qui ne sont pas observables dans le dépôt.
 *
 * Usage : bun run check:workflow-privileges
 */

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse as parseYaml } from 'yaml';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TRUSTED_REF = "github.ref == 'refs/heads/main'";

export const REVIEWED_EVENTS = [
    'pull_request',
    'push',
    'schedule',
    'workflow_dispatch',
];

// Écritures de job acceptées. Toute autre écriture échoue : l'ajouter ici est
// une décision relue, pas un effet de bord.
export const ALLOWED_JOB_WRITES = {
    'security-overrides-repair.yml': {
        events: ['schedule', 'workflow_dispatch'],
        jobs: { publish: ['actions', 'contents', 'pull-requests'] },
    },
};

// Remises de secret acceptées : fichier → job → `id` d'étape → variable
// d'environnement → secret. Toute autre remise échoue, même gardée par
// `main` : l'ajouter ici est une décision relue, pas un effet de bord.
const NX_CLOUD = { NX_CLOUD_ACCESS_TOKEN: 'NX_CLOUD_ACCESS_TOKEN' };
export const ALLOWED_SECRET_HANDOVERS = {
    'ci.yml': {
        oracle: {
            'nx-lint': NX_CLOUD,
            'nx-build': NX_CLOUD,
            'nx-bundle-production': NX_CLOUD,
            'nx-typecheck': NX_CLOUD,
            'nx-test': NX_CLOUD,
        },
    },
    'corpus-full.yml': {
        'corpus-full': { 'corpus-full': NX_CLOUD },
    },
    'nightly-integration.yml': {
        integration: {
            'nx-build-development': NX_CLOUD,
            'nx-build-production': NX_CLOUD,
            'nx-build-react-workspace': NX_CLOUD,
            'nx-build-react-c5': NX_CLOUD,
        },
    },
};

function isMapping(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function writesOf(permissions) {
    if (!isMapping(permissions)) return [];
    return Object.entries(permissions)
        .filter(([, level]) => level === 'write')
        .map(([scope]) => scope)
        .sort();
}

// ─── Expressions GitHub ─────────────────────────────────────────────────────

const TOKEN =
    /\s+|'(?:[^']|'')*'|[A-Za-z_][A-Za-z0-9_-]*|[0-9][0-9a-fA-FxX.eE+-]*|==|!=|<=|>=|&&|\|\||[.[\](),!<>*]/y;

/** Découpe une expression ; `null` si un caractère n'est pas reconnu. */
export function tokenizeExpression(expression) {
    const tokens = [];
    TOKEN.lastIndex = 0;
    while (TOKEN.lastIndex < expression.length) {
        const match = TOKEN.exec(expression);
        if (!match) return null;
        if (match[0].trim()) tokens.push(match[0]);
    }
    return tokens;
}

function sameTokens(tokens, expected) {
    return (
        tokens.length === expected.length &&
        tokens.every((token, index) =>
            expected[index] === null ? true : token === expected[index]
        )
    );
}

const TRUSTED_REF_TOKENS = tokenizeExpression(TRUSTED_REF);
const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_-]*$/;

/**
 * Classe l'usage du contexte `secrets` dans une expression :
 *   { kind: 'none' } | { kind: 'test' } | { kind: 'handover', name }
 *   | { kind: 'unrecognized' }
 */
export function classifySecretUse(expression) {
    const tokens = tokenizeExpression(expression);
    if (tokens === null) {
        return /secrets/i.test(expression)
            ? { kind: 'unrecognized' }
            : { kind: 'none' };
    }
    const roots = tokens
        .map((token, index) => ({ token, index }))
        .filter(
            ({ token, index }) =>
                token.toLowerCase() === 'secrets' && tokens[index - 1] !== '.'
        )
        .map(({ index }) => index);
    if (roots.length === 0) return { kind: 'none' };
    if (
        sameTokens(tokens, [
            ...TRUSTED_REF_TOKENS,
            '&&',
            'secrets',
            '.',
            null,
            '||',
            "''",
        ]) &&
        IDENTIFIER.test(tokens[TRUSTED_REF_TOKENS.length + 3])
    ) {
        return {
            kind: 'handover',
            name: tokens[TRUSTED_REF_TOKENS.length + 3],
        };
    }
    const onlyEmptinessTests = roots.every(
        (index) =>
            tokens[index] === 'secrets' &&
            tokens[index + 1] === '.' &&
            IDENTIFIER.test(tokens[index + 2] ?? '') &&
            (tokens[index + 3] === '==' || tokens[index + 3] === '!=') &&
            tokens[index + 4] === "''"
    );
    return onlyEmptinessTests ? { kind: 'test' } : { kind: 'unrecognized' };
}

function expressionsOf(text, isCondition) {
    const expressions = [...text.matchAll(/\$\{\{([\s\S]*?)\}\}/g)].map(
        ([, expression]) => expression
    );
    // `if:` accepte une expression nue, sans `${{ }}`.
    return isCondition && expressions.length === 0 ? [text] : expressions;
}

// ─── Règles ─────────────────────────────────────────────────────────────────

export function workflowEvents(workflow) {
    // YAML 1.1 lit la clé `on` comme le booléen `true`.
    const on = workflow?.on ?? workflow?.true;
    if (typeof on === 'string') return [on];
    if (Array.isArray(on) && on.every((event) => typeof event === 'string'))
        return [...on].sort();
    if (isMapping(on)) return Object.keys(on).sort();
    return null;
}

export function eventViolations(file, workflow) {
    const events = workflowEvents(workflow);
    if (events === null || events.length === 0)
        return [`${file} : déclencheurs \`on\` absents ou illisibles.`];
    return events
        .filter((event) => !REVIEWED_EVENTS.includes(event))
        .map(
            (event) =>
                `${file} : événement \`${event}\` non relu ; ce garde ne vaut que pour ${REVIEWED_EVENTS.join(', ')}.`
        );
}

function isTrustedRefCondition(condition) {
    if (typeof condition !== 'string') return false;
    const wrapped = /^\s*\$\{\{([\s\S]*)\}\}\s*$/.exec(condition);
    const tokens = tokenizeExpression(wrapped ? wrapped[1] : condition);
    if (tokens === null || tokens.includes('||')) return false;
    const head = tokens.slice(0, TRUSTED_REF_TOKENS.length);
    const next = tokens[TRUSTED_REF_TOKENS.length];
    return (
        sameTokens(head, TRUSTED_REF_TOKENS) &&
        (next === undefined || next === '&&')
    );
}

export function permissionViolations(file, workflow, allowed = {}) {
    const violations = [];
    const root = workflow?.permissions;
    const jobs = isMapping(workflow?.jobs) ? workflow.jobs : {};
    const rootDeclared = root !== undefined;
    const reviewed = allowed[file];
    const reviewedJobs = reviewed?.jobs ?? {};

    if (rootDeclared && !isMapping(root)) {
        violations.push(
            `${file} : \`permissions: ${root}\` au niveau racine ; déclarer chaque périmètre explicitement.`
        );
    }
    for (const scope of writesOf(root)) {
        violations.push(
            `${file} : écriture \`${scope}\` accordée à tous les jobs ; la déclarer sur le seul job qui en a besoin.`
        );
    }

    for (const [jobId, job] of Object.entries(jobs)) {
        const declared = job?.permissions;
        if (declared === undefined) {
            if (!rootDeclared) {
                violations.push(
                    `${file} › ${jobId} : aucun bloc \`permissions\` ; le job hériterait du défaut du dépôt.`
                );
            }
            continue;
        }
        if (!isMapping(declared)) {
            violations.push(
                `${file} › ${jobId} : \`permissions: ${declared}\` ; déclarer chaque périmètre explicitement.`
            );
            continue;
        }
        const expected = [...(reviewedJobs[jobId] ?? [])].sort();
        const actual = writesOf(declared);
        const unexpected = actual.filter((scope) => !expected.includes(scope));
        const obsolete = expected.filter((scope) => !actual.includes(scope));
        if (unexpected.length) {
            violations.push(
                `${file} › ${jobId} : écriture non relue (${unexpected.join(', ')}) ; l'ajouter à ALLOWED_JOB_WRITES après revue.`
            );
        }
        if (obsolete.length) {
            violations.push(
                `${file} › ${jobId} : ALLOWED_JOB_WRITES liste ${obsolete.join(', ')} que le job ne demande plus.`
            );
        }
        if (actual.length && !isTrustedRefCondition(job.if)) {
            violations.push(
                `${file} › ${jobId} : un job qui écrit doit porter \`if: ${TRUSTED_REF} && …\`, sans \`||\` ; sinon un lancement depuis une autre ref écrit avec le code de cette ref.`
            );
        }
    }
    if (reviewed) {
        const events = workflowEvents(workflow) ?? [];
        const expectedEvents = [...(reviewed.events ?? [])].sort();
        if (JSON.stringify(events) !== JSON.stringify(expectedEvents)) {
            violations.push(
                `${file} : écritures relues pour les événements ${expectedEvents.join(', ')} ; le workflow se déclenche sur ${events.join(', ') || '(aucun)'}.`
            );
        }
    }
    for (const jobId of Object.keys(reviewedJobs)) {
        if (!(jobId in jobs)) {
            violations.push(
                `${file} : ALLOWED_JOB_WRITES cite le job \`${jobId}\`, absent du workflow.`
            );
        }
    }
    return violations;
}

function isRunStepEnv(workflow, path) {
    if (
        path.length !== 6 ||
        path[0] !== 'jobs' ||
        path[2] !== 'steps' ||
        path[4] !== 'env'
    ) {
        return false;
    }
    const step = workflow.jobs?.[path[1]]?.steps?.[path[3]];
    return typeof step?.run === 'string';
}

function reviewedHandovers(allowed) {
    return Object.entries(allowed ?? {}).flatMap(([jobId, steps]) =>
        Object.entries(steps).flatMap(([stepId, variables]) =>
            Object.entries(variables).map(([variable, secret]) =>
                [jobId, stepId, variable, secret].join(' › ')
            )
        )
    );
}

export function secretViolations(file, workflow, allowed = {}) {
    const violations = [];
    const where = (path) => `${file} › ${path.join('.')}`;
    const reviewed = new Set(reviewedHandovers(allowed[file]));
    const seen = new Set();
    const bindToReviewedStep = (path, secret) => {
        const [, jobId, , stepIndex, , variable] = path;
        const stepId = workflow.jobs[jobId].steps[stepIndex].id;
        if (typeof stepId !== 'string' || stepId === '') {
            violations.push(
                `${where(path)} : l'étape qui reçoit \`secrets.${secret}\` doit porter un \`id\` ; ALLOWED_SECRET_HANDOVERS lie chaque remise à une étape nommée.`
            );
            return;
        }
        const handover = [jobId, stepId, variable, secret].join(' › ');
        if (!reviewed.has(handover)) {
            violations.push(
                `${file} › ${handover} : remise de secret non relue ; l'ajouter à ALLOWED_SECRET_HANDOVERS après revue.`
            );
        } else if (seen.has(handover)) {
            violations.push(
                `${file} › ${handover} : remise présente dans deux étapes de même \`id\` ; une entrée relue vaut pour une seule étape.`
            );
        }
        seen.add(handover);
    };
    const visit = (node, path) => {
        if (Array.isArray(node)) {
            node.forEach((item, index) => visit(item, [...path, index]));
            return;
        }
        if (isMapping(node)) {
            for (const [key, value] of Object.entries(node))
                visit(value, [...path, key]);
            return;
        }
        if (typeof node !== 'string') return;
        const isCondition = path.at(-1) === 'if';
        for (const expression of expressionsOf(node, isCondition)) {
            const use = classifySecretUse(expression);
            if (use.kind === 'unrecognized') {
                violations.push(
                    `${where(path)} : usage du contexte \`secrets\` non reconnu ; seule la forme \`\${{ ${TRUSTED_REF} && secrets.NOM || '' }}\` remet un secret.`
                );
            } else if (use.kind === 'handover') {
                if (
                    !isRunStepEnv(workflow, path) ||
                    node.trim() !== `\${{${expression}}}`
                ) {
                    violations.push(
                        `${where(path)} : \`secrets.${use.name}\` n'est remis qu'à l'\`env\` d'une étape \`run\`, jamais au workflow, à un job, à une action ni au texte d'un script.`
                    );
                } else {
                    bindToReviewedStep(path, use.name);
                }
            }
        }
    };
    visit(workflow, []);
    for (const [jobId, job] of Object.entries(
        isMapping(workflow?.jobs) ? workflow.jobs : {}
    )) {
        if (job?.secrets !== undefined) {
            violations.push(
                `${file} › ${jobId} : \`secrets:\` transmet des secrets à un workflow appelé ; forme non relue.`
            );
        }
    }
    for (const handover of reviewed) {
        if (!seen.has(handover)) {
            violations.push(
                `${file} : ALLOWED_SECRET_HANDOVERS cite ${handover}, que le workflow ne remet plus.`
            );
        }
    }
    return violations;
}

export function checkWorkflows(
    workflows,
    { writes = ALLOWED_JOB_WRITES, handovers = ALLOWED_SECRET_HANDOVERS } = {}
) {
    const known = new Set(workflows.map(({ file }) => file));
    const cited = [
        ...new Set([...Object.keys(writes), ...Object.keys(handovers)]),
    ];
    return [
        ...workflows.flatMap(({ file, content }) => {
            let workflow;
            try {
                workflow = parseYaml(content);
            } catch (error) {
                return [`${file} : YAML illisible (${error.message}).`];
            }
            if (!isMapping(workflow))
                return [`${file} : le workflow n'est pas un mapping YAML.`];
            return [
                ...eventViolations(file, workflow),
                ...permissionViolations(file, workflow, writes),
                ...secretViolations(file, workflow, handovers),
            ];
        }),
        ...cited
            .sort()
            .filter((file) => !known.has(file))
            .map((file) => `${file} : cité par ce garde mais introuvable.`),
    ];
}

function loadWorkflows() {
    const directory = join(ROOT, '.github', 'workflows');
    return readdirSync(directory)
        .filter((file) => /\.ya?ml$/.test(file))
        .sort()
        .map((file) => ({
            file,
            content: readFileSync(join(directory, file), 'utf8'),
        }));
}

function main() {
    const workflows = loadWorkflows();
    const violations = checkWorkflows(workflows);
    if (violations.length) {
        console.error('❌ check:workflow-privileges');
        for (const violation of violations) console.error(`  - ${violation}`);
        process.exit(1);
    }
    console.log(
        `✅ check:workflow-privileges — ${workflows.length} workflows : événements relus, jetons en lecture par défaut, écritures liées à main, secrets remis sur main aux seules étapes relues.`
    );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
