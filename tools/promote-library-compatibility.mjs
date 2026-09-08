#!/usr/bin/env node
import { pathToFileURL } from 'node:url';

import { promoteCompatibilityTrack } from './library-setup/compatibility-promotion-runner.mjs';

export function parseArgs(argv) {
    const options = {};
    const seen = new Set();
    for (let index = 0; index < argv.length; index += 1) {
        const argument = argv[index];
        if (seen.has(argument))
            throw new Error(`Argument dupliqué : ${argument}`);
        seen.add(argument);
        if (argument === '--app') options.app = argv[++index];
        else if (argument === '--library') options.library = argv[++index];
        else throw new Error(`Argument inconnu : ${argument}`);
    }
    for (const key of ['app', 'library']) {
        if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(options[key] ?? '')) {
            throw new Error(`--${key} exige un identifiant kebab-case`);
        }
    }
    return options;
}

export async function main(argv = process.argv.slice(2)) {
    const options = parseArgs(argv);
    const result = await promoteCompatibilityTrack({
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
