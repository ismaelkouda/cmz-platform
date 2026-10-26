#!/usr/bin/env node
// Données et contrats du workflow natif Nx. Git, Nx, Bun et les promotions
// restent des commandes visibles dans le YAML ; ce module ne les exécute pas.
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
                    'bunx nx migrate "nx@$TARGET" --include=required --agentic=false | tee '
                )
            ) ||
        !migration?.run?.includes(
            'bunx nx migrate --runMigrations=migrations.json --skipInstall --agentic=false | tee '
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
    "github.ref == 'refs/heads/main' && github.event_name != 'pull_request' && needs.calculate.result == 'success' && needs.plan.outputs.target != ''";

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
            JSON.stringify(['plan', 'calculate'])
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
        .join('\n');
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
        'gh workflow run ci.yml',
        '--ref "$MIGRATION_BRANCH"',
    ]) {
        if (!publishRuns.includes(required))
            errors.push(`garde de publication manquante : ${required}`);
    }
    if (/\bgh\s+pr\s+merge\b|--(?:force|no-verify)\b/.test(publishRuns))
        errors.push('fusion ou contournement Git interdit');
    const tokenFree = { ...workflow, jobs: { ...workflow.jobs } };
    delete tokenFree.jobs.publish;
    if (
        /\bsecrets\b|github\.token|"(?:GH_TOKEN|GITHUB_TOKEN)"/.test(
            JSON.stringify(tokenFree)
        )
    )
        errors.push('secret ou jeton explicite dans le calcul de PR');
    for (const [name, job] of Object.entries(workflow.jobs ?? {})) {
        if (name === 'publish') continue;
        if (job.permissions !== undefined && !readOnly(job.permissions))
            errors.push(`${name} : jeton en écriture ou permissions élargies`);
        for (const step of job.steps ?? []) {
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
    return errors;
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
