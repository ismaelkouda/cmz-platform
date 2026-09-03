#!/usr/bin/env node
import { pathToFileURL } from 'node:url';

import { verifyPageRealization } from './generator-platform/core/page-realization.mjs';
import { loadJson, repositoryRoot } from './generator-platform/validate-ir.mjs';

function fail(message) {
    throw new Error(message);
}

export function parseArgs(argv) {
    const options = {};
    for (let index = 0; index < argv.length; index += 1) {
        const argument = argv[index];
        if (argument === '--app') options.appName = argv[++index];
        else if (argument === '--page') options.pageId = argv[++index];
        else if (argument === '--work-order')
            options.workOrderId = argv[++index];
        else fail(`Argument inconnu : ${argument}`);
    }
    if (!options.appName || !options.pageId || !options.workOrderId)
        fail('--app, --page et --work-order sont requis.');
    if (!/^[a-f0-9]{64}$/.test(options.workOrderId))
        fail('--work-order exige un identifiant SHA-256.');
    return options;
}

export async function main(argv = process.argv.slice(2)) {
    const options = parseArgs(argv);
    const evidenceSchema = await loadJson(
        new URL(
            './generator-platform/schemas/page-realization-evidence.schema.json',
            import.meta.url
        )
    );
    const report = verifyPageRealization({
        workspaceRoot: repositoryRoot,
        ...options,
        evidenceSchema,
    });
    console.log(JSON.stringify(report, null, 2));
    if (!report.ok) process.exitCode = 1;
}

if (
    process.argv[1] &&
    pathToFileURL(process.argv[1]).href === import.meta.url
) {
    main().catch((error) => {
        console.error(`❌ ${error.message}`);
        process.exitCode = 1;
    });
}
