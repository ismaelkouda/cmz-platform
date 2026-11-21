// X3 : plan d'exécution et composition de la page Connexion dans une coque avec
// session déjà créée, publiée et dotée de sa commande (X0, X1, X2). Les deux
// publications sont compilées, construites, lintées et testées par les outils
// installés du produit. La composition n'est montée dans aucune page avant X4 ;
// aucun backend n'est appelé.
import assert from 'node:assert/strict';

import {
    planExternalPageComposition,
    publishExternalPageComposition,
} from '../core/external-page-composition.mjs';
import {
    planExternalPagePlan,
    publishExternalPagePlan,
} from '../core/external-page-plan.mjs';
import { verifyGeneratedTree } from '../core/external-application-paths.mjs';
import { TOOLS_ROOT } from '../test-support/external-application-fixture.mjs';
import { assertProductOnlyImports } from '../test-support/external-publication-fixture.mjs';
import { nativePublicationRunner } from './external-publication-native.mjs';

export async function publishNative(
    session,
    label,
    root,
    plan,
    publish,
    options
) {
    const { run, labels } = nativePublicationRunner(session, label, root);
    const result = await publish(
        { ...options, expectedPlanId: plan.plan_id },
        { run }
    );
    assert.equal(result.replayed, false);
    assert.equal(labels.length, 5);
    await verifyGeneratedTree(plan.outputAbsolute, plan.files);
}

export async function proveNativePageComposition(session, shell) {
    const root = shell.input.root;
    const domain = shell.input.domain;
    const options = {
        workspaceRoot: TOOLS_ROOT,
        targetRoot: root,
        appName: shell.plan.app_name,
        pageId: shell.input.entryPage.id,
    };
    const label = `X3/${domain}`;
    const pagePlan = await planExternalPagePlan(options);
    await publishNative(
        session,
        `${label}/plan`,
        root,
        pagePlan,
        publishExternalPagePlan,
        options
    );
    // Recompilation déterministe : le même état ne produit rien de neuf.
    await assert.rejects(
        planExternalPagePlan(options),
        /publication without change/
    );
    session.lines.push(`PASS ${label}/plan-deterministic`);
    const plan = await planExternalPageComposition(options);
    await publishNative(
        session,
        `${label}/composition`,
        root,
        plan,
        publishExternalPageComposition,
        options
    );
    // T11 : imports limités au produit ; la commande consommée est celle de X2.
    const manifest = JSON.parse(plan.files['.cmz/app-manifest.json']);
    assertProductOnlyImports(
        Object.fromEntries(
            plan.changes.map(({ path }) => [path, plan.files[path]])
        ),
        new Set(manifest.generated_files.map((entry) => entry.path))
    );
    session.lines.push(`PASS ${label}/product-only-imports`);
    assert.deepEqual(plan.consumed_commands, [
        `src/app/generated/actions/${domain}-enter`,
    ]);
    session.lines.push(`PASS ${label}/consumes-x2-command`);
    const replay = await publishExternalPageComposition(
        { ...options, expectedPlanId: plan.plan_id },
        { run: () => assert.fail('Republication') }
    );
    assert.equal(replay.replayed, true);
    session.lines.push(
        `${label} page_id=${options.pageId} page_plan_id=${pagePlan.page_plan_id} plan_id=${plan.plan_id} files=${plan.changes.length} manifest_sha256=${plan.manifest_sha256}`
    );
    await session.save();
    return plan;
}
