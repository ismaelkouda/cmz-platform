#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { validateApplicationDesignWithDependencies } from './generator-platform/core/application-design.mjs';
import { loadJson, repositoryRoot } from './generator-platform/validate-ir.mjs';

function inventory() {
    const output = execFileSync(
        'git',
        [
            'ls-files',
            '-z',
            '--cached',
            '--others',
            '--exclude-standard',
            '--',
            'designs/*.application-design.json',
        ],
        { cwd: repositoryRoot, encoding: 'utf8' }
    );
    return output.split('\0').filter(Boolean).sort();
}

export async function main(argv = process.argv.slice(2)) {
    const paths = argv.length > 0 ? argv : inventory();
    const [applicationDesignSchema, backendContractSchema] = await Promise.all([
        loadJson(
            new URL(
                './generator-platform/schemas/application-design.schema.json',
                import.meta.url
            )
        ),
        loadJson(
            new URL(
                './generator-platform/schemas/backend-contract.schema.json',
                import.meta.url
            )
        ),
    ]);
    const failures = [];
    for (const path of paths) {
        let design;
        try {
            design = JSON.parse(
                await readFile(resolve(repositoryRoot, path), 'utf8')
            );
        } catch (error) {
            failures.push(`${path}: ${error.message}`);
            continue;
        }
        const errors = await validateApplicationDesignWithDependencies({
            design,
            applicationDesignSchema,
            backendContractSchema,
            workspaceRoot: repositoryRoot,
        });
        failures.push(...errors.map((error) => `${path}: ${error}`));
    }
    if (failures.length > 0)
        throw new Error(`conceptions invalides :\n${failures.join('\n')}`);
    console.log(`✔ ${paths.length} conception(s) applicative(s) validée(s).`);
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
