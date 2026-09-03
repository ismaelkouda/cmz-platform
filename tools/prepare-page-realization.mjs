#!/usr/bin/env node
import { pathToFileURL } from 'node:url';

import {
    planPageRealization,
    publicPageRealizationPlan,
    publishPageRealizationWorkOrder,
} from './generator-platform/core/page-realization.mjs';
import { repositoryRoot } from './generator-platform/validate-ir.mjs';

function fail(message) {
    throw new Error(message);
}

export function parseArgs(argv) {
    const options = { dryRun: false };
    for (let index = 0; index < argv.length; index += 1) {
        const argument = argv[index];
        if (argument === '--app') options.appName = argv[++index];
        else if (argument === '--page') options.pageId = argv[++index];
        else if (argument === '--dry-run') options.dryRun = true;
        else if (argument === '--apply') options.workOrderId = argv[++index];
        else fail(`Argument inconnu : ${argument}`);
    }
    if (!options.appName || !options.pageId)
        fail('--app et --page sont requis.');
    if (options.dryRun === Boolean(options.workOrderId))
        fail('Utiliser exactement --dry-run ou --apply <work_order_id>.');
    if (options.workOrderId && !/^[a-f0-9]{64}$/.test(options.workOrderId))
        fail('--apply exige un work_order_id SHA-256 valide.');
    return options;
}

export async function main(argv = process.argv.slice(2)) {
    const options = parseArgs(argv);
    const common = {
        workspaceRoot: repositoryRoot,
        appName: options.appName,
        pageId: options.pageId,
    };
    if (options.dryRun) {
        console.log(
            JSON.stringify(
                publicPageRealizationPlan(planPageRealization(common)),
                null,
                2
            )
        );
        return;
    }
    const result = await publishPageRealizationWorkOrder({
        ...common,
        workOrderId: options.workOrderId,
    });
    console.log(
        `${result.already_published ? 'Déjà préparé' : 'Préparé'} : ${result.plan.work_order_path}`
    );
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
