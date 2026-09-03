#!/usr/bin/env node
import { pathToFileURL } from 'node:url';

import {
    planApplicationDesignPublication,
    publicApplicationDesignPlan,
    publishApplicationDesign,
} from './generator-platform/core/application-design-publication.mjs';
import { loadJson, repositoryRoot } from './generator-platform/validate-ir.mjs';

function fail(message) {
    throw new Error(message);
}

export function parseArgs(argv) {
    const options = { dryRun: false };
    for (let index = 0; index < argv.length; index += 1) {
        const argument = argv[index];
        if (argument === '--source') options.sourcePath = argv[++index];
        else if (argument === '--out') options.outputPath = argv[++index];
        else if (argument === '--dry-run') options.dryRun = true;
        else if (argument === '--apply') options.planId = argv[++index];
        else fail(`Argument inconnu : ${argument}`);
    }
    if (!options.sourcePath || !options.outputPath)
        fail(
            '--source <fichier.json|yaml> et --out <fichier.json> sont requis.'
        );
    if (options.dryRun === Boolean(options.planId))
        fail('Utiliser exactement --dry-run ou --apply <plan_id>.');
    if (options.planId && !/^[a-f0-9]{64}$/.test(options.planId))
        fail('--apply exige un plan_id SHA-256 valide.');
    return options;
}

export async function main(argv = process.argv.slice(2)) {
    const options = parseArgs(argv);
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
    const common = {
        workspaceRoot: repositoryRoot,
        sourcePath: options.sourcePath,
        outputPath: options.outputPath,
        applicationDesignSchema,
        backendContractSchema,
    };
    if (options.dryRun) {
        console.log(
            JSON.stringify(
                publicApplicationDesignPlan(
                    await planApplicationDesignPublication(common)
                ),
                null,
                2
            )
        );
        return;
    }
    const result = await publishApplicationDesign({
        ...common,
        planId: options.planId,
    });
    console.log(
        `${result.already_published ? 'Déjà publiée' : 'Publiée'} : ${result.plan.output} ` +
            `(sha256 ${result.plan.output_sha256})`
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
