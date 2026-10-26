#!/usr/bin/env node
// Données et contrats du workflow natif Nx. Git, Nx, Bun et les promotions
// restent des commandes visibles dans le YAML ; ce module ne les exécute pas.
import {
    appendFileSync,
    lstatSync,
    mkdirSync,
    readFileSync,
    readdirSync,
    writeFileSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { parse as parseYaml } from 'yaml';
import { nxFollowupErrors } from './check-workflow-privileges.mjs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { stripVTControlCharacters } from 'node:util';
import semver from 'semver';

export function parseSelectors(raw) {
    const selectors = JSON.parse(raw);
    if (
        !Array.isArray(selectors) ||
        !selectors.length ||
        new Set(selectors).size !== selectors.length ||
        !selectors.includes('nx') ||
        selectors.some(
            (s) =>
                typeof s !== 'string' ||
                !/^(?:[a-z0-9-]+|@[a-z0-9-]+\/(?:[a-z0-9-]+|\*))$/.test(s)
        )
    )
        throw new Error('sélecteurs Nx invalides');
    return selectors;
}

function selected(name, selectors) {
    return selectors.some((s) =>
        s.endsWith('/*') ? name.startsWith(s.slice(0, -1)) : name === s
    );
}

function manifestVersion(pkg, name, spec) {
    if (spec === 'catalog:') return pkg.workspaces?.catalog?.[name];
    if (spec?.startsWith('catalog:')) {
        return pkg.workspaces?.catalogs?.[spec.slice(8)]?.[name];
    }
    return spec;
}

export function migrationPlan(pkg, metadata, selectors, requested = '') {
    const versions = new Map();
    for (const field of ['dependencies', 'devDependencies']) {
        for (const [name, spec] of Object.entries(pkg[field] ?? {})) {
            if (!selected(name, selectors)) continue;
            if (versions.has(name))
                throw new Error(`déclaration double : ${name}`);
            const version = manifestVersion(pkg, name, spec);
            if (!semver.valid(version) || semver.prerelease(version)) {
                throw new Error(`version stable exacte requise : ${name}`);
            }
            versions.set(name, version);
        }
    }
    const current = versions.get('nx');
    if (!current || [...versions.values()].some((v) => v !== current)) {
        throw new Error('famille Nx absente ou désalignée');
    }
    if (
        selectors.some(
            (s) => ![...versions.keys()].some((n) => selected(n, [s]))
        )
    ) {
        throw new Error('sélecteur sans paquet effectivement calculé');
    }
    const eligible = Object.entries(metadata.versions ?? {})
        .filter(
            ([v, data]) =>
                semver.valid(v) &&
                !semver.prerelease(v) &&
                !data.deprecated &&
                semver.gt(v, current) &&
                semver.major(v) <= semver.major(current) + 1
        )
        .map(([v]) => v)
        .sort(semver.rcompare);
    if (requested && !eligible.includes(requested)) {
        throw new Error(
            'cible absente, non stable, rétrograde ou saut de majeure'
        );
    }
    return {
        current,
        target: requested || eligible[0] || '',
        packages: [...versions.keys()].sort(),
    };
}

// Le garde Dependabot réemploie ce contrat, sans liste parallèle de paquets.
// Une simple déclaration YAML ne justifie jamais une exclusion.
export function workflowSelectors(workflow) {
    const selectors = parseSelectors(workflow?.env?.NX_MIGRATION_SELECTORS);
    const job = workflow?.jobs?.plan;
    const step = job?.steps?.find((s) => s.id === 'plan');
    if (
        job?.if !== undefined ||
        step?.if !== undefined ||
        step?.env?.NX_MIGRATION_SELECTORS !== undefined ||
        job?.env?.NX_MIGRATION_SELECTORS !== undefined ||
        step?.run?.trim() !==
            'node tools/nx-migration-plan.mjs plan --selectors "$NX_MIGRATION_SELECTORS"'
    ) {
        throw new Error(
            'déclaration Nx sans calcul opérationnel des mêmes sélecteurs'
        );
    }
    const calculation = workflow?.jobs?.calculate;
    const generation = calculation?.steps?.find((s) => s.id === 'generate');
    const migration = calculation?.steps?.find((s) => s.id === 'migrate');
    const target = '${{ needs.plan.outputs.target }}';
    if (
        calculation?.needs !== 'plan' ||
        calculation?.if !== "needs.plan.outputs.target != ''" ||
        calculation?.env?.TARGET !== target ||
        calculation?.env?.NX_MIGRATE_CLI_VERSION !== target ||
        calculation?.env?.NX_MIGRATION_SELECTORS !== undefined ||
        generation?.if !== undefined ||
        migration?.if !== undefined ||
        !generation?.run
            ?.split('\n')
            .some((line) =>
                line.startsWith(
                    'bunx nx migrate "nx@$TARGET" --include=required --agentic=false 2>&1 | tee '
                )
            ) ||
        !migration?.run?.includes(
            'bunx nx migrate --runMigrations=migrations.json --skipInstall --agentic=false 2>&1 | tee '
        ) ||
        calculation.steps.some((s) =>
            ['TARGET', 'NX_MIGRATE_CLI_VERSION', 'NX_MIGRATION_SELECTORS'].some(
                (key) => s.env?.[key] !== undefined
            )
        )
    ) {
        throw new Error(
            'calcul Nx absent, désactivé ou délié de la cible native'
        );
    }
    return selectors;
}

export const PUBLISH_CONDITION =
    "github.ref == 'refs/heads/main' && github.event_name != 'pull_request' && needs.calculate.result == 'success' && needs.assess.outputs.state == 'ready' && needs.plan.outputs.target != ''";

export const FOLLOWUP_CONDITION =
    "github.ref == 'refs/heads/main' && github.event_name != 'pull_request' && needs.assess.outputs.state == 'action-required'";

// Point de raccord pour le garde après revue de PEER-GRAPH. Les autres
// exclusions restent intégralement soumises à sa justification par les pairs.
export function delegatedIgnorePolicy(config, pkg, workflow) {
    const errors = nxWorkflowErrors(workflow);
    if (errors.length) return { config, errors };
    const selectors = workflowSelectors(workflow);
    try {
        migrationPlan(pkg, { versions: {} }, selectors);
    } catch (error) {
        return { config, errors: [error.message] };
    }
    const copy = structuredClone(config);
    for (const update of copy.updates ?? []) {
        if (update['package-ecosystem'] !== 'bun' || update.directory !== '/')
            continue;
        if (!Array.isArray(update.ignore ?? []))
            return { config, errors: ['ignore doit être une liste'] };
        const delegated = (update.ignore ?? []).filter((e) =>
            selectors.includes(e?.['dependency-name'])
        );
        if (!delegated.length) continue;
        const names = delegated.map((e) => e['dependency-name']);
        if (
            names.length !== selectors.length ||
            selectors.some((s) => !names.includes(s)) ||
            delegated.some((e) => Object.keys(e).length !== 1)
        ) {
            return {
                config,
                errors: [
                    'exclusions déléguées non égales aux sélecteurs opérationnels (sans versions ni update-types)',
                ],
            };
        }
        update.ignore = update.ignore.filter(
            (e) => !selectors.includes(e?.['dependency-name'])
        );
    }
    return { config: copy, errors: [] };
}

export function nxWorkflowErrors(workflow) {
    workflow ??= {};
    const errors = [];
    if (
        /Co-Authored-By:|Préparé par Codex/i.test(JSON.stringify(workflow.jobs))
    ) {
        errors.push(
            'les sorties futures de l’automate ne sont pas attribuées à un agent'
        );
    }
    const readOnly = (p) =>
        JSON.stringify(p) === JSON.stringify({ contents: 'read' });
    if (!readOnly(workflow.permissions))
        errors.push('permissions racine : contents: read exclusivement');
    const events = Object.keys(workflow.on ?? {});
    if (
        events.some(
            (e) =>
                !['schedule', 'workflow_dispatch', 'pull_request'].includes(e)
        )
    )
        errors.push('événement non relu');
    const paths = workflow.on?.pull_request?.paths;
    const ownPaths = [
        '.github/workflows/nx-migrations.yml',
        'tools/nx-migration*.mjs',
        'tools/check-ci-wiring.test.mjs',
    ];
    if (
        !Array.isArray(paths) ||
        paths.length !== ownPaths.length ||
        ownPaths.some((p) => !paths.includes(p))
    )
        errors.push('bootstrap limité aux fichiers propres du workflow');
    const publisher = workflow.jobs?.publish;
    if (
        publisher?.if !== PUBLISH_CONDITION ||
        JSON.stringify(publisher?.needs) !==
            JSON.stringify(['plan', 'calculate', 'assess'])
    )
        errors.push(
            'publication accessible à une PR ou sans les deux systèmes verts'
        );
    if (
        publisher?.env?.EXPECTED_BUNDLE_SHA256 !==
            '${{ needs.calculate.outputs.linux_bundle_sha256 }}' ||
        publisher?.env?.EXPECTED_HEAD !==
            '${{ needs.calculate.outputs.linux_head }}'
    )
        errors.push('intégrité non liée à la sortie Linux du même calcul');
    if (
        JSON.stringify(publisher?.permissions) !==
        JSON.stringify({
            actions: 'write',
            contents: 'write',
            'pull-requests': 'write',
        })
    )
        errors.push('permissions du seul job de publication incorrectes');
    const publishRuns = (publisher?.steps ?? [])
        .map((s) => s.run ?? '')
        .join('\n')
        .replace(/\\\r?\n\s*/g, ' ');
    if (
        /\b(?:node|bun|bunx|nx|python[0-9.]*)\s|(?:^|\n)\s*(?:source|eval|bash|sh)\b/.test(
            publishRuns
        )
    )
        errors.push('exécution de code interdite dans la publication');
    for (const required of [
        '"$EXPECTED_BUNDLE_SHA256" "$bundle" | shasum -a 256 --check --strict',
        'git bundle verify "$bundle"',
        'git merge-base --is-ancestor "$SOURCE_SHA"',
        'git diff-tree --no-commit-id -r --name-only -z "$commit"',
        'gh pr create --draft ',
        'gh workflow run ci.yml',
        '--ref "$MIGRATION_BRANCH"',
    ]) {
        if (!publishRuns.includes(required))
            errors.push(`garde de publication manquante : ${required}`);
    }
    if (
        [
            /\bgh\b(?!\s+(?:pr\s+(?:list|edit)|pr\s+create\s+--draft|auth\s+setup-git|workflow\s+run)(?:\s|$))|--(?:force|no-verify)\b/,
            /\bgh\s+pr\s+(?:create|edit)\b[^\n;&|]*\s(?:-r|--(?:add-reviewer|reviewer)(?:[=\s]|$)|(?:--draft|-d)=)/,
        ].some((rule) => rule.test(publishRuns))
    )
        errors.push('commande gh ou options de publication non relues');
    const tokenFree = { ...workflow, jobs: { ...workflow.jobs } };
    delete tokenFree.jobs.publish;
    delete tokenFree.jobs.followup;
    if (
        /\bsecrets\b|github\.token|"(?:GH_TOKEN|GITHUB_TOKEN)"/.test(
            JSON.stringify(tokenFree)
        )
    )
        errors.push('secret ou jeton explicite dans le calcul de PR');
    for (const [name, job] of Object.entries(workflow.jobs ?? {})) {
        if (['publish', 'followup'].includes(name)) continue;
        if (job.permissions !== undefined && !readOnly(job.permissions))
            errors.push(`${name} : jeton en écriture ou permissions élargies`);
        for (const step of job.steps ?? []) {
            // Les journaux Nx peuvent sortir sur stderr, y compris l'aide.
            for (const line of (step.run ?? '').split('\n')) {
                if (
                    /^\s*(?:if\s+)?bunx nx\b.*\|\s*tee\s/.test(line) &&
                    !/2>&1\s*\|\s*tee\s/.test(line)
                )
                    errors.push(
                        `${name} : capture Nx incomplète, stderr absent avant tee`
                    );
            }
            if (
                step.uses?.startsWith('actions/checkout@') &&
                step.with?.['persist-credentials'] !== false
            )
                errors.push(`${name} : credentials persistés`);
            if (
                /\b(?:git\s+push|gh\s+(?:pr\s+(?:create|edit|merge)|workflow\s+run))\b/.test(
                    step.run ?? ''
                )
            )
                errors.push(`${name} : publication interdite dans le calcul`);
        }
    }
    for (const step of publisher?.steps ?? []) {
        if (
            step.uses?.startsWith('actions/download-artifact@') &&
            (step.with?.name !==
                'nx-migration-ubuntu-latest-${{ github.run_id }}-${{ github.run_attempt }}' ||
                step.with?.['run-id'] !== undefined ||
                step.with?.repository !== undefined)
        )
            errors.push('artefact extérieur au run de confiance');
        if (
            step.uses?.startsWith('actions/checkout@') &&
            (step.with?.ref !== '${{ github.sha }}' ||
                step.with?.['persist-credentials'] !== false)
        )
            errors.push(
                'publication : seul le code de main exact doit être extrait'
            );
        if (
            step.uses &&
            !['actions/checkout@v7', 'actions/download-artifact@v7'].includes(
                step.uses
            )
        )
            errors.push('action non relue dans la publication');
    }
    try {
        workflowSelectors(workflow);
    } catch (error) {
        errors.push(error.message);
    }
    return [...errors, ...outcomeWorkflowErrors(workflow)];
}

// Un diagnostic n'est jamais un candidat publiable. Les commandes Git/Nx restent
// dans le YAML ; ce module ne lit/copie que leurs pièces et leurs états.
export function migrationOutcome(raw, exitCode, plan) {
    const log = stripVTControlCharacters(raw);
    if (exitCode !== 0 || !Array.isArray(plan.migrations))
        throw new Error('fin Nx ou plan invalide');
    try {
        if (
            !log.includes(
                "Successfully finished running migrations from 'migrations.json'."
            ) &&
            !log.includes(
                "No changes were made from running 'migrations.json'."
            )
        )
            throw new Error('fin native non reconnue');
        assertMigrationComplete(log);
        return { state: 'ready', pending: [] };
    } catch {
        /* Examiner séparément la seule fin différée reconnue. */
    }
    if (
        !log.includes(
            "Successfully finished running migrations from 'migrations.json'."
        ) ||
        /Working-tree state retained|Next steps for the AI agent|prompt migrations? deferred/.test(
            log
        )
    )
        throw new Error('fin native différée non reconnue');
    const notes = log.split(
        'Some migrations have additional information, see below.'
    );
    if (notes.length !== 2) throw new Error('notes Nx ambiguës');
    const lines = notes[1]
        .trim()
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
    if (
        lines.shift() !==
        '- Some prompt migrations were skipped. Review and apply each of the following prompt files to the workspace, in the listed order:'
    )
        throw new Error('instructions Nx non reconnues');
    const paths = lines.map((l) => {
        if (!l.startsWith('- tools/ai-migrations/'))
            throw new Error('note Nx supplémentaire');
        return l.slice(2);
    });
    const tally = [...log.matchAll(/\b(\d+) prompt migrations? skipped\b/g)];
    const pending = paths.flatMap((path) =>
        plan.migrations.filter((m) => m.prompt === path)
    );
    if (
        !paths.length ||
        new Set(paths).size !== paths.length ||
        tally.length !== 1 ||
        Number(tally[0][1]) !== pending.length ||
        paths.some((path) => !pending.some((m) => m.prompt === path))
    )
        throw new Error('plan et prompts différés incohérents');
    return {
        state: 'action-required',
        pending: pending.map((m) => {
            const remaining = { ...m };
            delete remaining.implementation;
            delete remaining.factory;
            return remaining;
        }),
    };
}

function piece(root, path) {
    if (lstatSync(root).isSymbolicLink() || !lstatSync(root).isDirectory())
        throw new Error('racine de pièce liée ou non répertoire');
    if (
        typeof path !== 'string' ||
        !path ||
        /[\\\r\n\0]/.test(path) ||
        path.split('/').some((p) => !p || p === '.' || p === '..')
    )
        throw new Error('chemin de pièce invalide');
    let file = root;
    for (const part of path.split('/')) {
        file = join(file, part);
        if (lstatSync(file).isSymbolicLink())
            throw new Error('pièce liée refusée');
    }
    if (!lstatSync(file).isFile()) throw new Error('pièce non régulière');
    return readFileSync(file);
}
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const json = (root, path) => JSON.parse(piece(root, path));
const writeJson = (path, data) =>
    writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
function prompts(plan) {
    return [
        ...new Set(plan.migrations.map((m) => m.prompt).filter(Boolean)),
    ].map((p) => {
        if (!p.startsWith('tools/ai-migrations/') || !p.endsWith('.md'))
            throw new Error('prompt hors du répertoire natif');
        return p;
    });
}
function identity(system, env = process.env) {
    const value = {
        repository: env.GITHUB_REPOSITORY,
        head: env.SOURCE_SHA,
        run: env.GITHUB_RUN_ID,
        attempt: env.GITHUB_RUN_ATTEMPT,
        target: env.TARGET,
        system,
    };
    if (
        !/^[\w.-]+\/[\w.-]+$/.test(value.repository ?? '') ||
        !/^[0-9a-f]{40}$/.test(value.head ?? '') ||
        !/^\d+$/.test(value.run ?? '') ||
        !/^[1-9]\d*$/.test(value.attempt ?? '') ||
        !semver.valid(value.target) ||
        semver.prerelease(value.target) ||
        !/^(?:ubuntu|macos)-[a-z0-9.-]+$/.test(system ?? '')
    )
        throw new Error('identité de calcul invalide');
    return value;
}

export function recordMigrationOutcome(root, out, exitCode) {
    const plan = json(root, 'migrations.json');
    const paths = prompts(plan);
    // Copier les octets livrés par Nx, avant toute suppression du candidat.
    for (const path of paths) {
        const bytes = piece(root, path);
        mkdirSync(dirname(join(out, path)), { recursive: true });
        writeFileSync(join(out, path), bytes);
    }
    writeFileSync(
        join(out, 'prompts.generated.list'),
        paths.join('\n') + (paths.length ? '\n' : '')
    );
    const outcome = migrationOutcome(
        piece(out, 'run-migrations.txt').toString(),
        exitCode,
        plan
    );
    writeJson(join(out, 'migrations.remaining.json'), {
        migrations: outcome.pending,
    });
    writeJson(join(out, 'migration-state.json'), outcome);
    return outcome.state;
}

function resultPaths(state, plan) {
    const paths = [
        'migrations.generated.json',
        'migrations.remaining.json',
        'run-migrations.txt',
        'partial.diff',
        ...prompts(plan),
    ];
    if (state === 'ready')
        paths.push(
            'candidate.bundle',
            'head-sha.txt',
            'identity.txt',
            'material.txt',
            'tailwind-angular.txt',
            'tailwind-react.txt'
        );
    return paths;
}

export function collectMigrationResult(out, jobStatus, env = process.env) {
    let state = 'failed';
    const files = {};
    try {
        const outcome = json(out, 'migration-state.json');
        const plan = json(out, 'migrations.generated.json');
        const paths = resultPaths(outcome.state, plan);
        for (const path of paths) files[path] = digest(piece(out, path));
        if (
            jobStatus === 'success' &&
            ['ready', 'action-required'].includes(outcome.state)
        )
            state = outcome.state;
    } catch {
        /* Conserver un diagnostic failed, même si la panne précède Nx. */
    }
    const result = { ...identity(env.MIGRATION_SYSTEM, env), state, files };
    writeJson(join(out, 'result.json'), result);
    return result;
}

export function aggregateMigrationResults(root, systems, env = process.env) {
    const names = systems.map(
        (s) =>
            `nx-migration-${s}-${env.GITHUB_RUN_ID}-${env.GITHUB_RUN_ATTEMPT}`
    );
    if (
        JSON.stringify(readdirSync(root).sort()) !==
        JSON.stringify([...names].sort())
    )
        throw new Error('artefacts de systèmes manquants ou supplémentaires');
    const states = systems.map((system, i) => {
        const dir = join(root, names[i]);
        const result = json(dir, 'result.json');
        const expected = identity(system, env);
        if (
            Object.entries(expected).some(([k, v]) => result[k] !== v) ||
            !['ready', 'action-required'].includes(result.state)
        )
            throw new Error('identité ou état de résultat refusé');
        const plan = json(dir, 'migrations.generated.json');
        const outcome = migrationOutcome(
            piece(dir, 'run-migrations.txt').toString(),
            0,
            plan
        );
        if (
            outcome.state !== result.state ||
            JSON.stringify(json(dir, 'migrations.remaining.json')) !==
                JSON.stringify({ migrations: outcome.pending })
        )
            throw new Error('plan restant ou état incohérent');
        const required = resultPaths(result.state, plan);
        for (const path of required)
            if (result.files?.[path] !== digest(piece(dir, path)))
                throw new Error(`pièce incohérente : ${path}`);
        return result.state;
    });
    return states.every((s) => s === 'ready') ? 'ready' : 'action-required';
}

function outcomeWorkflowErrors(workflow) {
    const errors = [];
    const jobs = workflow.jobs ?? {};
    const migrate = jobs.calculate?.steps?.find((s) => s.id === 'migrate');
    const assess = jobs.assess;
    const followup = jobs.followup;
    if (
        assess?.permissions !== undefined ||
        assess?.needs?.join() !== 'plan,calculate' ||
        assess?.steps?.find((s) => s.id === 'assess')?.run !==
            'test "$CALCULATE_RESULT" = success\nnode tools/nx-migration-plan.mjs assess "$RUNNER_TEMP/nx-assess"\n'
    )
        errors.push('agrégation readonly absente ou contournée');
    const download = assess?.steps?.find((s) =>
        s.uses?.startsWith('actions/download-artifact@')
    );
    if (
        assess?.if !== "always() && needs.plan.outputs.target != ''" ||
        assess?.env?.CALCULATE_RESULT !== '${{ needs.calculate.result }}' ||
        assess?.outputs?.state !== '${{ steps.assess.outputs.state }}' ||
        download?.with?.pattern !==
            'nx-migration-*-${{ github.run_id }}-${{ github.run_attempt }}' ||
        ['run-id', 'repository', 'merge-multiple', 'name'].some(
            (k) => download?.with?.[k] !== undefined
        )
    )
        errors.push('agrégation déliée des deux artefacts du run exact');
    const steps = jobs.calculate?.steps ?? [];
    const after = steps.slice(steps.indexOf(migrate) + 1);
    for (const step of after.filter(
        (s) =>
            !s.uses?.startsWith('actions/upload-artifact@') &&
            s.id !== 'collect'
    ))
        if (step.if !== "steps.migrate.outputs.state == 'ready'")
            errors.push(
                'suite de calcul accessible à une migration incomplète'
            );
    const collect = steps.find((s) => s.id === 'collect');
    if (
        !migrate?.run?.includes('node tools/nx-migration-plan.mjs outcome') ||
        !migrate.run.includes(
            'if test "$state" = action-required; then exit 0; fi'
        ) ||
        migrate.run.indexOf('if test "$state" = action-required;') >
            migrate.run.indexOf('rm migrations.json') ||
        collect?.if !== 'always()' ||
        collect?.env?.JOB_STATUS !== '${{ job.status }}' ||
        !collect?.run?.includes('git add --intent-to-add --all') ||
        !collect.run.includes('git diff --binary HEAD') ||
        !collect.run.includes('node tools/nx-migration-plan.mjs collect')
    )
        errors.push('état différé ou collecte des nouveaux fichiers manquant');
    return [...errors, ...nxFollowupErrors(followup, FOLLOWUP_CONDITION)];
}

export function assertMigrationComplete(raw) {
    const log = stripVTControlCharacters(raw);
    if (
        !log.includes('This workspace is up to date!') ||
        /Some migrations have additional information|Next steps for the AI agent|Working-tree state retained/.test(
            log
        )
    ) {
        throw new Error(
            'instructions Nx restantes ou fin native non reconnue ; conserver migrations.json et le journal'
        );
    }
}

export function assertMigrateHelp(help) {
    for (const flag of [
        '--skipInstall',
        '--runMigrations',
        '--include',
        '--agentic=false',
    ]) {
        if (!help.includes(flag))
            throw new Error(`option absente de l’aide cible : ${flag}`);
    }
}

export function candidateMatrix(matrix, target) {
    if (
        !semver.valid(target) ||
        semver.prerelease(target) ||
        matrix.tracks?.length !== 1
    ) {
        throw new Error(
            'cible ou matrice ambiguë ; adaptation humaine nécessaire'
        );
    }
    const candidate = structuredClone(matrix);
    const [track] = candidate.tracks;
    if (
        !['verified', 'candidate'].includes(track.status) ||
        !track.requirements?.nx
    ) {
        throw new Error('piste non qualifiable');
    }
    track.status = 'candidate';
    track.verification = null;
    track.requirements.nx = `>=${target} <${semver.major(target) + 1}`;
    return candidate;
}

async function registry(path) {
    const response = await fetch(`https://registry.npmjs.org/${path}`, {
        signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok)
        throw new Error(`registre npm : HTTP ${response.status} pour ${path}`);
    return response.json();
}

async function main(args) {
    const [command, ...rest] = args;
    if (command === 'plan' && rest.length === 2 && rest[0] === '--selectors') {
        const selectors = parseSelectors(rest[1]);
        const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
        const plan = migrationPlan(
            pkg,
            await registry('nx'),
            selectors,
            process.env.REQUESTED_TARGET ?? ''
        );
        if (plan.target) {
            for (const name of plan.packages) {
                const data = await registry(
                    `${encodeURIComponent(name)}/${plan.target}`
                );
                if (data.version !== plan.target || data.deprecated)
                    throw new Error(`cible non publiée : ${name}`);
            }
        }
        const output = `current=${plan.current}\ntarget=${plan.target}\n`;
        if (process.env.GITHUB_OUTPUT)
            appendFileSync(process.env.GITHUB_OUTPUT, output);
        console.log(JSON.stringify(plan, null, 2));
    } else if (command === 'outcome' && rest.length === 2) {
        const state = recordMigrationOutcome(
            process.cwd(),
            rest[0],
            Number(rest[1])
        );
        if (process.env.GITHUB_OUTPUT)
            appendFileSync(process.env.GITHUB_OUTPUT, `state=${state}\n`);
        console.log(state);
    } else if (command === 'collect' && rest.length === 2) {
        collectMigrationResult(rest[0], rest[1]);
    } else if (command === 'assess' && rest.length === 1) {
        const workflow = parseYaml(
            readFileSync('.github/workflows/nx-migrations.yml', 'utf8')
        );
        const state = aggregateMigrationResults(
            rest[0],
            workflow.jobs.calculate.strategy.matrix.os
        );
        if (process.env.GITHUB_OUTPUT)
            appendFileSync(process.env.GITHUB_OUTPUT, `state=${state}\n`);
        if (process.env.GITHUB_STEP_SUMMARY)
            appendFileSync(
                process.env.GITHUB_STEP_SUMMARY,
                `Migration Nx ${process.env.TARGET} : **${state}** sur Linux et macOS.\n` +
                    (state === 'action-required'
                        ? 'Instructions restantes conservées dans les deux artefacts. Aucune promotion ni publication acquise.\n'
                        : 'Deux calculs et promotions complets ; candidat Linux publiable depuis main seulement.\n')
            );
    } else if (command === 'complete' && rest.length === 1) {
        assertMigrationComplete(readFileSync(rest[0], 'utf8'));
    } else if (command === 'help' && rest.length === 1) {
        assertMigrateHelp(readFileSync(rest[0], 'utf8'));
    } else if (command === 'installed' && rest.length === 1) {
        const target = rest[0];
        const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
        const selectors = parseSelectors(process.env.NX_MIGRATION_SELECTORS);
        // Le même plan relit les versions réellement produites par Nx, puis
        // les compare à celles réellement installées par Bun.
        const plan = migrationPlan(pkg, { versions: {} }, selectors);
        if (plan.current !== target || !semver.valid(target))
            throw new Error('manifeste Nx différent de la cible');
        for (const name of plan.packages) {
            const installed = JSON.parse(
                readFileSync(`node_modules/${name}/package.json`, 'utf8')
            );
            if (installed.version !== target)
                throw new Error(`installation Nx divergente : ${name}`);
        }
    } else if (command === 'candidates' && rest.length >= 2) {
        const [target, ...paths] = rest;
        const updates = paths.map((path) => [
            path,
            candidateMatrix(JSON.parse(readFileSync(path, 'utf8')), target),
        ]);
        for (const [path, value] of updates)
            writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
    } else
        throw new Error(
            'usage : plan --selectors JSON | complete LOG | candidates VERSION MATRICE...'
        );
}

if (
    process.argv[1] &&
    import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
    main(process.argv.slice(2)).catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
    });
}
