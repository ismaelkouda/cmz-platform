#!/usr/bin/env node
import { pathToFileURL } from 'node:url';

import {
    planApplicationRetirement,
    publicApplicationRetirementPlan,
    publishApplicationRetirement,
    recoverApplicationRetirement,
} from './generator-platform/core/application-retirement.mjs';
import { repositoryRoot } from './generator-platform/validate-ir.mjs';

function fail(message) {
    throw new Error(message);
}

export function parseArgs(argv) {
    const options = { dryRun: false, resume: false, abort: false };
    for (let index = 0; index < argv.length; index += 1) {
        const argument = argv[index];
        if (argument === '--app') options.appName = argv[++index];
        else if (argument === '--dry-run') options.dryRun = true;
        else if (argument === '--apply') options.planId = argv[++index];
        else if (argument === '--resume') options.resume = true;
        else if (argument === '--abort') options.abort = true;
        else fail(`Argument inconnu : ${argument}`);
    }
    if (!/^[a-z][a-z0-9-]*$/.test(options.appName ?? ''))
        fail('--app <kebab-case> est requis.');
    if (options.resume || options.abort) {
        if (
            options.resume === options.abort ||
            options.dryRun ||
            options.planId
        )
            fail('--resume ou --abort doit être utilisé seul avec --app.');
    } else if (options.dryRun === Boolean(options.planId)) {
        fail('Utiliser exactement --dry-run ou --apply <plan_id>.');
    }
    if (options.planId && !/^[a-f0-9]{64}$/.test(options.planId))
        fail('--apply exige un plan_id SHA-256 valide.');
    return options;
}

export async function main(argv = process.argv.slice(2)) {
    const options = parseArgs(argv);
    if (options.resume || options.abort) {
        const result = await recoverApplicationRetirement({
            workspaceRoot: repositoryRoot,
            appName: options.appName,
            abort: options.abort,
        });
        console.log(
            result.aborted
                ? 'Retrait annulé et restauré.'
                : 'Retrait repris et finalisé.'
        );
        return;
    }
    const common = { workspaceRoot: repositoryRoot, appName: options.appName };
    if (options.dryRun) {
        console.log(
            JSON.stringify(
                publicApplicationRetirementPlan(
                    await planApplicationRetirement(common)
                ),
                null,
                2
            )
        );
        return;
    }
    const result = await publishApplicationRetirement({
        ...common,
        planId: options.planId,
    });
    console.log(`Application retirée : ${result.plan.output}`);
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
