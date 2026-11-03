#!/usr/bin/env node
import { pathToFileURL } from 'node:url';
import { observationDiagnostic } from './generator-platform/core/runtime-observation-evidence.mjs';

import {
    planStructuredBackendPublication,
    publicBackendPublicationPlan,
    publishStructuredBackendContract,
} from './generator-platform/core/structured-backend-publication.mjs';
import { loadJson, repositoryRoot } from './generator-platform/validate-ir.mjs';

function fail(message) {
    throw new Error(message);
}

export function parseArgs(argv) {
    const options = { dryRun: false };
    const seen = new Set();
    const valueOptions = new Set([
        '--definition',
        '--out',
        '--adapter',
        '--apply',
        '--target-root',
        '--private-root',
        '--snapshot',
    ]);
    for (let index = 0; index < argv.length; index += 1) {
        const argument = argv[index];
        if (seen.has(argument)) fail('Une option ne peut pas être répétée.');
        seen.add(argument);
        if (
            valueOptions.has(argument) &&
            (!argv[index + 1] || argv[index + 1].startsWith('--'))
        )
            fail('Valeur d’option requise.');
        if (argument === '--definition') options.definitionPath = argv[++index];
        else if (argument === '--out') options.outputPath = argv[++index];
        else if (argument === '--adapter') options.adapter = argv[++index];
        else if (argument === '--target-root')
            options.targetRoot = argv[++index];
        else if (argument === '--private-root')
            options.privateRoot = argv[++index];
        else if (argument === '--snapshot') options.snapshotId = argv[++index];
        else if (argument === '--adopt-reference')
            options.adoptReference = true;
        else if (argument === '--dry-run') options.dryRun = true;
        else if (argument === '--apply') options.planId = argv[++index];
        else fail(`Argument inconnu : ${argument}`);
    }
    if (!options.definitionPath || !options.outputPath) {
        fail(
            '--definition <fichier.json> et --out <fichier.json> sont requis.'
        );
    }
    if (options.dryRun === Boolean(options.planId)) {
        fail('Utiliser exactement --dry-run ou --apply <plan_id>.');
    }
    if (options.planId && !/^[a-f0-9]{64}$/.test(options.planId)) {
        fail('--apply exige un plan_id SHA-256 valide.');
    }
    if (
        options.adapter !== undefined &&
        !['structured', 'openapi', 'postman', 'runtime-observation'].includes(
            options.adapter
        )
    ) {
        fail(
            '--adapter attendu : structured, openapi, postman ou runtime-observation.'
        );
    }
    if (
        (options.privateRoot || options.snapshotId) &&
        options.adapter !== 'runtime-observation'
    )
        fail('Private inputs require runtime-observation.');
    if (
        options.snapshotId &&
        !['openapi', 'observations', 'declarations'].includes(
            options.snapshotId
        )
    )
        fail('Unknown snapshot.');
    if (
        options.adoptReference &&
        (options.adapter !== 'structured' ||
            !options.targetRoot ||
            options.privateRoot ||
            options.snapshotId)
    )
        fail('Adoption requires structured and an external target root.');
    if (
        Object.values(options).some(
            (value) => typeof value === 'string' && value.length > 1024
        )
    )
        fail('Option exceeds limit.');
    return options;
}

export async function main(argv = process.argv.slice(2)) {
    const options = parseArgs(argv);
    const backendContractSchema = await loadJson(
        new URL(
            './generator-platform/schemas/backend-contract.schema.json',
            import.meta.url
        )
    );
    const common = {
        workspaceRoot: repositoryRoot,
        ...(options.targetRoot !== undefined
            ? { targetRoot: options.targetRoot }
            : {}),
        privateRoot: options.privateRoot,
        snapshotId: options.snapshotId,
        adoptReference: options.adoptReference,
        definitionPath: options.definitionPath,
        outputPath: options.outputPath,
        adapter: options.adapter ?? 'structured',
        backendContractSchema,
    };
    if (options.dryRun) {
        const plan = await planStructuredBackendPublication(common);
        console.log(
            JSON.stringify(publicBackendPublicationPlan(plan), null, 2)
        );
        return;
    }
    const result = await publishStructuredBackendContract({
        ...common,
        planId: options.planId,
    });
    console.log(
        `${result.already_published ? 'Déjà publié' : 'Publié'} : ${result.plan.output} ` +
            `(sha256 ${result.plan.output_sha256})`
    );
}

if (
    process.argv[1] &&
    pathToFileURL(process.argv[1]).href === import.meta.url
) {
    main().catch((error) => {
        const bounded =
            process.argv.includes('runtime-observation') ||
            process.argv.includes('--private-root') ||
            process.argv.includes('--snapshot') ||
            process.argv.includes('--adopt-reference');
        console.error(
            bounded ? observationDiagnostic(error) : `❌ ${error.message}`
        );
        process.exitCode = 1;
    });
}
