import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { adaptStructuredWorkflow } from './adapters/structured-workflow-adapter.mjs';
import {
    applyGenerationChangeSet,
    createGenerationOutput,
    inspectGenerationChangeSet,
} from './core/generation-publication.mjs';
import {
    validateWorkflowBehavior,
    validateWorkflowEvidence,
} from './core/workflow-action-model.mjs';
import { computeWorkflowTargets } from './workflow-targets.mjs';
import { loadJson, validateJsonSchema } from './validate-ir.mjs';

const moduleRoot = dirname(fileURLToPath(import.meta.url));
const schemas = {
    behavior: resolve(moduleRoot, 'schemas/behavior-model.schema.json'),
    definition: resolve(
        moduleRoot,
        'schemas/workflow-action-definition.schema.json'
    ),
    evidence: resolve(moduleRoot, 'schemas/workflow-evidence.schema.json'),
};

function parseArguments(arguments_) {
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
        if (!['--definition', '--out', '--target'].includes(argument)) {
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
    if (!['all', 'angular', 'react', 'reactjs'].includes(options.target)) {
        throw new Error('--target must be angular, reactjs, or all');
    }
    return options;
}

function jsonDocument(value) {
    return `${JSON.stringify(value, null, 2)}\n`;
}

export async function generateWorkflowAction({
    definitionPath,
    outputRoot,
    target = 'all',
    dryRun = false,
    applyChangeSetId,
}) {
    if (dryRun && applyChangeSetId) {
        throw new Error('dryRun and applyChangeSetId are mutually exclusive');
    }
    const absoluteOutput = resolve(outputRoot);
    const [definitionSchema, evidenceSchema, behaviorSchema] =
        await Promise.all([
            loadJson(schemas.definition),
            loadJson(schemas.evidence),
            loadJson(schemas.behavior),
        ]);
    const compiled = await adaptStructuredWorkflow(definitionPath, {
        definitionSchema,
    });
    validateWorkflowBehavior(compiled.behavior);
    validateWorkflowEvidence(compiled.evidence, compiled.behavior);
    const contractErrors = [
        ...validateJsonSchema(compiled.evidence, evidenceSchema),
        ...validateJsonSchema(compiled.behavior, behaviorSchema),
    ];
    if (contractErrors.length) {
        throw new Error(
            `compiled workflow-action is invalid:\n${contractErrors.join('\n')}`
        );
    }

    const targets = await computeWorkflowTargets(compiled.behavior);
    const normalizedTarget = target === 'react' ? 'reactjs' : target;
    const selected = {
        ...(normalizedTarget === 'all' || normalizedTarget === 'angular'
            ? { angular: targets.angular }
            : {}),
        ...(normalizedTarget === 'all' || normalizedTarget === 'reactjs'
            ? { reactjs: targets.react }
            : {}),
    };
    const controlFiles = {
        'artifact-plan.json': {
            artifact_id: 'artifact-plan',
            content: jsonDocument(targets.artifactPlan),
        },
        'behavior-model.json': {
            artifact_id: 'behavior-model',
            content: jsonDocument(compiled.behavior),
        },
        'evidence-model.json': {
            artifact_id: 'evidence-model',
            content: jsonDocument(compiled.evidence),
        },
    };
    if (dryRun) {
        return {
            feature: compiled.definition.feature.id,
            outputRoot: absoluteOutput,
            targets: Object.keys(selected),
            behaviorSha256: targets.angular.manifest.input.sha256,
            changeSet: await inspectGenerationChangeSet({
                outputRoot: absoluteOutput,
                targets: selected,
                controlFiles,
            }),
        };
    }
    if (applyChangeSetId) {
        const publication = await applyGenerationChangeSet({
            outputRoot: absoluteOutput,
            targets: selected,
            controlFiles,
            expectedChangeSetId: applyChangeSetId,
        });
        return {
            feature: compiled.definition.feature.id,
            outputRoot: absoluteOutput,
            targets: Object.keys(selected),
            behaviorSha256: targets.angular.manifest.input.sha256,
            publication,
        };
    }
    const publication = await createGenerationOutput({
        outputRoot: absoluteOutput,
        targets: selected,
        controlFiles,
    });
    return {
        feature: compiled.definition.feature.id,
        outputRoot: absoluteOutput,
        targets: Object.keys(selected),
        behaviorSha256: targets.angular.manifest.input.sha256,
        publication,
    };
}

function usage() {
    return `Usage:\n  bun run generate:workflow-action --definition <file.json> --out <directory> [--target angular|reactjs|all] [--dry-run | --apply <change_set_id>]\n`;
}

async function main() {
    const options = parseArguments(process.argv.slice(2));
    if (options.help) {
        process.stdout.write(usage());
        return;
    }
    const result = await generateWorkflowAction({
        definitionPath: options.definition,
        outputRoot: options.out,
        target: options.target,
        dryRun: options.dryRun,
        applyChangeSetId: options.applyChangeSetId,
    });
    if (result.changeSet) {
        process.stdout.write(`${JSON.stringify(result.changeSet, null, 2)}\n`);
        return;
    }
    if (result.publication) {
        console.log(
            `Workflow-action ${result.feature}: ${result.publication.status === 'created' ? 'OK' : 'APPLIED'}`
        );
        console.log(`  change set: ${result.publication.change_set_id}`);
        console.log(`  targets: ${result.targets.join(', ')}`);
        console.log(`  behavior sha256: ${result.behaviorSha256}`);
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
    await main();
}
