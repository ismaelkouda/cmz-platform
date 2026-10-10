#!/usr/bin/env node
import { pathToFileURL } from 'node:url';

import {
    planPageRealization,
    publicPageRealizationPlan,
    publishPageRealizationWorkOrder,
} from './generator-platform/core/page-realization.mjs';
import { loadJson, repositoryRoot } from './generator-platform/validate-ir.mjs';

function fail(message) {
    throw new Error(message);
}

export function parseArgs(argv) {
    const options = { dryRun: false, additionalFiles: [] };
    const setOnce = (key, value, flag) => {
        if (Object.hasOwn(options, key))
            fail(`${flag} ne peut apparaître qu'une fois.`);
        options[key] = value;
    };
    const valueAfter = (index, flag) => {
        const value = argv[index + 1];
        if (!value || value.startsWith('--')) fail(`${flag} exige une valeur.`);
        return value;
    };
    for (let index = 0; index < argv.length; index += 1) {
        const argument = argv[index];
        if (argument === '--app') {
            options.appName = valueAfter(index, argument);
            index += 1;
        } else if (argument === '--page') {
            options.pageId = valueAfter(index, argument);
            index += 1;
        } else if (argument === '--presentation-evidence') {
            options.presentationEvidencePath = valueAfter(index, argument);
            index += 1;
        } else if (argument === '--execution-plan') {
            options.pageExecutionPlanPath = valueAfter(index, argument);
            index += 1;
        } else if (argument === '--layout-binding') {
            setOnce('layoutBindingPath', valueAfter(index, argument), argument);
            index += 1;
        } else if (argument === '--authority-commit') {
            setOnce(
                'authorityCommitSha',
                valueAfter(index, argument),
                argument
            );
            index += 1;
        } else if (argument === '--base-commit') {
            setOnce('baseCommitSha', valueAfter(index, argument), argument);
            index += 1;
        } else if (argument === '--allow-file') {
            options.additionalFiles.push(valueAfter(index, argument));
            index += 1;
        } else if (argument === '--dry-run') options.dryRun = true;
        else if (argument === '--apply') {
            options.workOrderId = valueAfter(index, argument);
            index += 1;
        } else fail(`Argument inconnu : ${argument}`);
    }
    if (!options.appName || !options.pageId)
        fail('--app et --page sont requis.');
    if (options.dryRun === Boolean(options.workOrderId))
        fail('Utiliser exactement --dry-run ou --apply <work_order_id>.');
    if (options.workOrderId && !/^[a-f0-9]{64}$/.test(options.workOrderId))
        fail('--apply exige un work_order_id SHA-256 valide.');
    const v5Values = [
        options.layoutBindingPath,
        options.authorityCommitSha,
        options.baseCommitSha,
    ].filter(Boolean);
    if (v5Values.length !== 0 && v5Values.length !== 3)
        fail(
            '--layout-binding, --authority-commit et --base-commit sont requis ensemble.'
        );
    for (const [flag, value] of [
        ['--authority-commit', options.authorityCommitSha],
        ['--base-commit', options.baseCommitSha],
    ]) {
        if (value && !/^[a-f0-9]{40}$/.test(value))
            fail(`${flag} exige un SHA Git complet en minuscules.`);
    }
    return options;
}

export async function main(argv = process.argv.slice(2)) {
    const options = parseArgs(argv);
    const [
        presentationEvidenceSchema,
        pageExecutionPlanSchema,
        applicationDesignSchema,
        layoutBindingSchema,
        layoutExampleSetSchema,
    ] = await Promise.all([
        loadJson(
            new URL(
                './generator-platform/schemas/presentation-evidence.schema.json',
                import.meta.url
            )
        ),
        loadJson(
            new URL(
                './generator-platform/schemas/page-execution-plan.schema.json',
                import.meta.url
            )
        ),
        loadJson(
            new URL(
                './generator-platform/schemas/application-design.schema.json',
                import.meta.url
            )
        ),
        loadJson(
            new URL(
                './generator-platform/schemas/presentation-layout-binding.schema.json',
                import.meta.url
            )
        ),
        loadJson(
            new URL(
                './generator-platform/schemas/presentation-layout-example-set.schema.json',
                import.meta.url
            )
        ),
    ]);
    const common = {
        workspaceRoot: repositoryRoot,
        appName: options.appName,
        pageId: options.pageId,
        presentationEvidencePath: options.presentationEvidencePath,
        presentationEvidenceSchema,
        pageExecutionPlanPath: options.pageExecutionPlanPath,
        pageExecutionPlanSchema,
        applicationDesignSchema,
        layoutBindingPath: options.layoutBindingPath,
        layoutBindingSchema,
        layoutExampleSetSchema,
        authorityCommitSha: options.authorityCommitSha,
        baseCommitSha: options.baseCommitSha,
        additionalFiles: options.additionalFiles,
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
