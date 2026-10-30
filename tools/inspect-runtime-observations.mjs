#!/usr/bin/env node
import { pathToFileURL } from 'node:url';

import {
    inspectRuntimeObservations,
    observationDiagnostic,
} from './generator-platform/core/runtime-observation-evidence.mjs';
import { stableStringify } from './generator-platform/core/generation-manifest.mjs';

export function parseArgs(argv) {
    const names = new Map([
        ['--target-root', 'targetRoot'],
        ['--selection', 'selectionPath'],
    ]);
    const options = {};
    if (!Array.isArray(argv) || argv.length !== 4) return null;
    for (let index = 0; index < argv.length; index += 2) {
        const name = names.get(argv[index]);
        const value = argv[index + 1];
        if (
            !name ||
            Object.hasOwn(options, name) ||
            typeof value !== 'string' ||
            !value ||
            value.startsWith('--')
        )
            return null;
        options[name] = value;
    }
    return options;
}

export async function main(argv = process.argv.slice(2)) {
    const options = parseArgs(argv);
    if (!options) {
        process.stderr.write('OBS_ARGUMENTS\n');
        return 1;
    }
    try {
        const inventory = await inspectRuntimeObservations(options);
        process.stdout.write(stableStringify(inventory) + '\n');
        return 0;
    } catch (error) {
        process.stderr.write(observationDiagnostic(error) + '\n');
        return 1;
    }
}

if (
    process.argv[1] &&
    pathToFileURL(process.argv[1]).href === import.meta.url
) {
    main().then((code) => {
        process.exitCode = code;
    });
}
