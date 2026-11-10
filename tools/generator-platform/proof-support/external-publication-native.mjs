// X1 (ADR-0103) : publications sous plan dans une coque avec session déjà
// créée, compilées, construites, lintées et testées par les outils du produit.
// Contenus fictifs : aucune page métier ni aucun générateur réel revendiqué.
import assert from 'node:assert/strict';
import { readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import {
    computeOwnershipSeal,
    verifyApplicationOwnership,
} from '../core/application-ownership.mjs';
import {
    planApplicationPublication,
    publishApplicationPublication,
} from '../core/application-publication.mjs';
import { verifyGeneratedTree } from '../core/external-application-paths.mjs';
import { sha256 } from '../core/generation-manifest.mjs';
import {
    hash,
    TOOLS_ROOT,
} from '../test-support/external-application-fixture.mjs';
import { confinedNode, record } from './external-application-runtime.mjs';

const MANIFEST = '.cmz/app-manifest.json';
const NOTICE = 'src/app/generated/x1-proof/notice.ts';

// Runner natif d'une publication : chaque commande du produit est exécutée
// confinée, avec ses binaires installés, et inscrite au rapport.
export function nativePublicationRunner(session, label, root) {
    const labels = [];
    const run = (command, args, cwd) => {
        assert.equal(command, process.execPath);
        assert.equal(cwd, root);
        const name = args[0].endsWith('check-workspace.mjs')
            ? 'workspace-contract'
            : args[1] === 'run'
              ? args[2]
              : 'native-compiler';
        record(session, `${label}/${name}`, confinedNode(session, root, args));
        labels.push(name);
    };
    return { run, labels };
}

async function publishNative(session, label, options, root) {
    const plan = await planApplicationPublication(options);
    const { run, labels } = nativePublicationRunner(session, label, root);
    const result = await publishApplicationPublication(
        { ...options, expectedPlanId: plan.plan_id },
        { run }
    );
    assert.equal(result.recovered, false);
    assert.equal(labels.length, 5);
    await verifyGeneratedTree(plan.outputAbsolute, plan.files);
    assert.deepEqual(
        (await readdir(resolve(root, 'apps'))).filter((name) =>
            name.includes('-candidate-')
        ),
        [],
        'Reste de publication'
    );
    session.lines.push(
        `${label} plan_id=${plan.plan_id} manifest_sha256=${plan.manifest_sha256}`
    );
    await session.save();
    return plan;
}

// Refus attendu par le planificateur de l'atelier, puis état exact restauré.
async function refusal(session, label, mutate, restore, pattern, plan) {
    await plan();
    session.lines.push(`PASS ${label}/before`);
    await mutate();
    let refused = false;
    try {
        await plan();
    } catch (error) {
        assert.match(error.message, pattern);
        refused = true;
    } finally {
        await restore();
    }
    assert.equal(refused, true, `${label} accepté`);
    session.lines.push(`PASS ${label}/red`);
    await plan();
    session.lines.push(`PASS ${label}/restored`);
    await session.save();
}

export async function proveNativePublication(session, shell) {
    const { input, plan: shellPlan } = shell;
    const root = input.root;
    const domain = input.domain;
    const base = {
        workspaceRoot: TOOLS_ROOT,
        targetRoot: root,
        appName: shellPlan.app_name,
    };
    const page = input.design.pages.find(
        (entry) => entry.access.mode === 'authorized'
    );
    assert.ok(page, 'Page autorisée de fixture absente');
    const pagePath = `src/app/pages/${page.id}/page.component.ts`;
    const placeholder = shellPlan.files[pagePath];
    const marker = 'Cette page doit être réalisée depuis son contrat validé.';
    assert.ok(placeholder.includes(marker));
    // 1. Une sortie de générateur dans la zone generated/.
    await publishNative(
        session,
        `X1/${domain}/generated`,
        {
            ...base,
            tool: 'generate:action-request',
            files: {
                [NOTICE]: `export const X1_NOTICE = 'Publication X1 fictive (${domain}).';\n`,
            },
        },
        root
    );
    // 2. Remplacement déclaré de la page d'attente, qui consomme cette sortie.
    const replaced = placeholder
        .replace(
            "import { ChangeDetectionStrategy, Component } from '@angular/core';",
            "import { ChangeDetectionStrategy, Component } from '@angular/core';\n\nimport { X1_NOTICE } from '../../generated/x1-proof/notice';"
        )
        .replace(marker, '{{ notice }}')
        .replace(
            'export class PageComponent {}',
            'export class PageComponent {\n    protected readonly notice = X1_NOTICE;\n}'
        );
    assert.notEqual(replaced, placeholder);
    const final = await publishNative(
        session,
        `X1/${domain}/page`,
        { ...base, tool: 'page-realization', files: { [pagePath]: replaced } },
        root
    );
    const appRoot = final.outputAbsolute;
    const manifest = JSON.parse(final.files[MANIFEST]);
    verifyApplicationOwnership(manifest, manifest.ownership.workspace_id);
    assert.equal(manifest.ownership.publications.length, 2);
    // 3. Contre-épreuves sur le produit réellement installé.
    const next = {
        ...base,
        tool: 'generate:action-request',
        files: { [NOTICE]: "export const X1_NOTICE = 'suivante';\n" },
    };
    const planNext = () => planApplicationPublication(next);
    const hand = join(appRoot, 'src/app/generated/x1-proof/hand.ts');
    const handText = 'export const hand = 1;\n';
    await refusal(
        session,
        `X1/${domain}/hand-added-file`,
        () => writeFile(hand, handText, { flag: 'wx' }),
        () => rm(hand),
        /generated inventory drift/,
        planNext
    );
    const manifestPath = join(appRoot, MANIFEST);
    const original = await readFile(manifestPath);
    await refusal(
        session,
        `X1/${domain}/forged-registry`,
        async () => {
            await writeFile(hand, handText, { flag: 'wx' });
            const forged = JSON.parse(original.toString('utf8'));
            forged.generated_files.push({
                path: 'src/app/generated/x1-proof/hand.ts',
                bytes: Buffer.byteLength(handText),
                sha256: sha256(handText),
            });
            forged.generated_files.sort((left, right) =>
                left.path.localeCompare(right.path)
            );
            forged.tree_sha256 = sha256(
                forged.generated_files
                    .map((entry) => `${entry.path}\0${entry.sha256}`)
                    .join('\0')
            );
            assert.notEqual(
                computeOwnershipSeal(forged),
                forged.ownership.seal_sha256
            );
            await writeFile(
                manifestPath,
                JSON.stringify(forged, null, 2) + '\n'
            );
        },
        async () => {
            await writeFile(manifestPath, original);
            await rm(hand);
        },
        /app ownership seal mismatch/,
        planNext
    );
    assert.equal(hash(await readFile(manifestPath)), hash(original));
    await verifyGeneratedTree(appRoot, final.files);
    return final;
}
