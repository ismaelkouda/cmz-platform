#!/usr/bin/env node
import { pathToFileURL } from 'node:url';

import { scaffoldTailwind } from './scaffold-tailwind-core.mjs';

export function parseArguments(argv) {
    const options = {};
    const seen = new Set();
    for (let index = 0; index < argv.length; index += 1) {
        const argument = argv[index];
        if (seen.has(argument)) {
            throw new Error(`Argument dupliqué : ${argument}`);
        }
        seen.add(argument);
        if (argument === '--app') options.app = argv[++index];
        else if (argument === '--reference') options.platform = argv[++index];
        else if (argument === '--tailwind-version') {
            options.tailwindVersion = argv[++index];
        } else {
            throw new Error(`Argument inconnu : ${argument}`);
        }
    }
    return options;
}

export function main(argv = process.argv.slice(2)) {
    const options = parseArguments(argv);
    const changed = scaffoldTailwind({
        repository: process.cwd(),
        ...options,
    });
    for (const path of changed) console.log(`  WRITE ${path}`);
    console.log(
        `\n✔ Tailwind câblé pour ${options.app} (${options.platform}). Vérification runtime obligatoire avant publication.\n`
    );
}

if (
    process.argv[1] &&
    pathToFileURL(process.argv[1]).href === import.meta.url
) {
    try {
        main();
    } catch (error) {
        console.error(`\n✖ ${error.message}\n`);
        process.exitCode = 1;
    }
}
