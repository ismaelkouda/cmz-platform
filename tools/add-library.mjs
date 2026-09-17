#!/usr/bin/env node
import { pathToFileURL } from 'node:url';

import { applyQualifiedLibrary } from './library-setup/library-application.mjs';

export function parseArgs(argv) {
    if (argv.includes('--explain')) {
        if (argv.length !== 1)
            throw new Error(
                '--explain doit être utilisé seul, sans autre argument.'
            );
        return { explain: true };
    }
    const options = { dryRun: false };
    const seen = new Set();
    for (let index = 0; index < argv.length; index += 1) {
        const argument = argv[index];
        if (seen.has(argument))
            throw new Error(`Argument dupliqué : ${argument}`);
        seen.add(argument);
        if (argument === '--app') options.app = argv[++index];
        else if (argument === '--library') options.library = argv[++index];
        else if (argument === '--dry-run') options.dryRun = true;
        else if (argument === '--expect-plan')
            options.expectPlan = argv[++index];
        else throw new Error(`Argument inconnu : ${argument}`);
    }
    if (!/^[a-z][a-z0-9-]*$/.test(options.app ?? '')) {
        throw new Error('--app exige un nom kebab-case');
    }
    if (!/^[a-z][a-z0-9-]*$/.test(options.library ?? '')) {
        throw new Error('--library exige un identifiant kebab-case');
    }
    if (
        options.expectPlan &&
        !/^library-plan:[a-f0-9]{64}$/.test(options.expectPlan)
    ) {
        throw new Error('--expect-plan invalide');
    }
    return options;
}

export async function main(argv = process.argv.slice(2)) {
    const options = parseArgs(argv);
    if (options.explain) {
        const { formatCommandExplanation } =
            await import('./command-explanations.mjs');
        process.stdout.write(formatCommandExplanation('add-library'));
        return;
    }
    const result = await applyQualifiedLibrary({
        repository: process.cwd(),
        ...options,
        onProgress: ({ step, total, id }) =>
            console.error(`[${step}/${total}] ${id}`),
    });
    console.log(JSON.stringify(result, null, 2));
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
