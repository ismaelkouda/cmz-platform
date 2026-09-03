#!/usr/bin/env node
import { pathToFileURL } from 'node:url';

import {
    planApplicationShell,
    publicApplicationShellPlan,
    publishApplicationShell,
} from './generator-platform/core/application-shell-publication.mjs';
import { loadJson, repositoryRoot } from './generator-platform/validate-ir.mjs';

function fail(message) {
    throw new Error(message);
}

export function parseArgs(argv) {
    const options = { dryRun: false, profile: 'angular-pwa' };
    for (let index = 0; index < argv.length; index += 1) {
        const argument = argv[index];
        if (argument === '--design') options.designPath = argv[++index];
        else if (argument === '--experience')
            options.experienceId = argv[++index];
        else if (argument === '--app') options.appName = argv[++index];
        else if (argument === '--profile') options.profile = argv[++index];
        else if (argument === '--dry-run') options.dryRun = true;
        else if (argument === '--apply') options.planId = argv[++index];
        else fail(`Argument inconnu : ${argument}`);
    }
    if (!options.designPath || !options.experienceId || !options.appName)
        fail('--design, --experience et --app sont requis.');
    if (options.dryRun === Boolean(options.planId))
        fail('Utiliser exactement --dry-run ou --apply <plan_id>.');
    if (options.planId && !/^[a-f0-9]{64}$/.test(options.planId))
        fail('--apply exige un plan_id SHA-256 valide.');
    return options;
}

async function schemas() {
    return Promise.all([
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
}

export async function main(argv = process.argv.slice(2)) {
    const options = parseArgs(argv);
    const [applicationDesignSchema, backendContractSchema] = await schemas();
    const common = {
        workspaceRoot: repositoryRoot,
        designPath: options.designPath,
        experienceId: options.experienceId,
        appName: options.appName,
        profile: options.profile,
        applicationDesignSchema,
        backendContractSchema,
    };
    if (options.dryRun) {
        console.log(
            JSON.stringify(
                publicApplicationShellPlan(await planApplicationShell(common)),
                null,
                2
            )
        );
        return;
    }
    const result = await publishApplicationShell({
        ...common,
        planId: options.planId,
    });
    console.log(
        `${result.recovered ? 'Reprise vérifiée' : 'Application créée'} : ${result.plan.output}`
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
