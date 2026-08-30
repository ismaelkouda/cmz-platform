#!/usr/bin/env node
/**
 * retire-module.mjs
 *
 * Retire un module applicatif du monorepo — apps/libs, câblage de config,
 * et preuve automatique d'exhaustivité — sans audit manuel humain.
 *
 * Ce script automatise aussi les configurations : analyse AST TypeScript pour
 * JavaScript/JSON, mutations textuelles ciblées, puis rescan exact et rollback
 * si la moindre référence subsiste.
 *
 * Étapes automatiques :
 *   1. Construit un plan déterministe depuis les métadonnées Nx : seuls les
 *      project.json portant le tag EXACT scope:<module> sont sélectionnés.
 *      Les préfixes de dossiers sont interdits ; un conteneur apps/* ou
 *      libs/* mêlant plusieurs scopes fait refuser le retrait.
 *   2. Vérifie la fermeture transitive : aucun package HORS de ce scope
 *      ne doit importer un alias @cmz/<module>-* (sinon retrait refusé —
 *      ce serait casser un consommateur réel, pas un POC isolé).
 *   3. Déplace les fichiers sous `.cmz/retire-module-transactions/`, espace
 *      explicitement ignoré par Git, avec journal atomique et hashes SHA-256.
 *   4. Relance check-project-names.mjs et check-declared-deps.mjs pour
 *      confirmer que le graphe reste cohérent après suppression physique.
 *
 *   5. Sauvegarde puis nettoie structurellement les cinq configurations,
 *      bun.lock inclus dans la transaction.
 *      Un rescan exact et les checks de graphe doivent passer, sinon racines
 *      et configurations sont restaurées.
 *
 * Étape finale (obligatoire, non contournable) :
 *   6. Appelle check-no-orphan-references.mjs --module <nom> et affiche
 *      son verdict — la preuve d'exhaustivité n'est jamais l'avis de ce
 *      script sur lui-même, c'est un outil indépendant.
 *
 * L'invocation nominale enchaîne retrait, configuration, Bun, gates Nx et
 * tombstone. --finalize ne sert qu'à reprendre une preuve finale interrompue.
 *
 * Usage :
 *   node tools/retire-module.mjs --module <nom> [--dry-run]
 *     [--historical-reference <fichier>::<raison>]
 *     [--active-reference <fichier>::<raison>]
 *   node tools/retire-module.mjs --finalize --module <nom>
 *     [--historical-reference <fichier>::<raison>]
 *     [--active-reference <fichier>::<raison>]
 *   node tools/retire-module.mjs --resume --module <nom>
 *   node tools/retire-module.mjs --abort --module <nom>
 *
 * --dry-run : (mode retrait seulement) n'écrit rien, affiche le plan.
 * --resume : reprend une transaction interrompue après validation du journal.
 * --abort : restaure les racines et configurations vérifiées.
 *
 * Exit 1 si la fermeture transitive échoue (étape 2), si bun install
 * échoue alors qu'il était requis, ou si check-no-orphan-references
 * échoue en --finalize.
 */

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

import {
    TRANSACTION_RELATIVE_ROOT,
    assertPlainDirectory,
    currentGitIdentity,
    inspectTransactionRoot,
    moduleTransactionDir,
    moveTransactionRoots,
    readTransactionState,
    removeModuleTransaction,
    restoreTransactionRoots,
    treeSha256,
    transactionRootPairs,
    validateTransactionState,
    withTransactionLock,
    writeTransactionState,
} from './retire-module-transaction.mjs';
import {
    applyConfigCleanup,
    captureConfigOriginals,
    captureOptionalRegularFile,
    configOriginalsSha256,
    optionalOriginalSha256,
    restoreConfigOriginals,
    restoreOptionalRegularFile,
} from './retire-module-config.mjs';
import {
    findNxGraphConsumers,
    runPostRemovalNxGate,
} from './retire-module-nx.mjs';
import { createRetirementPlan } from './retire-module-plan.mjs';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const CONFIG_FILES_TO_SCAN = [
    'eslint.config.mjs',
    'tsconfig.base.json',
    'knip.json',
    'package.json',
];
function fail(message) {
    throw new Error(message);
}

function parseArgs(argv) {
    const options = {
        historicalReferences: [],
        activeReferences: [],
        abort: false,
        dryRun: false,
        finalize: false,
        resume: false,
    };
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--module') options.module = argv[++i];
        else if (arg === '--historical-reference')
            options.historicalReferences.push(argv[++i]);
        else if (arg === '--active-reference')
            options.activeReferences.push(argv[++i]);
        else if (arg === '--allow' || arg === '--allow-active-fixture')
            fail(
                `${arg} est interdit : utilise chemin::occurrence-sha256::raison.`
            );
        else if (arg === '--dry-run') options.dryRun = true;
        else if (arg === '--finalize') options.finalize = true;
        else if (arg === '--resume') options.resume = true;
        else if (arg === '--abort') options.abort = true;
        else fail(`Argument inconnu : ${arg}`);
    }
    if (!options.module) fail('--module <nom> est requis (ex: sample-module).');
    if (!/^[a-z][a-z0-9-]*$/.test(options.module))
        fail(
            '--module doit être un identifiant kebab-case (ex: content-management).'
        );
    const commandModes = [
        options.finalize,
        options.resume,
        options.abort,
    ].filter(Boolean).length;
    if (commandModes > 1)
        fail('--finalize, --resume et --abort sont mutuellement exclusifs.');
    if (commandModes > 0 && options.dryRun)
        fail('--dry-run est réservé à la commande de retrait initiale.');
    for (const specification of [
        ...options.historicalReferences,
        ...options.activeReferences,
    ]) {
        const parts = specification?.split('::') ?? [];
        if (
            parts.length !== 3 ||
            !parts[0] ||
            !/^[a-f0-9]{64}$/.test(parts[1] || '') ||
            !parts[2].trim()
        )
            fail(
                'Une classification attend ' +
                    'chemin::occurrence-sha256::raison explicite.'
            );
        const path = parts[0];
        const absolute = resolve(ROOT, path);
        if (absolute !== ROOT && !absolute.startsWith(`${ROOT}${sep}`))
            fail(`Chemin d’exemption hors workspace refusé : ${path}`);
    }
    return options;
}

/** Hash du contenu ACTUEL (working tree) de package.json. */
function hashPackageJson() {
    const path = join(ROOT, 'package.json');
    if (!existsSync(path)) return null;
    return createHash('sha256').update(readFileSync(path)).digest('hex');
}

/** État transactionnel conservé entre retrait et finalisation. */
function stateDir(moduleName) {
    return moduleTransactionDir(ROOT, moduleName);
}

function tombstonePath(moduleName) {
    return `docs/architecture/removed-modules/${moduleName}.json`;
}

function readState(moduleName) {
    return readTransactionState(ROOT, moduleName);
}

function writeState(moduleName, state) {
    writeTransactionState(ROOT, moduleName, state);
}

/**
 * Régénère bun.lock puis prouve immédiatement sa synchronisation avec
 * package.json. Une finalisation ne peut pas contourner cette preuve.
 */
function runBunInstall() {
    try {
        console.log(
            `\nRégénération obligatoire de bun.lock après changement du graphe des workspaces...`
        );
        const out = execFileSync('bun', ['install'], {
            cwd: ROOT,
            encoding: 'utf8',
        });
        console.log(out.trim());
        console.log(`✅  bun.lock régénéré.`);

        console.log(`Vérification obligatoire de bun.lock en mode frozen...`);
        const frozenOut = execFileSync(
            'bun',
            ['install', '--frozen-lockfile'],
            {
                cwd: ROOT,
                encoding: 'utf8',
            }
        );
        console.log(frozenOut.trim());
        console.log(`✅  bun.lock synchronisé et vérifié en mode frozen.`);
        return true;
    } catch (error) {
        const message =
            error.code === 'ENOENT'
                ? `bun est introuvable dans cet environnement.`
                : `bun install a échoué :\n${(error.stdout || '') + (error.stderr || '')}`;
        console.error(
            `\n⚠️  ${message}\n` +
                `La synchronisation package.json ↔ bun.lock n'est PAS prouvée. ` +
                `La finalisation est refusée jusqu'à ce que bun install puis ` +
                `bun install --frozen-lockfile réussissent.`
        );
        return false;
    }
}

function gitWorkspaceFiles() {
    let output;
    try {
        output = execFileSync(
            'git',
            [
                'ls-files',
                '-z',
                '--cached',
                '--others',
                '--exclude-standard',
                '--',
                'apps',
                'libs',
            ],
            { cwd: ROOT, encoding: 'utf8' }
        );
    } catch {
        fail('Inventaire Git apps/libs obligatoire et illisible.');
    }
    return output
        .split('\0')
        .filter(Boolean)
        .sort()
        .map((path) => {
            const absolute = join(ROOT, path);
            const metadata = lstatSync(absolute);
            if (!metadata.isFile() || metadata.isSymbolicLink())
                fail(`Entrée Git apps/libs non régulière : ${path}.`);
            return { absolute, path };
        });
}

/**
 * Vérifie qu'aucun package HORS scope n'importe un alias appartenant au
 * module retiré — même heuristique que check-declared-deps.mjs (grep sur
 * les imports source, pas le graphe Nx lui-même, pour rester indépendant
 * de nx dans un environnement où nx n'est pas toujours disponible).
 */
function findExternalConsumers(scope) {
    const aliases = scope.projects
        .map((project) => project.name)
        .filter((name) => name.startsWith('@cmz/'));
    if (aliases.length === 0) return [];
    const aliasPattern = new RegExp(
        `(?:${aliases
            .map((alias) => alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
            .join('|')})(?![a-zA-Z0-9_-])`
    );
    const selectedRoots = scope.roots.map((root) => `${root}/`);
    const externalConsumers = [];
    for (const file of gitWorkspaceFiles()) {
        if (selectedRoots.some((root) => file.path.startsWith(root))) continue;
        if (!/\.(ts|tsx|mts|cts|js|jsx|mjs|cjs|json|jsonc)$/.test(file.path))
            continue;
        const content = readFileSync(file.absolute, 'utf8');
        if (aliasPattern.test(content)) {
            externalConsumers.push({
                consumer: file.path,
                project: 'inventaire Git apps/libs',
            });
        }
    }
    return externalConsumers;
}

/** Inventorie les références de config avant/après mutation structurée. */
function scanConfigReferences(moduleName, scope) {
    const nameEscaped = moduleName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const aliases = scope.projects.map((project) =>
        project.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    );
    const roots = scope.roots.map((root) =>
        root.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    );
    const patterns = [
        new RegExp(`scope:${nameEscaped}(?![a-zA-Z0-9_-])`),
        new RegExp(`(?:${aliases.join('|')})(?![a-zA-Z0-9_-])`),
        new RegExp(`(?:${roots.join('|')})(?![a-zA-Z0-9_-])`),
    ];
    const report = [];
    for (const relPath of CONFIG_FILES_TO_SCAN) {
        const fullPath = join(ROOT, relPath);
        if (!existsSync(fullPath)) continue;
        const lines = readFileSync(fullPath, 'utf8').split('\n');
        lines.forEach((line, idx) => {
            if (patterns.some((re) => re.test(line))) {
                report.push({
                    file: relPath,
                    line: idx + 1,
                    text: line.trim(),
                });
            }
        });
    }
    return report;
}

function runNode(scriptRelPath, args = []) {
    try {
        const out = execFileSync(
            process.execPath,
            [join(ROOT, scriptRelPath), ...args],
            { cwd: ROOT, encoding: 'utf8' }
        );
        return { ok: true, output: out };
    } catch (error) {
        return {
            ok: false,
            output: (error.stdout || '') + (error.stderr || ''),
        };
    }
}

function verifyPostRemovalGraph() {
    console.log(
        `\nVérification post-suppression (check-project-names, check-declared-deps)...`
    );
    const namesCheck = runNode('tools/check-project-names.mjs');
    console.log(namesCheck.output.trim());
    const depsCheck = runNode('tools/check-declared-deps.mjs');
    console.log(depsCheck.output.trim());
    return namesCheck.ok && depsCheck.ok;
}

function rollbackRootsOrPreserve(moduleName, state, reason) {
    try {
        restoreConfigOriginals(
            ROOT,
            state.configOriginals,
            state.configOriginalSha256
        );
        restoreOptionalRegularFile(
            ROOT,
            tombstonePath(moduleName),
            state.tombstoneOriginal,
            state.tombstoneOriginalSha256
        );
        restoreTransactionRoots(ROOT, moduleName, state, (root) =>
            console.log(`  - restauré : ${root}`)
        );
        removeModuleTransaction(ROOT, moduleName);
    } catch (rollbackError) {
        fail(
            `${reason} La restauration automatique a aussi échoué : ${rollbackError.message}. ` +
                `Transaction préservée sous ${relative(ROOT, stateDir(moduleName))}.`
        );
    }
    fail(`${reason} Les racines ont été restaurées automatiquement.`);
}

function assertBackupsReady(moduleName, state) {
    for (const pair of transactionRootPairs(ROOT, moduleName, state)) {
        const layout = inspectTransactionRoot(pair);
        if (!layout.backupExists) {
            fail(
                `${pair.relativeRoot} est présent dans le workspace ; ` +
                    `la transaction n'est pas prête à être finalisée.`
            );
        }
    }
}

/** Commande 1 : résout, vérifie, supprime, rapporte. */
function runRetire(options) {
    const {
        module: moduleName,
        dryRun,
        historicalReferences,
        activeReferences,
    } = options;
    console.log(
        `\n== retire-module: ${moduleName} ${dryRun ? '(dry-run)' : ''} ==\n`
    );

    if (existsSync(stateDir(moduleName))) {
        fail(
            `Un retrait de "${moduleName}" est déjà en cours ou a été interrompu. ` +
                `Finalise-le avec --finalize, ou restaure les fichiers sauvegardés sous ` +
                `${relative(ROOT, stateDir(moduleName))}.`
        );
    }
    if (existsSync(join(ROOT, '.cmz/create-module-transactions', moduleName)))
        fail(
            `Une création de "${moduleName}" est encore en cours. ` +
                `Utilise create-module --resume ou --abort avant tout retrait.`
        );

    // Étape 1 — résolution du scope.
    const { plan: scope, sha256: planSha256 } = createRetirementPlan(
        ROOT,
        moduleName
    );
    console.log(`Plan Nx exact ${planSha256} :`);
    console.log(`  tag : ${scope.scopeTag}`);
    console.log(`  projets (${scope.projects.length}) :`);
    for (const project of scope.projects) {
        console.log(`    - ${project.name} (${project.root})`);
    }
    console.log(`  racines destructives (${scope.roots.length}) :`);
    for (const relativeRoot of scope.roots) {
        const root = join(ROOT, relativeRoot);
        assertPlainDirectory(root, relativeRoot);
        console.log(`    - ${relativeRoot}`);
    }

    // Étape 2 — fermeture transitive.
    const nxConsumers = findNxGraphConsumers(ROOT, scope);
    const sourceConsumers = findExternalConsumers(scope);
    if (nxConsumers.length > 0 || sourceConsumers.length > 0) {
        console.error(
            `\n❌  fermeture refusée : ${nxConsumers.length} arête(s) Nx et ${sourceConsumers.length} référence(s) source entrante(s) :`
        );
        for (const c of nxConsumers)
            console.error(
                `  graphe Nx : ${c.consumer} -> ${c.target} (${c.type})`
            );
        for (const c of sourceConsumers) {
            console.error(
                `  ${c.consumer} (dans ${c.project}) importe un alias de ce module`
            );
        }
        fail(
            `Retrait refusé : ce module a des consommateurs réels en dehors de son propre scope. ` +
                `Ce n'est pas un module isolé (POC/démo) — le retirer casserait du code fonctionnel. ` +
                `Traite d'abord ces dépendances.`
        );
    }
    console.log(
        `\n✅  Fermeture transitive vérifiée : aucun consommateur externe au scope.`
    );

    // Inventaire pré-mutation affiché par le dry-run.
    const configReport = scanConfigReferences(moduleName, scope);

    if (dryRun) {
        console.log(`\n-- dry-run : rien n'a été écrit --`);
        printConfigReport(configReport);
        process.exit(0);
    }

    // Étape 3 — déplacement transactionnel. Le workspace voit les
    // suppressions, mais une vérification post-retrait qui échoue peut encore
    // restaurer les fichiers, y compris les fichiers non suivis par git.
    const packageJsonHashBefore = hashPackageJson();
    const roots = scope.roots;
    const git = currentGitIdentity(ROOT);
    const configOriginals = captureConfigOriginals(ROOT);
    const tombstoneOriginal = captureOptionalRegularFile(
        ROOT,
        tombstonePath(moduleName)
    );
    const state = {
        version: 7,
        module: moduleName,
        status: 'moving',
        startedAt: new Date().toISOString(),
        workspaceRoot: resolve(ROOT),
        gitHead: git.head,
        gitBranch: git.branch,
        packageJsonHashBefore,
        plan: scope,
        planSha256,
        roots,
        rootSha256: Object.fromEntries(
            roots.map((root) => [root, treeSha256(join(ROOT, root))])
        ),
        movedRoots: [],
        historicalReferences,
        activeReferences,
        configReport,
        configOriginals,
        configOriginalSha256: configOriginalsSha256(configOriginals),
        tombstoneOriginal,
        tombstoneOriginalSha256: optionalOriginalSha256(tombstoneOriginal),
    };
    writeState(moduleName, state);
    console.log(`\nMise à l'écart de ${roots.length} racine(s)...`);
    let movedState;
    try {
        movedState = moveTransactionRoots(ROOT, moduleName, state, (root) =>
            console.log(`  - retiré du workspace : ${root}`)
        );
    } catch (error) {
        rollbackRootsOrPreserve(
            moduleName,
            readState(moduleName) || state,
            `Déplacement interrompu : ${error.message}.`
        );
    }

    try {
        const changedConfigs = applyConfigCleanup(ROOT, moduleName, scope);
        const remainingConfig = scanConfigReferences(moduleName, scope);
        if (remainingConfig.length > 0)
            fail(
                `Nettoyage de configuration incomplet : ${JSON.stringify(remainingConfig)}`
            );
        console.log(
            `\nConfiguration nettoyée automatiquement : ${changedConfigs.join(', ') || 'aucun changement'}.`
        );
    } catch (error) {
        rollbackRootsOrPreserve(
            moduleName,
            movedState,
            `Nettoyage structuré des configurations échoué : ${error.message}.`
        );
    }

    // Étape 4 — re-vérification du graphe.
    if (!verifyPostRemovalGraph()) {
        rollbackRootsOrPreserve(
            moduleName,
            movedState,
            `check-project-names ou check-declared-deps échoue après suppression.`
        );
    }

    writeState(moduleName, {
        ...movedState,
        status: 'awaiting-finalize',
    });
    runFinalize(options);
}

function runResume(options) {
    const moduleName = options.module;
    console.log(`\n== retire-module --resume: ${moduleName} ==\n`);
    const rawState = readState(moduleName);
    if (!rawState) {
        fail(`Aucune transaction à reprendre pour "${moduleName}".`);
    }
    const state = validateTransactionState(ROOT, moduleName, rawState);
    if (state.status === 'awaiting-finalize') {
        assertBackupsReady(moduleName, state);
        console.log(`Le déplacement est déjà complet et vérifié.`);
        printConfigReport(state.configReport);
        console.log(
            `\nFinalise avec : node tools/retire-module.mjs --finalize --module ${moduleName}`
        );
        return;
    }

    console.log(`Reprise du déplacement transactionnel...`);
    let movedState;
    try {
        movedState = moveTransactionRoots(ROOT, moduleName, state, (root) =>
            console.log(`  - retiré du workspace : ${root}`)
        );
    } catch (error) {
        rollbackRootsOrPreserve(
            moduleName,
            readState(moduleName) || state,
            `Reprise interrompue : ${error.message}.`
        );
    }
    try {
        applyConfigCleanup(ROOT, moduleName, movedState.plan);
        const remainingConfig = scanConfigReferences(
            moduleName,
            movedState.plan
        );
        if (remainingConfig.length > 0)
            fail(
                `Nettoyage de configuration incomplet : ${JSON.stringify(remainingConfig)}`
            );
    } catch (error) {
        rollbackRootsOrPreserve(
            moduleName,
            movedState,
            `Nettoyage structuré des configurations pendant la reprise échoué : ${error.message}.`
        );
    }
    if (!verifyPostRemovalGraph()) {
        rollbackRootsOrPreserve(
            moduleName,
            movedState,
            `Les garde-fous post-suppression échouent pendant la reprise.`
        );
    }
    const completedState = {
        ...movedState,
        status: 'awaiting-finalize',
    };
    writeState(moduleName, completedState);
    console.log(
        `\n✅  Reprise terminée. Finalise avec :\n` +
            `  node tools/retire-module.mjs --finalize --module ${moduleName}`
    );
}

function runAbort(options) {
    const moduleName = options.module;
    console.log(`\n== retire-module --abort: ${moduleName} ==\n`);
    const rawState = readState(moduleName);
    if (!rawState) {
        fail(`Aucune transaction à abandonner pour "${moduleName}".`);
    }
    const state = validateTransactionState(ROOT, moduleName, rawState, {
        allowGitDrift: true,
    });
    restoreConfigOriginals(
        ROOT,
        state.configOriginals,
        state.configOriginalSha256
    );
    restoreOptionalRegularFile(
        ROOT,
        tombstonePath(moduleName),
        state.tombstoneOriginal,
        state.tombstoneOriginalSha256
    );
    restoreTransactionRoots(ROOT, moduleName, state, (root) =>
        console.log(`  - restauré : ${root}`)
    );
    removeModuleTransaction(ROOT, moduleName);
    console.log(
        `\n✅  Racines et configurations restaurées ; transaction supprimée.`
    );
}

/**
 * Commande 2 : à lancer après avoir traité le rapport de config à la
 * main. Ne touche plus au filesystem des apps/libs (déjà supprimées par
 * runRetire) — régénère bun.lock si besoin, puis appelle
 * check-no-orphan-references comme preuve finale indépendante.
 */
function runFinalize(options) {
    const {
        module: moduleName,
        historicalReferences: cliHistoricalReferences,
        activeReferences: cliActiveReferences,
    } = options;
    console.log(`\n== retire-module --finalize: ${moduleName} ==\n`);

    const rawState = readState(moduleName);
    if (!rawState) {
        fail(
            `Aucun retrait en cours pour "${moduleName}" sous ${TRANSACTION_RELATIVE_ROOT}. ` +
                `Lance d'abord la commande de retrait.`
        );
    }
    const state = validateTransactionState(ROOT, moduleName, rawState);
    if (state.status !== 'awaiting-finalize') {
        fail(
            `Le déplacement de "${moduleName}" est incomplet ; lance d'abord --resume ou --abort.`
        );
    }
    assertBackupsReady(moduleName, state);

    const historicalReferences = [
        ...new Set([
            ...(state.historicalReferences || []),
            ...cliHistoricalReferences,
        ]),
    ];
    const activeReferences = [
        ...new Set([...(state.activeReferences || []), ...cliActiveReferences]),
    ];
    writeState(moduleName, {
        ...state,
        historicalReferences,
        activeReferences,
    });
    const installed = runBunInstall();
    if (!installed) {
        fail(
            `Preuve Bun obligatoire indisponible/échouée — corrige puis relance la finalisation.`
        );
    }
    console.log('\n== Gate Nx post-retrait (graphe complet) ==\n');
    const nxGates = runPostRemovalNxGate(ROOT);
    console.log(nxGates.output.trim());
    if (!nxGates.ok)
        fail('Le graphe Nx post-retrait est invalide ; transaction conservée.');

    // Preuve finale, obligatoire, par un outil indépendant.
    console.log(`\n== Vérification finale (check-no-orphan-references) ==\n`);
    const tombstone = tombstonePath(moduleName);
    const tombstoneExists = existsSync(join(ROOT, tombstone));
    const orphanArgs = [
        '--module',
        moduleName,
        tombstoneExists ? '--tombstone' : '--create-tombstone',
        tombstone,
    ];
    if (!tombstoneExists) {
        for (const reference of historicalReferences)
            orphanArgs.push('--historical-reference', reference);
        for (const reference of activeReferences)
            orphanArgs.push('--active-reference', reference);
    }
    const orphanCheck = runNode(
        'tools/check-no-orphan-references.mjs',
        orphanArgs
    );
    console.log(orphanCheck.output.trim());
    if (!orphanCheck.ok) {
        console.error(
            `\n⚠️  Des références orphelines subsistent. Traite-les, puis relance : ` +
                `node tools/check-no-orphan-references.mjs --module ${moduleName} ` +
                `(avec des classifications chemin::occurrence-sha256::raison), ` +
                `ou directement node tools/retire-module.mjs --finalize --module ${moduleName}.`
        );
        fail(`Preuve d'absence de références orphelines échouée.`);
    }

    removeModuleTransaction(ROOT, moduleName);
    console.log(
        `\n✅  Retrait finalisé. La sauvegarde transactionnelle a été supprimée ; ` +
            `les fichiers suivis restent récupérables via git.`
    );
}

function main() {
    const options = parseArgs(process.argv.slice(2));
    if (options.dryRun) {
        runRetire(options);
        return;
    }
    const command = options.finalize
        ? 'finalize'
        : options.resume
          ? 'resume'
          : options.abort
            ? 'abort'
            : 'retire';
    withTransactionLock(ROOT, { module: options.module, command }, () => {
        if (options.finalize) runFinalize(options);
        else if (options.resume) runResume(options);
        else if (options.abort) runAbort(options);
        else runRetire(options);
    });
}

function printConfigReport(report) {
    if (report.length === 0) {
        console.log(
            `\n✅  Aucune référence trouvée dans les fichiers de config surveillés.`
        );
        return;
    }
    console.log(
        `\nℹ️  ${report.length} référence(s) de configuration que le retrait appliquera automatiquement :\n`
    );
    let currentFile = null;
    for (const entry of report) {
        if (entry.file !== currentFile) {
            currentFile = entry.file;
            console.log(`\n  ${entry.file} :`);
        }
        console.log(`    L${entry.line}: ${entry.text}`);
    }
}

try {
    main();
} catch (error) {
    console.error(`\n✖ ${error.message}\n`);
    process.exitCode = 1;
}
