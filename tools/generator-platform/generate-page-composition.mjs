import { lstat, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { canonicalizeControlFiles } from './core/canonicalize-generated.mjs';
import {
    applyGenerationChangeSet,
    createGenerationOutput,
    inspectGenerationChangeSet,
} from './core/generation-publication.mjs';
import { stableStringify } from './core/generation-manifest.mjs';
import {
    computeAngularPageCompositionTarget,
    computeReactPageCompositionTarget,
} from './page-composition-targets.mjs';
import { repositoryRoot } from './validate-ir.mjs';

const targetValues = ['all', 'angular', 'reactjs'];

function parseArguments(arguments_) {
    // Angular remains the default for backward compatibility. Adding React to
    // an existing invocation must be an explicit, reviewed scope change.
    const options = { target: 'angular' };
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
            !['--plan', '--host-bindings', '--out', '--target'].includes(
                argument
            )
        ) {
            throw new Error(`unknown argument ${argument}`);
        }
        const value = arguments_[index + 1];
        if (!value || value.startsWith('--')) {
            throw new Error(`${argument} requires a value`);
        }
        options[
            argument === '--host-bindings' ? 'hostBindings' : argument.slice(2)
        ] = value;
        index += 1;
    }
    if (!options.plan) throw new Error('--plan is required');
    if (!options.out) throw new Error('--out is required');
    if (options.dryRun && options.applyChangeSetId) {
        throw new Error('--dry-run and --apply are mutually exclusive');
    }
    if (!targetValues.includes(options.target)) {
        throw new Error(`--target must be one of: ${targetValues.join(', ')}`);
    }
    if (options.target !== 'reactjs' && !options.hostBindings) {
        throw new Error(
            '--host-bindings is required when target includes angular'
        );
    }
    if (options.target === 'reactjs' && options.hostBindings) {
        throw new Error(
            '--host-bindings is not valid for the reactjs-only target'
        );
    }
    return options;
}

async function readJsonInput(path, label) {
    const absolute = resolve(path);
    const metadata = await lstat(absolute);
    if (!metadata.isFile() || metadata.isSymbolicLink()) {
        throw new Error(`${label} must be a regular non-symlink file`);
    }
    const document = await readFile(absolute);
    try {
        return { document, value: JSON.parse(document.toString('utf8')) };
    } catch (error) {
        throw new Error(`${label} is invalid JSON (${error.message})`, {
            cause: error,
        });
    }
}

function jsonDocument(value) {
    return `${JSON.stringify(value, null, 2)}\n`;
}

function normalizeTarget(target) {
    const normalized = target === 'react' ? 'reactjs' : target;
    if (!targetValues.includes(normalized)) {
        throw new Error(`target must be one of: ${targetValues.join(', ')}`);
    }
    return normalized;
}

function assertSharedPlan(angular, react) {
    if (
        angular.angular.manifest.input.sha256 !==
            react.react.manifest.input.sha256 ||
        stableStringify(angular.artifactPlan) !==
            stableStringify(react.artifactPlan)
    ) {
        throw new Error(
            'Angular and React composition targets diverge from their shared page plan'
        );
    }
}

export async function generatePageComposition({
    planPath,
    hostBindingsPath,
    outputRoot,
    artifactRoot = repositoryRoot,
    target = 'angular',
    dryRun = false,
    applyChangeSetId,
}) {
    if (dryRun && applyChangeSetId) {
        throw new Error('dryRun and applyChangeSetId are mutually exclusive');
    }
    const normalizedTarget = normalizeTarget(target);
    const includesAngular = ['all', 'angular'].includes(normalizedTarget);
    const includesReact = ['all', 'reactjs'].includes(normalizedTarget);
    if (includesAngular && !hostBindingsPath) {
        throw new Error(
            'hostBindingsPath is required when target includes angular'
        );
    }
    if (!includesAngular && hostBindingsPath) {
        throw new Error(
            'hostBindingsPath is not valid for the reactjs-only target'
        );
    }
    const [planInput, hostBindingsInput] = await Promise.all([
        readJsonInput(planPath, 'page execution plan'),
        includesAngular
            ? readJsonInput(hostBindingsPath, 'Angular host bindings')
            : undefined,
    ]);
    const absoluteArtifactRoot = resolve(artifactRoot);
    const [angularTarget, reactTarget] = await Promise.all([
        includesAngular
            ? computeAngularPageCompositionTarget({
                  plan: planInput.value,
                  artifactRoot: absoluteArtifactRoot,
                  hostBindings: hostBindingsInput.value,
              })
            : undefined,
        includesReact
            ? computeReactPageCompositionTarget({
                  plan: planInput.value,
                  artifactRoot: absoluteArtifactRoot,
              })
            : undefined,
    ]);
    if (angularTarget && reactTarget) {
        assertSharedPlan(angularTarget, reactTarget);
    }
    const source = angularTarget ?? reactTarget;
    const selected = {
        ...(angularTarget ? { angular: angularTarget.angular } : {}),
        ...(reactTarget ? { reactjs: reactTarget.react } : {}),
    };
    const controlFiles = await canonicalizeControlFiles({
        ...(hostBindingsInput
            ? {
                  'angular-page-host-bindings.json': {
                      artifact_id: 'angular-page-host-bindings',
                      content: jsonDocument(hostBindingsInput.value),
                  },
              }
            : {}),
        'artifact-plan.json': {
            artifact_id: 'artifact-plan',
            content: jsonDocument(source.artifactPlan),
        },
        'page-execution-plan.json': {
            artifact_id: 'page-execution-plan',
            content: jsonDocument(source.plan),
        },
    });
    const absoluteOutput = resolve(outputRoot);
    const common = {
        planId: source.plan.plan_id,
        outputRoot: absoluteOutput,
        targets: Object.keys(selected),
        modelKind: 'page-execution-plan',
        modelSha256: Object.values(selected)[0].manifest.input.sha256,
    };
    if (dryRun) {
        return {
            ...common,
            changeSet: await inspectGenerationChangeSet({
                outputRoot: absoluteOutput,
                targets: selected,
                controlFiles,
            }),
        };
    }
    const publication = applyChangeSetId
        ? await applyGenerationChangeSet({
              outputRoot: absoluteOutput,
              targets: selected,
              controlFiles,
              expectedChangeSetId: applyChangeSetId,
          })
        : await createGenerationOutput({
              outputRoot: absoluteOutput,
              targets: selected,
              controlFiles,
          });
    return { ...common, publication };
}

export async function generateAngularPageComposition(options) {
    if (options.target && normalizeTarget(options.target) !== 'angular') {
        throw new Error(
            'generateAngularPageComposition only accepts the angular target'
        );
    }
    return generatePageComposition({ ...options, target: 'angular' });
}

function usage() {
    return `Usage:\n  bun run generate:page-composition --plan <page-execution-plan.json> --out <directory> [--target ${targetValues.join('|')}] [--host-bindings <angular-host-bindings.json>] [--dry-run | --apply <change_set_id>]\n`;
}

async function main() {
    const options = parseArguments(process.argv.slice(2));
    if (options.help) {
        process.stdout.write(usage());
        return;
    }
    const result = await generatePageComposition({
        planPath: options.plan,
        hostBindingsPath: options.hostBindings,
        outputRoot: options.out,
        target: options.target,
        dryRun: options.dryRun,
        applyChangeSetId: options.applyChangeSetId,
    });
    process.stdout.write(
        `${JSON.stringify(result.changeSet ?? result.publication, null, 2)}\n`
    );
}

if (
    process.argv[1] &&
    import.meta.url === pathToFileURL(process.argv[1]).href
) {
    await main();
}
