#!/usr/bin/env node
// X3 : compile le plan d'exécution d'une page d'une application extérieure et
// le publie sous plan relu dans son registre scellé (ADR-0103).
import { pathToFileURL } from 'node:url';

import {
    parseClosedArguments,
    publicationResult,
    reportExternalFailure,
} from './core/external-cli.mjs';
import {
    planExternalPagePlan,
    publicExternalPagePlan,
    publishExternalPagePlan,
} from './core/external-page-plan.mjs';
import { repositoryRoot } from './validate-ir.mjs';

const KEYS = {
    '--target-root': 'targetRoot',
    '--app': 'appName',
    '--page': 'pageId',
};

export function usage() {
    return `Usage:\n  bun run compile:page-execution-plan --target-root <absolute> --app <app> --page <page_id> (--dry-run | --apply <plan_id>)\n`;
}

export async function main(argv = process.argv.slice(2)) {
    const options = parseClosedArguments(argv, KEYS, 'external page plan');
    if (options.help) {
        process.stdout.write(usage());
        return;
    }
    const common = {
        workspaceRoot: repositoryRoot,
        targetRoot: options.targetRoot,
        appName: options.appName,
        pageId: options.pageId,
    };
    if (options.dryRun) {
        const plan = await planExternalPagePlan(common);
        process.stdout.write(
            `${JSON.stringify(publicExternalPagePlan(plan), null, 2)}\n`
        );
        return;
    }
    const result = await publishExternalPagePlan({
        ...common,
        expectedPlanId: options.expectedPlanId,
    });
    process.stdout.write(
        `${JSON.stringify(publicationResult(result, options.appName, { page_id: result.page_id }), null, 2)}\n`
    );
}

if (
    process.argv[1] &&
    import.meta.url === pathToFileURL(process.argv[1]).href
) {
    main().catch(reportExternalFailure);
}
