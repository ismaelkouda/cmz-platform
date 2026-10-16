#!/usr/bin/env node
import { pathToFileURL } from 'node:url';

import {
    planApplicationWorkspace,
    publicApplicationWorkspacePlan,
    publishApplicationWorkspace,
} from './generator-platform/core/application-workspace.mjs';
import { repositoryRoot } from './generator-platform/validate-ir.mjs';

function fail(message) {
    throw Object.assign(new Error(message), { code: 'CMZ_CLI_USAGE' });
}

export function parseArgs(argv) {
    if (argv.includes('--explain')) {
        if (argv.length !== 1)
            fail('--explain doit être utilisé seul, sans autre argument.');
        return { explain: true };
    }
    const options = { dryRun: false };
    const names = new Map([
        ['--target-root', 'targetRoot'],
        ['--profiles', 'profiles'],
        ['--github-repository', 'githubRepository'],
        ['--review-owner', 'reviewOwner'],
        ['--apply', 'expectedPlanId'],
    ]);
    const seen = new Set();
    for (let index = 0; index < argv.length; index += 1) {
        const argument = argv[index];
        if (seen.has(argument)) fail('Une option ne peut pas être répétée.');
        seen.add(argument);
        if (argument === '--dry-run') options.dryRun = true;
        else if (names.has(argument)) {
            const value = argv[++index];
            if (!value || value.startsWith('--'))
                fail('Valeur d’option requise.');
            options[names.get(argument)] = value;
        } else fail('Argument inconnu ou option interdite.');
    }
    if (
        !options.targetRoot ||
        !options.profiles ||
        !options.githubRepository ||
        !options.reviewOwner
    )
        fail(
            '--target-root, --profiles, --github-repository et --review-owner sont requis.'
        );
    if (options.dryRun === Boolean(options.expectedPlanId))
        fail('Choisir exactement --dry-run ou --apply <plan_id>.');
    if (
        options.expectedPlanId &&
        !/^[a-f0-9]{64}$/.test(options.expectedPlanId)
    )
        fail('--apply exige un plan_id SHA-256 valide.');
    options.profiles = options.profiles.split(',');
    return options;
}

export async function main(argv = process.argv.slice(2)) {
    const options = parseArgs(argv);
    if (options.explain) {
        const { formatCommandExplanation } =
            await import('./command-explanations.mjs');
        process.stdout.write(
            formatCommandExplanation('prepare:application-workspace')
        );
        return;
    }
    const common = { ...options, workspaceRoot: repositoryRoot };
    const result = options.dryRun
        ? publicApplicationWorkspacePlan(await planApplicationWorkspace(common))
        : await publishApplicationWorkspace(common);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (
    process.argv[1] &&
    pathToFileURL(process.argv[1]).href === import.meta.url
) {
    main().catch((error) => {
        const message =
            error.code === 'CMZ_CLI_USAGE' ||
            error.message.startsWith('external application:') ||
            error.message.startsWith('library dependency resolution:')
                ? error.message
                : 'Préparation refusée ; inspecter les entrées localement.';
        process.stderr.write(`${message}\n`);
        process.exitCode = 1;
    });
}
