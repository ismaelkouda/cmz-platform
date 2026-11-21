#!/usr/bin/env node
import { pathToFileURL } from 'node:url';

import { verifyPageRealization } from './generator-platform/core/page-realization.mjs';
import {
    parseClosedArguments,
    publicationResult,
    reportExternalFailure,
} from './generator-platform/core/external-cli.mjs';
import {
    planExternalPageRealization,
    publicExternalPageRealizationPlan,
    publishExternalPageRealization,
} from './generator-platform/core/external-page-realization.mjs';
import { loadJson, repositoryRoot } from './generator-platform/validate-ir.mjs';

const EXTERNAL_USAGE =
    'Produit extérieur (X4) :\n  bun run verify:page-realization --target-root <absolu> --app <app> --page <page_id> (--dry-run | --apply <plan_id>)\n';

// X4 : brouillon vérifié contre le bon de travail publié, puis page publiée
// sous plan à la place de la page d'attente. Les violations sont listées.
async function mainExternal(argv) {
    try {
        const options = parseClosedArguments(
            argv,
            {
                '--target-root': 'targetRoot',
                '--app': 'appName',
                '--page': 'pageId',
            },
            'external page realization'
        );
        if (options.help) {
            process.stdout.write(EXTERNAL_USAGE);
            return;
        }
        const common = {
            workspaceRoot: repositoryRoot,
            targetRoot: options.targetRoot,
            appName: options.appName,
            pageId: options.pageId,
        };
        if (options.dryRun) {
            const plan = await planExternalPageRealization(common);
            process.stdout.write(
                `${JSON.stringify({ ok: true, ...publicExternalPageRealizationPlan(plan) }, null, 2)}\n`
            );
            return;
        }
        const result = await publishExternalPageRealization({
            ...common,
            expectedPlanId: options.expectedPlanId,
        });
        process.stdout.write(
            `${JSON.stringify(
                publicationResult(result, options.appName, {
                    page_id: options.pageId,
                    work_order_id: result.work_order_id,
                }),
                null,
                2
            )}\n`
        );
    } catch (error) {
        if (error.violations) {
            process.stdout.write(
                `${JSON.stringify({ ok: false, violations: error.violations }, null, 2)}\n`
            );
        }
        reportExternalFailure(error);
    }
}

function fail(message) {
    throw new Error(message);
}

export function parseArgs(argv) {
    const options = {};
    for (let index = 0; index < argv.length; index += 1) {
        const argument = argv[index];
        if (argument === '--app') options.appName = argv[++index];
        else if (argument === '--page') options.pageId = argv[++index];
        else if (argument === '--work-order')
            options.workOrderId = argv[++index];
        else fail(`Argument inconnu : ${argument}`);
    }
    if (!options.appName || !options.pageId || !options.workOrderId)
        fail('--app, --page et --work-order sont requis.');
    if (!/^[a-f0-9]{64}$/.test(options.workOrderId))
        fail('--work-order exige un identifiant SHA-256.');
    return options;
}

export async function main(argv = process.argv.slice(2)) {
    if (argv.includes('--target-root')) return mainExternal(argv);
    const options = parseArgs(argv);
    const [
        evidenceSchema,
        presentationEvidenceSchema,
        pageExecutionPlanSchema,
        applicationDesignSchema,
        layoutBindingSchema,
        layoutExampleSetSchema,
    ] = await Promise.all([
        loadJson(
            new URL(
                './generator-platform/schemas/page-realization-evidence.schema.json',
                import.meta.url
            )
        ),
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
    const report = verifyPageRealization({
        workspaceRoot: repositoryRoot,
        ...options,
        evidenceSchema,
        presentationEvidenceSchema,
        pageExecutionPlanSchema,
        applicationDesignSchema,
        layoutBindingSchema,
        layoutExampleSetSchema,
    });
    console.log(JSON.stringify(report, null, 2));
    if (!report.ok) process.exitCode = 1;
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
