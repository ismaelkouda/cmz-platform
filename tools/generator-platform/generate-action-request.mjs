import { createHash } from 'node:crypto';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { compileActionRequestDefinition } from './core/action-request-authoring.mjs';
import {
    applyGenerationChangeSet,
    createGenerationOutput,
    inspectGenerationChangeSet,
} from './core/generation-publication.mjs';
import { canonicalizeControlFiles } from './core/canonicalize-generated.mjs';
import { computeActionRequestV2Targets } from './action-request-v2-targets.mjs';
import {
    planExternalActionRequest,
    publicExternalActionRequestPlan,
    publishExternalActionRequest,
} from './core/external-action-request.mjs';
import { readActionRequestDefinition } from './core/action-request-result-graph.mjs';
import { computeTargetsForSemantic } from './render-targets.mjs';
import {
    loadJson,
    repositoryRoot,
    validateEvidence,
    validateJsonSchema,
    validateSemantic,
} from './validate-ir.mjs';

const moduleRoot = dirname(fileURLToPath(import.meta.url));
const schemaPaths = {
    definition: resolve(
        moduleRoot,
        'schemas/action-request-definition.schema.json'
    ),
    evidence: resolve(moduleRoot, 'schemas/evidence.schema.json'),
    semantic: resolve(moduleRoot, 'schemas/semantic-model.schema.json'),
};

/**
 * Étape 4 (additive) du chantier « générateur en couches » (ADR-0003
 * §5d). `--target` accepte désormais, en plus des 4 valeurs historiques
 * (angular, react, reactjs, all), les 6 targets en couches produits par
 * render-targets.mjs (étape 3) — un par couche et par stack — plus
 * `all-layered` pour les publier ensemble. `all` reste strictement la
 * sortie plate historique (angular + reactjs) : ne pas y ajouter les
 * couches implicitement serait une régression silencieuse de portée,
 * mais les y ajouter automatiquement romprait la rétrocompatibilité
 * (un appelant existant utilisant --target all ne s'attend pas à voir
 * apparaître 6 nouveaux répertoires de sortie). L'utilisateur qui veut
 * les couches doit le demander explicitement.
 */
const layeredTargetValues = [
    'angular-domain',
    'angular-data',
    'angular-application',
    'react-domain',
    'react-data',
    'react-application',
];
const targetValues = [
    'all',
    'angular',
    'react',
    'reactjs',
    'all-layered',
    'angular-layered',
    ...layeredTargetValues,
];

// X2 : mode extérieur, fermé. Plan relu obligatoire ; Angular seulement ; la
// sortie et les liaisons d'hôte sont fixées par l'application du produit.
export function parseExternalArguments(arguments_) {
    const options = {};
    const keys = {
        '--target-root': 'targetRoot',
        '--app': 'appName',
        '--definition': 'definitionPath',
        '--target': 'target',
        '--apply': 'expectedPlanId',
    };
    for (let index = 0; index < arguments_.length; index += 1) {
        const argument = arguments_[index];
        if (argument === '--dry-run') {
            if (options.dryRun) throw new Error('--dry-run is repeated');
            options.dryRun = true;
            continue;
        }
        if (!Object.hasOwn(keys, argument))
            throw new Error(
                `argument not allowed with --target-root: ${argument}`
            );
        const value = arguments_[index + 1];
        if (!value || value.startsWith('--'))
            throw new Error(`${argument} requires a value`);
        if (Object.hasOwn(options, keys[argument]))
            throw new Error(`${argument} is repeated`);
        options[keys[argument]] = value;
        index += 1;
    }
    if (!options.targetRoot || !options.appName || !options.definitionPath)
        throw new Error('--target-root, --app and --definition are required');
    if ((options.target ?? 'angular') !== 'angular')
        throw new Error(
            'external action-request supports --target angular only'
        );
    if (Boolean(options.dryRun) === Boolean(options.expectedPlanId))
        throw new Error(
            'external action-request requires --dry-run or --apply <plan_id>'
        );
    return { external: true, ...options };
}

function parseArguments(arguments_) {
    if (arguments_.includes('--target-root'))
        return parseExternalArguments(arguments_);
    const options = { target: 'all' };
    for (let index = 0; index < arguments_.length; index += 1) {
        const argument = arguments_[index];
        if (argument === '--help') return { help: true };
        if (argument === '--dry-run') {
            options.dryRun = true;
            continue;
        }
        if (argument === '--apply') {
            const value = arguments_[index + 1];
            if (!value || value.startsWith('--')) {
                throw new Error('--apply requires a reviewed change_set_id');
            }
            options.applyChangeSetId = value;
            index += 1;
            continue;
        }
        if (
            ![
                '--definition',
                '--out',
                '--target',
                '--artifact-root',
                '--host-bindings',
            ].includes(argument)
        ) {
            throw new Error(`unknown argument ${argument}`);
        }
        const value = arguments_[index + 1];
        if (!value || value.startsWith('--')) {
            throw new Error(`${argument} requires a value`);
        }
        options[argument.slice(2)] = value;
        index += 1;
    }
    if (!options.definition) throw new Error('--definition is required');
    if (!options.out) throw new Error('--out is required');
    if (options.dryRun && options.applyChangeSetId) {
        throw new Error('--dry-run and --apply are mutually exclusive');
    }
    if (!targetValues.includes(options.target)) {
        throw new Error(`--target must be one of: ${targetValues.join(', ')}`);
    }
    return options;
}

function jsonDocument(value) {
    return `${JSON.stringify(value, null, 2)}\n`;
}

async function prepareV1Generation({ definition, content, target }) {
    const [definitionSchema, evidenceSchema, semanticSchema] =
        await Promise.all([
            loadJson(schemaPaths.definition),
            loadJson(schemaPaths.evidence),
            loadJson(schemaPaths.semantic),
        ]);
    const definitionErrors = validateJsonSchema(definition, definitionSchema);
    if (definitionErrors.length) {
        throw new Error(
            `invalid action-request definition:\n${definitionErrors.join('\n')}`
        );
    }
    const compiled = compileActionRequestDefinition(definition, {
        sourceUri: relative(repositoryRoot, content.path).replaceAll('\\', '/'),
        sourceSha256: createHash('sha256')
            .update(content.document)
            .digest('hex'),
    });
    const evidenceErrors = await validateEvidence(
        compiled.evidence,
        evidenceSchema,
        { verifyHashes: false }
    );
    const semanticErrors = validateSemantic(
        compiled.semantic,
        semanticSchema,
        compiled.evidence
    );
    if (evidenceErrors.length || semanticErrors.length) {
        throw new Error(
            `compiled action-request is invalid:\n${[
                ...evidenceErrors,
                ...semanticErrors,
            ].join('\n')}`
        );
    }

    const targets = await computeTargetsForSemantic(compiled.semantic);
    // Table de correspondance target CLI -> clé interne de render-targets.mjs
    // (targets.*). 'angular'/'reactjs' restent nommés différemment en
    // interne (angular/react) pour des raisons historiques — les 6 clés
    // en couches, elles, sont identiques des deux côtés (pas de
    // traduction à maintenir en double quand de nouvelles couches
    // arriveront, ex. workflow-action).
    const flatSelection =
        target === 'all'
            ? { angular: targets.angular, reactjs: targets.react }
            : target === 'angular'
              ? { angular: targets.angular }
              : target === 'reactjs'
                ? { reactjs: targets.react }
                : {};
    const layeredSelection =
        target === 'all-layered'
            ? Object.fromEntries(
                  layeredTargetValues.map((id) => [id, targets[id]])
              )
            : target === 'angular-layered'
              ? Object.fromEntries(
                    layeredTargetValues
                        .filter((id) => id.startsWith('angular-'))
                        .map((id) => [id, targets[id]])
                )
              : layeredTargetValues.includes(target)
                ? { [target]: targets[target] }
                : {};
    const selected = { ...flatSelection, ...layeredSelection };
    if (Object.keys(selected).length === 0) {
        throw new Error(`--target ${target}: no matching target found`);
    }
    // Référence de hash partagée : n'importe quel target sert de témoin
    // (tous calculés depuis le même compiled.semantic), pas seulement
    // 'angular' — utile pour --target react-domain (ou toute sélection
    // n'incluant pas la sortie plate Angular).
    const modelSha256 = Object.values(selected)[0].manifest.input.sha256;
    return {
        selected,
        controlFiles: await canonicalizeControlFiles({
            'artifact-plan.json': {
                artifact_id: 'artifact-plan',
                content: jsonDocument(targets.artifactPlan),
            },
            'evidence-model.json': {
                artifact_id: 'evidence-model',
                content: jsonDocument(compiled.evidence),
            },
            'semantic-model.json': {
                artifact_id: 'semantic-model',
                content: jsonDocument(compiled.semantic),
            },
        }),
        modelKind: 'semantic-model',
        modelSha256,
        legacyHash: { semanticSha256: modelSha256 },
    };
}

async function prepareV2Generation({
    definitionPath,
    definitionDocument,
    target,
    artifactRoot,
    hostBindings,
}) {
    if (!['all', 'angular', 'reactjs'].includes(target)) {
        throw new Error(
            `action-request v2 does not support --target ${target}; use angular, reactjs, or all`
        );
    }
    const targets = await computeActionRequestV2Targets({
        definitionPath,
        definitionDocument,
        target,
        artifactRoot,
        ...(hostBindings ? { hostBindings } : {}),
    });
    const selected =
        target === 'all'
            ? { angular: targets.angular, reactjs: targets.react }
            : target === 'angular'
              ? { angular: targets.angular }
              : { reactjs: targets.react };
    const modelSha256 = Object.values(selected)[0].manifest.input.sha256;
    return {
        selected,
        controlFiles: await canonicalizeControlFiles({
            'artifact-plan.json': {
                artifact_id: 'artifact-plan',
                content: jsonDocument(targets.artifactPlan),
            },
            'action-request-execution-model.json': {
                artifact_id: 'action-request-execution-model',
                content: jsonDocument(targets.model),
            },
        }),
        modelKind: 'action-request-execution-model',
        modelSha256,
        legacyHash: { executionModelSha256: modelSha256 },
    };
}

export async function generateActionRequest({
    definitionPath,
    outputRoot,
    target = 'all',
    dryRun = false,
    applyChangeSetId,
    artifactRoot = repositoryRoot,
    hostBindings,
    hostBindingsPath,
}) {
    if (dryRun && applyChangeSetId) {
        throw new Error('dryRun and applyChangeSetId are mutually exclusive');
    }
    const absoluteDefinition = resolve(definitionPath);
    const absoluteOutput = resolve(outputRoot);
    const { document: content, definition } =
        await readActionRequestDefinition(absoluteDefinition);
    const normalizedTarget = target === 'react' ? 'reactjs' : target;
    if (definition.schema_version === '2.1.0' && normalizedTarget !== 'angular')
        throw new Error('AR_GRAPH_REACT_UNSUPPORTED');
    if (
        definition.schema_version !== '2.1.0' &&
        (artifactRoot !== repositoryRoot || hostBindingsPath || hostBindings)
    )
        throw new Error('AR_GRAPH_ROOT_VERSION');
    if (hostBindings && hostBindingsPath)
        throw new Error('AR_GRAPH_HOST_BINDING');
    if (hostBindingsPath)
        hostBindings = (
            await readActionRequestDefinition(resolve(hostBindingsPath))
        ).definition;
    if (!['1.0.0', '2.0.0', '2.1.0'].includes(definition.schema_version)) {
        const version = definition.schema_version;
        const detail =
            typeof version === 'string' &&
            version.length <= 32 &&
            version.trim() === version &&
            /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/.test(version)
                ? ` ${version}`
                : '';
        const error = new Error(
            `unsupported action-request definition schema_version${detail}`
        );
        error.stack = error.message;
        throw error;
    }
    const prepared = ['2.0.0', '2.1.0'].includes(definition.schema_version)
        ? await prepareV2Generation({
              definitionPath: absoluteDefinition,
              definitionDocument: content,
              target: normalizedTarget,
              artifactRoot: resolve(artifactRoot),
              hostBindings,
          })
        : await prepareV1Generation({
              definition,
              content: { path: absoluteDefinition, document: content },
              target: normalizedTarget,
          });
    const commonResult = {
        feature: definition.feature.id,
        outputRoot: absoluteOutput,
        targets: Object.keys(prepared.selected),
        modelKind: prepared.modelKind,
        modelSha256: prepared.modelSha256,
        ...prepared.legacyHash,
    };
    if (dryRun) {
        return {
            ...commonResult,
            changeSet: await inspectGenerationChangeSet({
                outputRoot: absoluteOutput,
                targets: prepared.selected,
                controlFiles: prepared.controlFiles,
            }),
        };
    }
    if (applyChangeSetId) {
        const publication = await applyGenerationChangeSet({
            outputRoot: absoluteOutput,
            targets: prepared.selected,
            controlFiles: prepared.controlFiles,
            expectedChangeSetId: applyChangeSetId,
        });
        return {
            ...commonResult,
            publication,
        };
    }
    const publication = await createGenerationOutput({
        outputRoot: absoluteOutput,
        targets: prepared.selected,
        controlFiles: prepared.controlFiles,
    });
    return {
        ...commonResult,
        publication,
    };
}

function usage() {
    return `Usage:\n  bun run generate:action-request --definition <file.json> --out <directory> [--target ${targetValues.join('|')}] [--dry-run | --apply <change_set_id>]\n  Version 2.1 Angular only: [--artifact-root <root>] [--host-bindings <file.json>]\n  External product, version 2.1 Angular only:\n  bun run generate:action-request --target-root <absolute> --app <app> --definition <product-relative.json> (--dry-run | --apply <plan_id>)\n`;
}

async function mainExternal(options) {
    const common = {
        workspaceRoot: repositoryRoot,
        targetRoot: options.targetRoot,
        appName: options.appName,
        definitionPath: options.definitionPath,
    };
    if (options.dryRun) {
        const plan = await planExternalActionRequest(common);
        process.stdout.write(
            `${JSON.stringify(publicExternalActionRequestPlan(plan), null, 2)}\n`
        );
        return;
    }
    const result = await publishExternalActionRequest({
        ...common,
        expectedPlanId: options.expectedPlanId,
    });
    process.stdout.write(
        `${JSON.stringify(
            {
                schema_version: '1.0.0',
                plan_id: result.plan_id,
                app_name: options.appName,
                action_id: result.action_id,
                status: result.replayed ? 'already-published' : 'published',
                recovered: result.recovered,
            },
            null,
            2
        )}\n`
    );
}

async function main() {
    const options = parseArguments(process.argv.slice(2));
    if (options.help) {
        process.stdout.write(usage());
        return;
    }
    if (options.external) return mainExternal(options);
    const result = await generateActionRequest({
        definitionPath: options.definition,
        outputRoot: options.out,
        target: options.target,
        dryRun: options.dryRun,
        applyChangeSetId: options.applyChangeSetId,
        artifactRoot: options['artifact-root']
            ? resolve(options['artifact-root'])
            : repositoryRoot,
        hostBindingsPath: options['host-bindings'],
    });
    if (result.changeSet) {
        process.stdout.write(`${JSON.stringify(result.changeSet, null, 2)}\n`);
        return;
    }
    if (result.publication) {
        console.log(
            `Action-request ${result.feature}: ${result.publication.status === 'created' ? 'OK' : 'APPLIED'}`
        );
        console.log(`  change set: ${result.publication.change_set_id}`);
        console.log(`  targets: ${result.targets.join(', ')}`);
        console.log(`  ${result.modelKind} sha256: ${result.modelSha256}`);
        console.log(`  output: ${result.outputRoot}`);
        if (result.publication.recovery_pending) {
            console.warn(
                `  recovery pending: ${result.publication.recovery_root}`
            );
        }
        return;
    }
}

if (
    process.argv[1] &&
    import.meta.url === pathToFileURL(process.argv[1]).href
) {
    try {
        await main();
    } catch (error) {
        if (!process.argv.includes('--target-root')) throw error;
        // Mode extérieur : message fermé, sans pile ni chemin de l'atelier.
        const known =
            error.message.startsWith('external application:') ||
            error.message.startsWith('external action-request') ||
            error.message.startsWith('argument not allowed') ||
            error.message.startsWith('--') ||
            /^AR_GRAPH_[A-Z_]+$/.test(error.message);
        const locked = error.message.startsWith('another generation owns');
        console.error(
            `❌ ${known ? error.message : locked ? 'Une autre commande tient le verrou de cette application ; relancer quand elle est terminée.' : 'Génération extérieure refusée ; inspecter les entrées localement.'}`
        );
        process.exitCode = 1;
    }
}
