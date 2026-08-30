import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { compileListQueryDefinition } from './core/list-query-authoring.mjs';
import {
    applyGenerationChangeSet,
    createGenerationOutput,
    inspectGenerationChangeSet,
} from './core/generation-publication.mjs';
import { canonicalizeControlFiles } from './core/canonicalize-generated.mjs';
import {
    computeListQueryLayeredTargetsForSemantic,
    computeListQueryTargetsForSemantic,
} from './render-list-query-targets.mjs';
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
        'schemas/list-query-definition.schema.json'
    ),
    evidence: resolve(moduleRoot, 'schemas/evidence.schema.json'),
    semantic: resolve(moduleRoot, 'schemas/semantic-model.schema.json'),
};

const targetValues = ['all', 'angular', 'reactjs', 'angular-layered'];

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
    if (!targetValues.includes(options.target)) {
        throw new Error(`--target must be one of: ${targetValues.join(', ')}`);
    }
    return options;
}

function jsonDocument(value) {
    return `${JSON.stringify(value, null, 2)}\n`;
}

export async function generateListQuery({
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
            `invalid list-query definition:\n${definitionErrors.join('\n')}`
        );
    }
    const sourceUri = relative(repositoryRoot, absoluteDefinition).replaceAll(
        '\\',
        '/'
    );
    const compiled = compileListQueryDefinition(definition, {
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
            `compiled list-query is invalid:\n${[
                ...evidenceErrors,
                ...semanticErrors,
            ].join('\n')}`
        );
    }

    const normalizedTarget = target === 'react' ? 'reactjs' : target;
    let artifactPlan;
    let selected;
    if (normalizedTarget === 'angular-layered') {
        const targets = await computeListQueryLayeredTargetsForSemantic(
            compiled.semantic
        );
        artifactPlan = targets.artifactPlan;
        selected = {
            'angular-domain': targets['angular-domain'],
            'angular-data': targets['angular-data'],
        };
    } else {
        const targets = await computeListQueryTargetsForSemantic(
            compiled.semantic
        );
        artifactPlan = targets.artifactPlan;
        selected =
            normalizedTarget === 'all'
                ? { angular: targets.angular, reactjs: targets.react }
                : normalizedTarget === 'angular'
                  ? { angular: targets.angular }
                  : { reactjs: targets.react };
    }
    const referenceSha256 = Object.values(selected)[0].manifest.input.sha256;
    const controlFiles = await canonicalizeControlFiles({
        'artifact-plan.json': {
            artifact_id: 'artifact-plan',
            content: jsonDocument(artifactPlan),
        },
        'evidence-model.json': {
            artifact_id: 'evidence-model',
            content: jsonDocument(compiled.evidence),
        },
        'semantic-model.json': {
            artifact_id: 'semantic-model',
            content: jsonDocument(compiled.semantic),
        },
    });
    if (dryRun) {
        return {
            feature: definition.feature.id,
            outputRoot: absoluteOutput,
            targets: Object.keys(selected),
            semanticSha256: referenceSha256,
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
            semanticSha256: referenceSha256,
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
        semanticSha256: referenceSha256,
        publication,
    };
}

function usage() {
    return `Usage:\n  bun run generate:list-query --definition <file.json> --out <directory> [--target ${targetValues.join('|')}] [--dry-run | --apply <change_set_id>]\n`;
}

async function main() {
    const options = parseArguments(process.argv.slice(2));
    if (options.help) {
        process.stdout.write(usage());
        return;
    }
    const result = await generateListQuery({
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
            `List-query ${result.feature}: ${result.publication.status === 'created' ? 'OK' : 'APPLIED'}`
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
