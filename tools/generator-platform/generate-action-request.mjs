import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { compileActionRequestDefinition } from './core/action-request-authoring.mjs';
import {
    applyGenerationChangeSet,
    createGenerationOutput,
    inspectGenerationChangeSet,
} from './core/generation-publication.mjs';
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

export async function generateActionRequest({
    definitionPath,
    outputRoot,
    target = 'all',
    dryRun = false,
    applyChangeSetId,
}) {
    if (dryRun && applyChangeSetId) {
        throw new Error('dryRun and applyChangeSetId are mutually exclusive');
    }
    const absoluteDefinition = resolve(definitionPath);
    const absoluteOutput = resolve(outputRoot);
    const content = await readFile(absoluteDefinition);
    const definition = JSON.parse(content.toString('utf8'));
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
    const sourceUri = relative(repositoryRoot, absoluteDefinition).replaceAll(
        '\\',
        '/'
    );
    const compiled = compileActionRequestDefinition(definition, {
        sourceUri,
        sourceSha256: createHash('sha256').update(content).digest('hex'),
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
        'evidence-model.json': {
            artifact_id: 'evidence-model',
            content: jsonDocument(compiled.evidence),
        },
        'semantic-model.json': {
            artifact_id: 'semantic-model',
            content: jsonDocument(compiled.semantic),
        },
    };
    if (dryRun) {
        return {
            feature: definition.feature.id,
            outputRoot: absoluteOutput,
            targets: Object.keys(selected),
            semanticSha256: targets.angular.manifest.input.sha256,
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
            feature: definition.feature.id,
            outputRoot: absoluteOutput,
            targets: Object.keys(selected),
            semanticSha256: targets.angular.manifest.input.sha256,
            publication,
        };
    }
    const publication = await createGenerationOutput({
        outputRoot: absoluteOutput,
        targets: selected,
        controlFiles,
    });
    return {
        feature: definition.feature.id,
        outputRoot: absoluteOutput,
        targets: Object.keys(selected),
        semanticSha256: targets.angular.manifest.input.sha256,
        publication,
    };
}

function usage() {
    return `Usage:\n  bun run generate:action-request --definition <file.json> --out <directory> [--target angular|reactjs|all] [--dry-run | --apply <change_set_id>]\n`;
}

async function main() {
    const options = parseArguments(process.argv.slice(2));
    if (options.help) {
        process.stdout.write(usage());
        return;
    }
    const result = await generateActionRequest({
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
            `Action-request ${result.feature}: ${result.publication.status === 'created' ? 'OK' : 'APPLIED'}`
        );
        console.log(`  change set: ${result.publication.change_set_id}`);
        console.log(`  targets: ${result.targets.join(', ')}`);
        console.log(`  semantic sha256: ${result.semanticSha256}`);
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
