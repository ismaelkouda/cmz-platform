// X3 : `compile:page-execution-plan --target-root`. Le plan d'exécution d'une
// page est compilé depuis les seuls fichiers possédés de l'application : le
// contrat de page de la coque et les modèles des commandes publiées par
// `generate:action-request`. Il est publié dans le registre scellé de
// l'application (ADR-0103), et la composition le recompile pour le vérifier.
import { compilePageExecutionPlan } from './page-execution-plan.mjs';
import { canonicalizeGeneratedFiles } from './canonicalize-generated.mjs';
import { ownedProductContext } from './application-workspace-root.mjs';
import {
    planApplicationPublication,
    publicApplicationPublicationPlan,
    publishApplicationPublication,
} from './application-publication.mjs';
import {
    ACTION_REQUEST_TOOL,
    sessionApplication,
} from './external-action-request.mjs';
import {
    externalFailure,
    readProductFile,
} from './external-application-paths.mjs';
import { sha256 } from './generation-manifest.mjs';
import { loadJson, repositoryRoot } from '../validate-ir.mjs';

export const PAGE_PLAN_TOOL = 'compile:page-execution-plan';
const MODEL =
    /^src\/app\/generated\/actions\/[a-z0-9][a-z0-9._-]*\/execution-model\.json$/;

export const pageOutputRoot = (pageId) => `src/app/generated/pages/${pageId}`;
export const pagePlanPath = (pageId) =>
    `${pageOutputRoot(pageId)}/plan/page-execution-plan.json`;

export function assertPageId(pageId) {
    if (!/^page_[a-f0-9]{16}$/.test(pageId ?? ''))
        externalFailure('invalid page id');
    return pageId;
}

// Fichier possédé de l'application, exact selon son registre.
export async function ownedAppFile(app, path) {
    const entry = app.manifest.generated_files.find(
        (candidate) => candidate.path === path
    );
    if (!entry) externalFailure('file is not owned by the application');
    const content = await readProductFile(app.appRoot, path);
    if (sha256(content) !== entry.sha256 || content.length !== entry.bytes)
        externalFailure('owned application file drift');
    return content;
}

// Dernier outil qui a publié ce fichier ; `null` pour un fichier de la coque.
export function publishingTool(manifest, path) {
    return (
        manifest.ownership.publications.findLast((record) =>
            record.files.some((file) => file.path === path)
        )?.tool ?? null
    );
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
    // Les lectures extérieures arrivent avec X5.
    if (page.loads.length > 0)
        externalFailure('external page plan supports command pages only');
    const prefix = `apps/${appName}`;
    const models = [];
    for (const { path } of app.manifest.generated_files) {
        if (
            !MODEL.test(path) ||
            publishingTool(app.manifest, path) !== ACTION_REQUEST_TOOL
        )
            continue;
        const document = await ownedAppFile(app, path);
        models.push({
            uri: `${prefix}/${path}`,
            sha256: sha256(document),
            document,
            model: JSON.parse(document.toString('utf8')),
        });
    }
    for (const action of page.actions.filter(
        (entry) => entry.kind === 'backend'
    ))
        if (
            !models.some(
                ({ model }) =>
                    model.backend_contract.id ===
                        action.operation_ref.contract_id &&
                    model.actions.some(
                        (candidate) =>
                            candidate.transport.operation_id ===
                            action.operation_ref.operation_id
                    )
            )
        )
            externalFailure(
                `page action ${action.id} has no published command; publish it with generate:action-request`
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
