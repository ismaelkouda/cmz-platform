#!/usr/bin/env node
import { pathToFileURL } from 'node:url';

import {
    planApplicationShell,
    publicApplicationShellPlan,
    publicApplicationShellResult,
    publishApplicationShell,
} from './generator-platform/core/application-shell-publication.mjs';
import { loadJson, repositoryRoot } from './generator-platform/validate-ir.mjs';

function fail(message) {
    throw new Error(message);
}

export function parseArgs(argv) {
    if (argv.includes('--explain')) {
        if (argv.length !== 1)
            fail('--explain doit être utilisé seul, sans autre argument.');
        return { explain: true };
    }
    const options = { dryRun: false, profile: 'angular-pwa' };
    for (let index = 0; index < argv.length; index += 1) {
        const argument = argv[index];
        if (argument === '--design') options.designPath = argv[++index];
        else if (argument === '--experience')
            options.experienceId = argv[++index];
        else if (argument === '--app') options.appName = argv[++index];
        else if (argument === '--profile') options.profile = argv[++index];
        else if (argument === '--dry-run') options.dryRun = true;
        else if (argument === '--expect-plan') {
            options.expectedPlanId = argv[++index];
            if (!options.expectedPlanId)
                fail('--expect-plan exige un plan_id SHA-256.');
        } else if (argument === '--apply')
            fail(
                '--apply a été retiré : la création est directe. Utiliser --expect-plan <plan_id> pour vérifier un plan revu.'
            );
        else fail(`Argument inconnu : ${argument}`);
    }
    if (!options.designPath || !options.experienceId || !options.appName)
        fail('--design, --experience et --app sont requis.');
    if (options.dryRun && options.expectedPlanId)
        fail('--dry-run et --expect-plan sont exclusifs.');
    if (
        options.expectedPlanId !== undefined &&
        !/^[a-f0-9]{64}$/.test(options.expectedPlanId)
    )
        fail('--expect-plan exige un plan_id SHA-256 valide.');
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
    if (options.explain) {
        const { formatCommandExplanation } =
            await import('./command-explanations.mjs');
        process.stdout.write(formatCommandExplanation('create-app'));
        return;
    }
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
        expectedPlanId: options.expectedPlanId,
    });
    console.log(JSON.stringify(publicApplicationShellResult(result), null, 2));
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
