// X5 C3a : `generate:list-query --target-root`. Une lecture list-query v2
// Angular, au profil EXTÉRIEUR (D-X5-2, D-X5-4, D-X5-6), est rendue depuis
// les entrées du produit, puis publiée dans son application par la seule
// primitive scellée (ADR-0103). Modèle exact : l'action-request extérieure
// (X2). Le typage est fait par le compilateur installé dans le produit, sur le
// candidat de publication ; l'atelier ne type-check rien de cette sortie.
import { resolve } from 'node:path';

import { computeExternalAngularListQueryTarget } from '../list-query-v2-targets.mjs';
import { repositoryRoot } from '../validate-ir.mjs';
import {
    planApplicationPublication,
    publicApplicationPublicationPlan,
    publishApplicationPublication,
} from './application-publication.mjs';
import {
    inputFilePath,
    ownedProductContext,
} from './application-workspace-root.mjs';
import { canonicalizeGeneratedFiles } from './canonicalize-generated.mjs';
import {
    SESSION_MODULE,
    assertDeclaredContract,
    assertShellServiceBinding,
    inputClosure,
    sessionApplication,
} from './external-action-request.mjs';
import {
    externalFailure,
    readProductFile,
} from './external-application-paths.mjs';
import {
    LIST_QUERY_TOOL,
    pagesConsumingQuery,
    queryExecutionModelPath,
    queryOutputRoot,
} from './external-publication-paths.mjs';

export {
    LIST_QUERY_TOOL,
    queryExecutionModelPath,
    queryOutputRoot,
} from './external-publication-paths.mjs';

async function renderExternalListQuery(options) {
    const context = await ownedProductContext({
        workspaceRoot: options.workspaceRoot ?? repositoryRoot,
        targetRoot: options.targetRoot,
    });
    const root = context.productRoot;
    const app = await sessionApplication(
        root,
        options.appName,
        'external list-query'
    );
    const definitionPath = inputFilePath(options.definitionPath ?? '');
    const document = await readProductFile(root, definitionPath);
    let definition;
    try {
        definition = JSON.parse(document.toString('utf8'));
    } catch {
        externalFailure('list-query definition is not JSON');
    }
    if (definition?.schema_version !== '2.0.0')
        externalFailure('external list-query requires definition 2.0.0');
    // Entrées confinées au produit, vérifiées avant toute compilation.
    const inputs = await inputClosure(root, definitionPath, definition);
    let target;
    try {
        target = await computeExternalAngularListQueryTarget({
            definitionPath: resolve(root, definitionPath),
            definitionDocument: document,
            artifactRoot: root,
            hostBindings: (model) => ({
                module: SESSION_MODULE,
                token: assertShellServiceBinding(
                    app.endpoints,
                    model.queries[0].transport.service_id,
                    model.backend_contract.id
                ),
            }),
        });
    } catch (error) {
        // Refus nommés du profil extérieur : exposés tels quels ; tout autre
        // échec reste fermé (aucun chemin ni détail de l'atelier).
        const named = /LIST_QUERY_(?:EXTERNAL|CONFORMANCE)_[A-Z_]+: .*/.exec(
            error.message
        );
        if (named) externalFailure(named[0]);
        throw error;
    }
    await assertDeclaredContract(app, target.model.backend_contract);
    const base = queryOutputRoot(target.queryId);
    const files = Object.fromEntries(
        Object.entries(target.files).map(([path, content]) => [
            `${base}/${path}`,
            content,
        ])
    );
    const manifestPath = `${base}/generation-manifest.json`;
    const modelPath = queryExecutionModelPath(target.queryId);
    // C3b : le test de conformité de contrat, hors du plan d'artefacts, est
    // publié avec la lecture et lancé par le vitest installé du produit.
    Object.assign(
        files,
        await canonicalizeGeneratedFiles({
            [manifestPath]: JSON.stringify(target.manifest, null, 2) + '\n',
            [modelPath]: JSON.stringify(target.model, null, 2) + '\n',
            [`${base}/${target.conformanceSpec.path}`]:
                target.conformanceSpec.content,
        })
    );
    return {
        queryId: target.queryId,
        modelSha256: target.manifest.input.sha256,
        dependentPages: await pagesConsumingQuery(
            app,
            options.appName,
            target.queryId
        ),
        publication: {
            workspaceRoot: options.workspaceRoot ?? repositoryRoot,
            targetRoot: options.targetRoot,
            appName: options.appName,
            tool: LIST_QUERY_TOOL,
            files,
            inputs,
            omitUnchanged: true,
            coveredPrefix: `${base}/`,
        },
    };
}

export async function planExternalListQuery(options) {
    const rendered = await renderExternalListQuery(options);
    const plan = await planApplicationPublication(rendered.publication);
    return {
        ...plan,
        query_id: rendered.queryId,
        model_sha256: rendered.modelSha256,
        dependent_pages: rendered.dependentPages,
    };
}

export function publicExternalListQueryPlan(plan) {
    return {
        ...publicApplicationPublicationPlan(plan),
        query_id: plan.query_id,
        model_sha256: plan.model_sha256,
        dependent_pages: plan.dependent_pages,
    };
}

export async function publishExternalListQuery(options, dependencies) {
    if (!/^[a-f0-9]{64}$/.test(options.expectedPlanId ?? ''))
        externalFailure('publication requires a reviewed plan');
    const rendered = await renderExternalListQuery(options);
    const result = await publishApplicationPublication(
        { ...rendered.publication, expectedPlanId: options.expectedPlanId },
        dependencies
    );
    return {
        ...result,
        query_id: rendered.queryId,
        dependent_pages: rendered.dependentPages,
    };
}
