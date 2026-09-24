import { lstat, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { canonicalizeControlFiles } from './core/canonicalize-generated.mjs';
import {
    applyGenerationChangeSet,
    createGenerationOutput,
    inspectGenerationChangeSet,
} from './core/generation-publication.mjs';
import { computeAngularPageCompositionTarget } from './page-composition-targets.mjs';
import { repositoryRoot } from './validate-ir.mjs';

function parseArguments(arguments_) {
    const options = {};
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
        if (!['--plan', '--host-bindings', '--out'].includes(argument)) {
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
    if (!options.hostBindings) throw new Error('--host-bindings is required');
    if (!options.out) throw new Error('--out is required');
    if (options.dryRun && options.applyChangeSetId) {
        throw new Error('--dry-run and --apply are mutually exclusive');
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

export async function generateAngularPageComposition({
    planPath,
    hostBindingsPath,
    outputRoot,
    artifactRoot = repositoryRoot,
    dryRun = false,
    applyChangeSetId,
}) {
    if (dryRun && applyChangeSetId) {
        throw new Error('dryRun and applyChangeSetId are mutually exclusive');
    }
    const [planInput, hostBindingsInput] = await Promise.all([
        readJsonInput(planPath, 'page execution plan'),
        readJsonInput(hostBindingsPath, 'Angular host bindings'),
    ]);
    const targets = await computeAngularPageCompositionTarget({
        plan: planInput.value,
        artifactRoot: resolve(artifactRoot),
        hostBindings: hostBindingsInput.value,
    });
    const selected = { angular: targets.angular };
    const controlFiles = await canonicalizeControlFiles({
        'angular-page-host-bindings.json': {
            artifact_id: 'angular-page-host-bindings',
            content: jsonDocument(hostBindingsInput.value),
        },
        'artifact-plan.json': {
            artifact_id: 'artifact-plan',
            content: jsonDocument(targets.artifactPlan),
        },
        'page-execution-plan.json': {
            artifact_id: 'page-execution-plan',
            content: jsonDocument(targets.plan),
        },
    });
    const absoluteOutput = resolve(outputRoot);
    const common = {
        planId: targets.plan.plan_id,
        outputRoot: absoluteOutput,
        targets: ['angular'],
        modelKind: 'page-execution-plan',
        modelSha256: targets.angular.manifest.input.sha256,
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

function usage() {
    return 'Usage:\n  bun run generate:page-composition --plan <page-execution-plan.json> --host-bindings <angular-host-bindings.json> --out <directory> [--dry-run | --apply <change_set_id>]\n';
}

async function main() {
    const options = parseArguments(process.argv.slice(2));
    if (options.help) {
        process.stdout.write(usage());
        return;
    }
    const result = await generateAngularPageComposition({
        planPath: options.plan,
        hostBindingsPath: options.hostBindings,
        outputRoot: options.out,
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
