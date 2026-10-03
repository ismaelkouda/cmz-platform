#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { collectVisualEvaluation } from './core/visual-evaluation.mjs';
import { repositoryRoot } from './validate-ir.mjs';

function argument(name, fallback) {
    const index = process.argv.indexOf(name);
    if (index === -1) return fallback;
    const value = process.argv[index + 1];
    if (!value || value.startsWith('--'))
        throw new Error(`${name} requires a value`);
    return value;
}

const planPath = argument(
    '--plan',
    'designs/users-management-proof.visual-evaluation.json'
);
const resultsRoot = resolve(
    repositoryRoot,
    argument('--results-root', 'test-results/users-management-proof')
);
const outputName = argument('--output', 'visual-evaluation.bundle.json');
if (!/^[a-z0-9]+(?:[.-][a-z0-9]+)*\.json$/.test(outputName))
    throw new Error('--output must be a simple JSON filename');
const outputPath = resolve(resultsRoot, outputName);
const schemas = await Promise.all(
    [
        'visual-evaluation-plan',
        'presentation-evidence',
        'visual-evaluation-bundle',
    ].map(async (name) =>
        JSON.parse(
            await readFile(
                new URL(`./schemas/${name}.schema.json`, import.meta.url),
                'utf8'
            )
        )
    )
);

const bundle = await collectVisualEvaluation({
    workspaceRoot: repositoryRoot,
    planPath,
    planSchema: schemas[0],
    presentationSchema: schemas[1],
    bundleSchema: schemas[2],
    resultsRoot,
});
await writeFile(outputPath, `${JSON.stringify(bundle, null, 2)}\n`);
process.stdout.write(`${outputPath}\n`);
