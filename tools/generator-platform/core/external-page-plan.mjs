// X3 : `compile:page-execution-plan --target-root`. Le plan d'exécution d'une
// page est compilé depuis les seuls fichiers possédés de l'application : le
// contrat de page de la coque, les modèles des commandes publiées par
// `generate:action-request` et ceux des lectures publiées par
// `generate:list-query` (X5 C4). Il est publié dans le registre scellé de
// l'application (ADR-0103), et la composition le recompile pour le vérifier.
import { compilePageExecutionPlan } from './page-execution-plan.mjs';
import { canonicalizeGeneratedFiles } from './canonicalize-generated.mjs';
import { ownedProductContext } from './application-workspace-root.mjs';
import {
    planApplicationPublication,
    publicApplicationPublicationPlan,
    publishApplicationPublication,
} from './application-publication.mjs';
import { sessionApplication } from './external-action-request.mjs';
import { externalFailure } from './external-application-paths.mjs';
import {
    ACTION_REQUEST_TOOL,
    assertPageId,
    LIST_QUERY_TOOL,
    ownedAppFile,
    PAGE_PLAN_TOOL,
    pageOutputRoot,
    pagePlanPath,
    publishingTool,
} from './external-publication-paths.mjs';
import { sha256 } from './generation-manifest.mjs';
import { loadJson, repositoryRoot } from '../validate-ir.mjs';

export {
    assertPageId,
    ownedAppFile,
    PAGE_PLAN_TOOL,
    pageOutputRoot,
    pagePlanPath,
    publishingTool,
} from './external-publication-paths.mjs';

const MODEL =
    /^src\/app\/generated\/actions\/([a-z0-9][a-z0-9._-]*)\/execution-model\.json$/;
const QUERY_MODEL =
    /^src\/app\/generated\/queries\/([a-z0-9][a-z0-9._-]*)\/execution-model\.json$/;

// Modèles publiés par un outil, lus exacts dans le registre de l'application.
async function publishedModels(app, prefix, pattern, tool) {
    const models = [];
    for (const { path } of app.manifest.generated_files) {
        const match = pattern.exec(path);
        if (!match || publishingTool(app.manifest, path) !== tool) continue;
        const document = await ownedAppFile(app, path);
        models.push({
            id: match[1],
            uri: `${prefix}/${path}`,
            document,
            model: JSON.parse(document.toString('utf8')),
        });
    }
    return models;
}

// Un seul modèle publié sert chaque élément de la page (M-3).
function assertSingleServer(entries, models, key, label, tool) {
    for (const entry of entries) {
        const serving = models.filter(
            ({ model }) =>
                model.backend_contract.id === entry.operation_ref.contract_id &&
                model[key].some(
                    (candidate) =>
                        candidate.transport.operation_id ===
                        entry.operation_ref.operation_id
                )
        );
        if (serving.length === 0)
            externalFailure(
                `page ${label} ${entry.id} has no published ${label === 'load' ? 'read' : 'command'}; publish it with ${tool}`
            );
        if (serving.length > 1)
            externalFailure(
                `page ${label} ${entry.id} has several published ${label === 'load' ? 'reads' : 'commands'} (${serving.map(({ id }) => id).join(', ')}); keep one`
            );
    }
}

const schemas = () =>
    Promise.all(
        ['application-design', 'page-execution-plan'].map((name) =>
            loadJson(new URL(`../schemas/${name}.schema.json`, import.meta.url))
        )
    );

// Compilation déterministe depuis l'état courant de l'application : mêmes
// fichiers possédés, mêmes octets de plan.
export async function compileOwnedPagePlan(app, appName, pageId) {
    const pagePath = `.cmz/pages/${assertPageId(pageId)}.json`;
    if (!app.manifest.generated_files.some((entry) => entry.path === pagePath))
        externalFailure('page is not declared by the application');
    const pageDocument = await ownedAppFile(app, pagePath);
    const page = JSON.parse(pageDocument.toString('utf8')).page;
    const prefix = `apps/${appName}`;
    const models = await publishedModels(
        app,
        prefix,
        MODEL,
        ACTION_REQUEST_TOOL
    );
    const queries = await publishedModels(
        app,
        prefix,
        QUERY_MODEL,
        LIST_QUERY_TOOL
    );
    // Les modèles que la page n'utilise pas ne changent pas son plan.
    assertSingleServer(
        page.actions.filter((entry) => entry.kind === 'backend'),
        models,
        'actions',
        'action',
        'generate:action-request'
    );
    assertSingleServer(
        page.loads,
        queries,
        'queries',
        'load',
        'generate:list-query'
    );
    const [applicationDesignSchema, pageExecutionPlanSchema] = await schemas();
    let plan;
    try {
        plan = compilePageExecutionPlan({
            pageContract: {
                uri: `${prefix}/${pagePath}`,
                sha256: sha256(pageDocument),
                document: pageDocument,
            },
            listQueryModels: queries.map(({ uri, document }) => ({
                uri,
                sha256: sha256(document),
                document,
            })),
            actionRequestModels: models.map(({ uri, document }) => ({
                uri,
                sha256: sha256(document),
                document,
            })),
            applicationDesignSchema,
            pageExecutionPlanSchema,
        });
    } catch (error) {
        // Message fermé : première ligne du compilateur, sans chemin local.
        externalFailure(`page plan refused (${error.message.split('\n')[0]})`);
    }
    const path = pagePlanPath(pageId);
    return {
        plan,
        path,
        files: await canonicalizeGeneratedFiles({
            [path]: JSON.stringify(plan, null, 2) + '\n',
        }),
    };
}

async function renderExternalPagePlan(options) {
    const context = await ownedProductContext({
        workspaceRoot: options.workspaceRoot ?? repositoryRoot,
        targetRoot: options.targetRoot,
    });
    const app = await sessionApplication(
        context.productRoot,
        options.appName,
        'external page plan'
    );
    const compiled = await compileOwnedPagePlan(
        app,
        options.appName,
        options.pageId
    );
    return {
        pageId: options.pageId,
        pagePlanId: compiled.plan.plan_id,
        publication: {
            workspaceRoot: options.workspaceRoot ?? repositoryRoot,
            targetRoot: options.targetRoot,
            appName: options.appName,
            tool: PAGE_PLAN_TOOL,
            files: compiled.files,
            // Entrées : fichiers possédés, déjà liés par l'empreinte du
            // manifeste de l'application.
            inputs: [],
            omitUnchanged: true,
            coveredPrefix: `${pageOutputRoot(options.pageId)}/plan/`,
        },
    };
}

export async function planExternalPagePlan(options) {
    const rendered = await renderExternalPagePlan(options);
    return {
        ...(await planApplicationPublication(rendered.publication)),
        page_id: rendered.pageId,
        page_plan_id: rendered.pagePlanId,
    };
}

export function publicExternalPagePlan(plan) {
    return {
        ...publicApplicationPublicationPlan(plan),
        page_id: plan.page_id,
        page_plan_id: plan.page_plan_id,
    };
}

export async function publishExternalPagePlan(options, dependencies) {
    if (!/^[a-f0-9]{64}$/.test(options.expectedPlanId ?? ''))
        externalFailure('publication requires a reviewed plan');
    const rendered = await renderExternalPagePlan(options);
    return {
        ...(await publishApplicationPublication(
            { ...rendered.publication, expectedPlanId: options.expectedPlanId },
            dependencies
        )),
        page_id: rendered.pageId,
    };
}
