// X5 : lecture extérieure publiée sous plan (C3a), puis plan et composition de
// la page À LECTURE (C4), dans une coque avec session déjà dotée de sa page
// Connexion (X0 à X4). Chaque publication est compilée, construite, lintée et
// testée par les outils installés du produit : la spec de conformité de
// contrat (C3b) et la spec de contrat des lectures de la composition (C4)
// s'exécutent avec le vitest RÉEL du produit. Aucun backend n'est appelé.
import assert from 'node:assert/strict';

import {
    planExternalListQuery,
    publishExternalListQuery,
} from '../core/external-list-query.mjs';
import {
    planExternalPageComposition,
    publishExternalPageComposition,
} from '../core/external-page-composition.mjs';
import {
    planExternalPagePlan,
    publishExternalPagePlan,
} from '../core/external-page-plan.mjs';
import { TOOLS_ROOT } from '../test-support/external-application-fixture.mjs';
import { assertProductOnlyImports } from '../test-support/external-publication-fixture.mjs';
import { writeExternalQueryDefinition } from '../test-support/external-session-fixture.mjs';
import { publishNative } from './external-page-composition-native.mjs';

function onlyProductImports(plan) {
    const manifest = JSON.parse(plan.files['.cmz/app-manifest.json']);
    assertProductOnlyImports(
        Object.fromEntries(
            plan.changes.map(({ path }) => [path, plan.files[path]])
        ),
        new Set(manifest.generated_files.map((entry) => entry.path))
    );
}

export async function proveNativeListQuery(session, shell) {
    const root = shell.input.root;
    const domain = shell.input.domain;
    const base = {
        workspaceRoot: TOOLS_ROOT,
        targetRoot: root,
        appName: shell.plan.app_name,
    };
    const label = `X5/${domain}`;
    const read = {
        ...base,
        definitionPath: await writeExternalQueryDefinition(root, domain),
    };
    const readPlan = await planExternalListQuery(read);
    assert.ok(
        readPlan.changes.some(({ path }) => path.endsWith('.contract.spec.ts'))
    );
    await publishNative(
        session,
        `${label}/read`,
        root,
        readPlan,
        publishExternalListQuery,
        read
    );
    onlyProductImports(readPlan);
    session.lines.push(`PASS ${label}/read-product-only-imports`);
    const page = shell.input.design.pages.find(
        (entry) => entry.loads.length > 0
    );
    const options = { ...base, pageId: page.id };
    const pagePlan = await planExternalPagePlan(options);
    await publishNative(
        session,
        `${label}/plan`,
        root,
        pagePlan,
        publishExternalPagePlan,
        options
    );
    const plan = await planExternalPageComposition(options);
    assert.ok(
        plan.changes.some(({ path }) =>
            path.endsWith('/page-composition.queries.spec.ts')
        )
    );
    await publishNative(
        session,
        `${label}/composition`,
        root,
        plan,
        publishExternalPageComposition,
        options
    );
    onlyProductImports(plan);
    assert.deepEqual(plan.consumed_queries, [
        `src/app/generated/queries/${readPlan.query_id}`,
    ]);
    session.lines.push(`PASS ${label}/consumes-published-read`);
    session.lines.push(
        `${label} query_id=${readPlan.query_id} read_plan_id=${readPlan.plan_id} page_id=${page.id} page_plan_id=${pagePlan.page_plan_id} plan_id=${plan.plan_id} files=${plan.changes.length}`
    );
    await session.save();
    return plan;
}
