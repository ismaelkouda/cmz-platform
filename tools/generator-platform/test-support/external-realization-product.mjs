// X4 : produit fictif composé (coque avec session, commande, plan et
// composition publiés), bon de travail et brouillon de la page Connexion.
// Le runner injecté ne compile rien : la chaîne native est prouvée par
// check:external-application-shells.
import { constants } from 'node:fs';
import { cp, mkdir, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
    planExternalActionRequest,
    publishExternalActionRequest,
} from '../core/external-action-request.mjs';
import {
    planExternalPageComposition,
    publishExternalPageComposition,
} from '../core/external-page-composition.mjs';
import {
    planExternalPagePlan,
    publishExternalPagePlan,
} from '../core/external-page-plan.mjs';
import {
    planExternalPageRealizationWorkOrder,
    publishExternalPageRealizationWorkOrder,
    workOrderPath,
} from '../core/external-page-realization.mjs';
import { realizationViolations } from '../core/external-page-realization-rules.mjs';
import { sha256 } from '../core/generation-manifest.mjs';
import { sessionApp } from './external-publication-fixture.mjs';
import { connexionRealizationFiles } from './external-realization-fixture.mjs';
import { writeExternalActionDefinitions } from './external-session-fixture.mjs';
import { loadJson, repositoryRoot } from '../validate-ir.mjs';

// La page est vérifiée avec les types installés du produit : le produit
// fictif reçoit les déclarations des paquets réels de l'atelier, aux versions
// revues, copiées dans son node_modules (un lien hors du produit y est
// refusé).
const TYPE_PACKAGES = [
    '@angular/common',
    '@angular/core',
    '@angular/localize',
    '@angular/router',
    '@types/node',
    'rxjs',
    'tslib',
    'typescript',
];

export async function linkTypePackages(root) {
    for (const name of TYPE_PACKAGES)
        await cp(
            await realpath(join(repositoryRoot, 'node_modules', name)),
            join(root, 'node_modules', name),
            {
                recursive: true,
                force: true,
                mode: constants.COPYFILE_FICLONE,
                filter: (source) =>
                    !/\.[cm]?[jt]s$|\.html$|\.md$|\.txt$/.test(source) ||
                    source.endsWith('.d.ts'),
            }
        );
}

export const environmentOf = (product) => ({
    productRoot: product.root,
    appRoot: product.app,
});

export async function publish(plan, publisher, options, run = () => undefined) {
    const reviewed = await plan(options);
    const result = await publisher(
        { ...options, expectedPlanId: reviewed.plan_id },
        { run }
    );
    return { plan: reviewed, result };
}

export async function publishCommand(action) {
    return publish(
        planExternalActionRequest,
        publishExternalActionRequest,
        action
    );
}

export async function composedProduct(t, domain, { composition = true } = {}) {
    const product = await sessionApp(t, domain);
    await linkTypePackages(product.root);
    const { enter } = await writeExternalActionDefinitions(
        product.root,
        domain
    );
    const action = { ...product.base, definitionPath: enter };
    await publishCommand(action);
    const pageId = product.input.entryPage.id;
    const options = { ...product.base, pageId };
    await publish(planExternalPagePlan, publishExternalPagePlan, options);
    if (composition)
        await publish(
            planExternalPageComposition,
            publishExternalPageComposition,
            options
        );
    return { ...product, action, pageId, options };
}

export async function prepare(product) {
    return publish(
        planExternalPageRealizationWorkOrder,
        publishExternalPageRealizationWorkOrder,
        product.options
    );
}

export async function workOrderOf(product) {
    return JSON.parse(
        await readFile(join(product.app, workOrderPath(product.pageId)), 'utf8')
    );
}

// Réalisation de l'agent (IA) écrite dans le brouillon du bon de travail.
export async function realization(product, workOrder) {
    const contract = await readFile(
        join(product.app, workOrder.page_contract.path)
    );
    return connexionRealizationFiles({
        pageContract: JSON.parse(contract),
        contractSha256: sha256(contract),
        composition: workOrder.composition.module,
    });
}

export async function writeDraft(product, workOrder, files) {
    const root = join(product.root, workOrder.draft_root);
    await rm(root, { recursive: true, force: true });
    await mkdir(root, { recursive: true });
    for (const [name, content] of Object.entries(files))
        await writeFile(join(root, name), content);
}

// Vérification directe d'un brouillon contre le bon de travail préparé, dans
// le programme réel du produit fictif.
export async function realizationChecker(product) {
    await prepare(product);
    const workOrder = await workOrderOf(product);
    const good = await realization(product, workOrder);
    const contract = await readFile(
        join(product.app, workOrder.page_contract.path)
    );
    const evidenceSchema = await loadJson(
        new URL(
            '../schemas/page-realization-evidence.schema.json',
            import.meta.url
        )
    );
    const violationsOf = (files) =>
        realizationViolations({
            files: Object.fromEntries(
                Object.entries(files).map(([name, text]) => [
                    name,
                    Buffer.isBuffer(text) ? text : Buffer.from(text),
                ])
            ),
            workOrder,
            pageContract: JSON.parse(contract),
            pageContractSha256: sha256(contract),
            evidenceSchema,
            environment: environmentOf(product),
        });
    return { workOrder, good, violationsOf };
}
