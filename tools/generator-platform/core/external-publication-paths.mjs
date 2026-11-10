// Publications extérieures d'une application (ADR-0103) : outils, chemins de
// sortie et lecture exacte des fichiers possédés, partagés par la commande
// (X2), le plan et la composition de page (X3) sans cycle d'import.
import {
    externalFailure,
    readProductFile,
} from './external-application-paths.mjs';
import { sha256 } from './generation-manifest.mjs';

export const ACTION_REQUEST_TOOL = 'generate:action-request';
export const PAGE_PLAN_TOOL = 'compile:page-execution-plan';
export const PAGE_COMPOSITION_TOOL = 'generate:page-composition';
export const REALIZATION_TOOL = 'page-realization';

export const actionOutputRoot = (actionId) =>
    `src/app/generated/actions/${actionId}`;
// Le modèle d'exécution est publié avec la commande ; le plan de page le
// référence, et la composition consomme cette commande publiée.
export const actionExecutionModelPath = (actionId) =>
    `${actionOutputRoot(actionId)}/execution-model.json`;

export const pageOutputRoot = (pageId) => `src/app/generated/pages/${pageId}`;
export const pagePlanPath = (pageId) =>
    `${pageOutputRoot(pageId)}/plan/page-execution-plan.json`;
export const pageCompositionRoot = (pageId) =>
    `${pageOutputRoot(pageId)}/composition`;
const PAGE_PLAN =
    /^src\/app\/generated\/pages\/(page_[a-f0-9]{16})\/plan\/page-execution-plan\.json$/;

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

// I-1 : pages dont le plan publié référence le modèle de cette commande. Une
// nouvelle publication de la commande les rend périmées : le plan, puis la
// composition, sont à recompiler après elle (X2 → plan → composition), puis,
// pour une page réalisée, le bon de travail à préparer et vérifier à nouveau.
export async function pagesConsumingCommand(app, appName, actionId) {
    const uri = `apps/${appName}/${actionExecutionModelPath(actionId)}`;
    const pages = [];
    for (const { path } of app.manifest.generated_files) {
        const match = PAGE_PLAN.exec(path);
        if (!match || publishingTool(app.manifest, path) !== PAGE_PLAN_TOOL)
            continue;
        const plan = JSON.parse((await ownedAppFile(app, path)).toString());
        if (
            !(plan.command_nodes ?? []).some(
                (node) => node.primitive_ref?.uri === uri
            )
        )
            continue;
        const composition = `${pageCompositionRoot(match[1])}/generation-manifest.json`;
        // I-3 : une page réalisée garde son bon de travail, que la commande
        // republiée périme ; ses règles sont à rejouer.
        const page = `src/app/pages/${match[1]}/page.component.ts`;
        pages.push({
            page_id: match[1],
            composition:
                publishingTool(app.manifest, composition) ===
                PAGE_COMPOSITION_TOOL,
            realization:
                publishingTool(app.manifest, page) === REALIZATION_TOOL,
        });
    }
    return pages.sort((left, right) =>
        left.page_id.localeCompare(right.page_id)
    );
}
