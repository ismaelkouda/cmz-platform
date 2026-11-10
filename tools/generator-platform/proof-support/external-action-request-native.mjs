// X2 : `generate:action-request --target-root` dans une coque avec session déjà
// créée et publiée (X0, X1). La commande de connexion 2.1 du domaine fictif est
// compilée, construite, lintée et testée par les outils installés du produit.
// Aucune page ne la consomme encore ; aucun backend n'est appelé.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
    planExternalActionRequest,
    publishExternalActionRequest,
} from '../core/external-action-request.mjs';
import { verifyGeneratedTree } from '../core/external-application-paths.mjs';
import { TOOLS_ROOT } from '../test-support/external-application-fixture.mjs';
import { assertProductOnlyImports } from '../test-support/external-publication-fixture.mjs';
import { writeExternalActionDefinitions } from '../test-support/external-session-fixture.mjs';
import { nativePublicationRunner } from './external-publication-native.mjs';

export async function proveNativeActionRequest(session, shell) {
    const root = shell.input.root;
    const domain = shell.input.domain;
    const { enter } = await writeExternalActionDefinitions(root, domain);
    const options = {
        workspaceRoot: TOOLS_ROOT,
        targetRoot: root,
        appName: shell.plan.app_name,
        definitionPath: enter,
    };
    const label = `X2/${domain}`;
    // T5 : une définition modifiée après relecture périme le plan.
    const stale = await planExternalActionRequest(options);
    const definitionPath = join(root, enter);
    const original = await readFile(definitionPath);
    const revised = JSON.parse(original.toString('utf8'));
    revised.feature.description = 'Synthetic fixture, revised after review.';
    await writeFile(definitionPath, JSON.stringify(revised, null, 2) + '\n');
    try {
        await assert.rejects(
            publishExternalActionRequest(
                { ...options, expectedPlanId: stale.plan_id },
                { run: () => assert.fail('Compilation sur un plan périmé') }
            ),
            /reviewed publication plan is stale/
        );
    } finally {
        await writeFile(definitionPath, original);
    }
    session.lines.push(`PASS ${label}/stale-plan-refused`);
    // Plan relu, puis publication par les binaires du produit.
    const plan = await planExternalActionRequest(options);
    assert.equal(plan.plan_id, stale.plan_id);
    const { run, labels } = nativePublicationRunner(session, label, root);
    const result = await publishExternalActionRequest(
        { ...options, expectedPlanId: plan.plan_id },
        { run }
    );
    assert.equal(result.replayed, false);
    assert.equal(labels.length, 5);
    await verifyGeneratedTree(plan.outputAbsolute, plan.files);
    // T11 : la sortie n'importe que les paquets installés du produit et ses
    // propres fichiers ; aucun module cmz, aucun chemin de l'atelier.
    const manifest = JSON.parse(plan.files['.cmz/app-manifest.json']);
    assertProductOnlyImports(
        Object.fromEntries(
            plan.changes.map(({ path }) => [path, plan.files[path]])
        ),
        new Set(manifest.generated_files.map((entry) => entry.path))
    );
    session.lines.push(`PASS ${label}/product-only-imports`);
    const replay = await publishExternalActionRequest(
        { ...options, expectedPlanId: plan.plan_id },
        { run: () => assert.fail('Republication') }
    );
    assert.equal(replay.replayed, true);
    session.lines.push(
        `${label} action_id=${plan.action_id} plan_id=${plan.plan_id} files=${plan.changes.length} manifest_sha256=${plan.manifest_sha256}`
    );
    await session.save();
    return plan;
}
