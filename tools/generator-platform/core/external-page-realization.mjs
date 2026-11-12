// X4 : `prepare:page-realization` et `verify:page-realization --target-root`.
// Le bon de travail est publié dans le registre scellé de l'application ; la
// page réalisée est écrite dans un brouillon du produit, vérifiée contre ses
// règles, puis publiée sous plan à la place déclarée de la page d'attente. La
// compilation, le build, le lint et les tests passent par les binaires du
// produit (ADR-0103).
import { resolve } from 'node:path';

import { resolveRealizationContract } from './page-realization.mjs';
import { resolvePageRealizationTarget } from './page-realization-files.mjs';
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
import { sessionApplication } from './external-action-request.mjs';
import {
    externalFailure,
    pathExists,
    readProductFile,
    safeRelativePath,
    treeInventory,
} from './external-application-paths.mjs';
import { compileOwnedPagePlan } from './external-page-plan.mjs';
import { expectedExternalPageCompositionFiles } from './external-page-composition.mjs';
import { externalCompositionApi } from '../renderers/angular-page-composition-api.mjs';
import { READ_STATES_RULE, readStates } from './external-read-states.mjs';
import { grammarSection } from './page-grammar/work-order.mjs';
import {
    REALIZATION_TOOL,
    assertPageId,
    ownedAppFile,
    PAGE_COMPOSITION_TOOL,
    PAGE_PLAN_TOOL,
    pageCompositionRoot,
    pageOutputRoot,
    pagePlanPath,
    publishingTool,
} from './external-publication-paths.mjs';
import {
    FORBIDDEN_PATTERNS,
    PAGE_PACKAGES,
    realizationViolations,
    TEST_PACKAGES,
} from './external-page-realization-rules.mjs';
import { REVIEWED_VERSIONS } from './external-page-realization-program.mjs';
import {
    COMPOSITION_NAMES,
    DENIED_PROPERTIES,
    FORBIDDEN_ELEMENTS,
    RESOURCE_ATTRIBUTES,
    TEMPLATE_PIPES,
} from './external-page-realization-structure.mjs';
import {
    ANGULAR_REFUSED,
    ANGULAR_SYMBOLS,
    DOM_GLOBALS,
    DOM_MEMBERS,
    ES_EXCLUDED,
    ES_GLOBALS,
    ES_INTERFACES,
} from './external-page-realization-symbols.mjs';
import { sha256, stableStringify } from './generation-manifest.mjs';
import { loadJson, repositoryRoot } from '../validate-ir.mjs';

const GENERATED = 'src/app/generated/';
export const workOrderPath = (pageId) =>
    `${pageOutputRoot(pageId)}/realization/work-order.json`;
export const pagePublicationRoot = (pageId) => `src/app/pages/${pageId}`;
export const realizationDraftRoot = (appName, pageId) =>
    `descriptions/page-realizations/${appName}/${pageId}`;
// Depuis src/app/pages/<page>/ vers la composition publiée de la page.
const compositionModule = (pageId) =>
    `../../generated/pages/${pageId}/composition/src`;

// X4-sécurité-3, G4 : règles en grammaire positive. La page n'est plus filtrée :
// elle est écrite dans la grammaire fermée publiée sous `grammar`, et tout ce
// qui n'y figure pas est refusé.
const RULES = Object.freeze([
    'Implement only the validated page contract; appearance is free, resources are not.',
    'Write only allowed_files, in draft_root; verify:page-realization publishes them to publication_root.',
    'page.component.ts, page.component.html and page.component.scss are written in the closed grammar published under grammar; every rule code is listed in grammar.rules.',
    'The page has one capability root: one private field inject(PageComposition), and PAGE_COMPOSITION_PROVIDERS in @Component providers. It reaches only the published composition paths (composition.api), by kind.',
    'Logic stays in the generator: signals, computed values, tables, and the seven call forms; no loop, no DOM, no router, no lifecycle.',
    'A (submit) method is typed false and uses only the non-throwing forms of rule S1 and S2, ending with return false.',
    'The template passes ref.value or literals to page methods, never $event; routerLink is a static declared route.',
    'The stylesheet loads nothing and names no resource: no url(), no @import, no @font-face, no ::ng-deep.',
    'Map every contract id to one exact static data-cmz-id selector in the template; add no other data-cmz-id.',
    'Keep keyboard, screen-reader, loading, error and offline behavior explicit.',
    'The product compiler, build, lint and tests decide; a failure publishes nothing.',
]);

// I-1 : avant montage, le plan est celui que l'état courant produit et la
// composition lie encore les octets exacts de ce qu'elle consomme.
// X4-sécurité-3 (Π2, G2) : la composition publiée est exactement celle du
// générateur courant ; un sceau plus ancien (sans `online` ni table `api`) est
// refusé comme périmé, jamais accepté en silence.
async function mountableComposition(app, appName, pageId, options) {
    const planPath = pagePlanPath(pageId);
    if (publishingTool(app.manifest, planPath) !== PAGE_PLAN_TOOL)
        externalFailure(
            'page execution plan is not published; run compile:page-execution-plan'
        );
    const planDocument = await ownedAppFile(app, planPath);
    const expected = await compileOwnedPagePlan(app, appName, pageId);
    if (expected.files[planPath] !== planDocument.toString('utf8'))
        externalFailure(
            'page execution plan is stale; recompile it with compile:page-execution-plan'
        );
    const manifestPath = `${pageCompositionRoot(pageId)}/generation-manifest.json`;
    if (publishingTool(app.manifest, manifestPath) !== PAGE_COMPOSITION_TOOL)
        externalFailure(
            'page composition is not published; run generate:page-composition'
        );
    const manifestDocument = await ownedAppFile(app, manifestPath);
    const generation = JSON.parse(manifestDocument.toString('utf8'));
    const stale = () =>
        externalFailure(
            'page composition is stale; regenerate it with generate:page-composition'
        );
    if (
        generation.input?.sha256 !==
        sha256(stableStringify(JSON.parse(planDocument.toString('utf8'))))
    )
        stale();
    const owned = new Map(
        app.manifest.generated_files.map((entry) => [entry.path, entry])
    );
    const consumed = [];
    // M-4 : une composition sans fichiers ne prouverait rien de ce qu'elle lie.
    if (!Array.isArray(generation.files) || generation.files.length === 0)
        stale();
    for (const entry of generation.files) {
        const path = `${GENERATED}${safeRelativePath(entry.path)}`;
        if (owned.get(path)?.sha256 !== entry.sha256) stale();
        await ownedAppFile(app, path);
        consumed.push({ path, sha256: entry.sha256 });
    }
    const current = await expectedExternalPageCompositionFiles({
        ...options,
        appName,
        pageId,
    });
    for (const [path, content] of Object.entries(current)) {
        let published;
        try {
            published = (await ownedAppFile(app, path)).toString('utf8');
        } catch {
            published = undefined;
        }
        if (published !== content) stale();
    }
    // Littéraux d'endpoint interdits dans la page : chemins des commandes et,
    // depuis X5 C5, des lectures. La page n'écrit jamais l'adresse d'un service.
    const plan = JSON.parse(planDocument.toString('utf8'));
    const literals = new Set();
    // X5 C5 : lectures compilées de la page, pour la section read_states.
    const queries = new Map();
    for (const [nodes, entries] of [
        [plan.command_nodes, 'actions'],
        [plan.query_nodes, 'queries'],
    ])
        for (const node of nodes) {
            const model = JSON.parse(
                (
                    await ownedAppFile(
                        app,
                        node.primitive_ref.uri.slice(`apps/${appName}/`.length)
                    )
                ).toString('utf8')
            );
            for (const entry of model[entries])
                literals.add(entry.transport.path);
            if (entries === 'queries')
                queries.set(
                    node.id,
                    model.queries.find(
                        (entry) => entry.id === node.primitive_ref.operation_id
                    )
                );
        }
    return {
        plan: { path: planPath, sha256: sha256(planDocument) },
        composition: {
            module: compositionModule(pageId),
            manifest: { path: manifestPath, sha256: sha256(manifestDocument) },
            consumed: consumed.sort((left, right) =>
                left.path.localeCompare(right.path)
            ),
            api: externalCompositionApi(plan),
        },
        literals: [...literals].sort(),
        executionPlan: plan,
        queries,
    };
}

// Bon de travail déterministe : même état de l'application, mêmes octets.
async function buildWorkOrder(app, appName, pageId, toolsRoot, options) {
    assertPageId(pageId);
    const contractPath = `.cmz/pages/${pageId}.json`;
    if (!app.manifest.generated_files.some(({ path }) => path === contractPath))
        externalFailure('page is not declared by the application');
    const contractDocument = await ownedAppFile(app, contractPath);
    const pageContract = JSON.parse(contractDocument.toString('utf8'));
    const mount = await mountableComposition(app, appName, pageId, options);
    const target = resolvePageRealizationTarget(app.manifest.profile);
    const document = {
        schema_version: '1.0.0',
        kind: 'external-page-realization-work-order',
        app_name: appName,
        page_id: pageId,
        page_contract: {
            path: contractPath,
            sha256: sha256(contractDocument),
        },
        page_execution: mount.plan,
        composition: mount.composition,
        draft_root: realizationDraftRoot(appName, pageId),
        publication_root: pagePublicationRoot(pageId),
        allowed_files: [...target.requiredFiles],
        target: {
            profile: target.profile,
            archetype_stack: target.archetypeStack,
        },
        grammar: grammarSection({ pageId, pageContract }),
        realization_contract: resolveRealizationContract(
            toolsRoot,
            pageContract,
            sha256(contractDocument),
            target
        ),
        allowed_imports: {
            page: [...PAGE_PACKAGES],
            tests: [...TEST_PACKAGES],
            composition_names: [...COMPOSITION_NAMES],
        },
        symbols: {
            reviewed_versions: REVIEWED_VERSIONS,
            angular: ANGULAR_SYMBOLS,
            angular_refused: [...ANGULAR_REFUSED],
            rxjs: 'all, except rxjs/ajax and rxjs/fetch',
            es_globals: [...ES_GLOBALS],
            es_interfaces: [...ES_INTERFACES],
            es_excluded: [...ES_EXCLUDED],
            dom_globals: [...DOM_GLOBALS],
            dom_members: [...DOM_MEMBERS],
        },
        structure: {
            denied_properties: [...DENIED_PROPERTIES],
            forbidden_elements: [...FORBIDDEN_ELEMENTS],
            resource_attributes: [...RESOURCE_ATTRIBUTES],
            template_pipes: [...TEMPLATE_PIPES],
        },
        forbidden_patterns: FORBIDDEN_PATTERNS.map(([label, pattern]) => ({
            label,
            pattern: String(pattern),
        })),
        forbidden_literals: mount.literals,
        // X5 C5 : seulement pour une page à lectures (Π2 : le bon de travail
        // d'une page de commandes ne change pas).
        ...(mount.executionPlan.query_nodes.length > 0
            ? {
                  read_states: {
                      rule: READ_STATES_RULE,
                      reads: readStates(mount.executionPlan, mount.queries),
                  },
              }
            : {}),
        oracle: [
            'native-compiler',
            `${appName}:build:production`,
            `${appName}:lint`,
            `${appName}:test`,
            'workspace-contract',
        ],
        rules: [...RULES],
    };
    const workOrder = {
        ...document,
        work_order_id: sha256(stableStringify(document)),
    };
    const path = workOrderPath(pageId);
    const files = await canonicalizeGeneratedFiles({
        [path]: JSON.stringify(workOrder, null, 2) + '\n',
    });
    return { workOrder, pageContract, contractDocument, path, files };
}

async function context(options, label) {
    const product = await ownedProductContext({
        workspaceRoot: options.workspaceRoot ?? repositoryRoot,
        targetRoot: options.targetRoot,
    });
    const app = await sessionApplication(
        product.productRoot,
        options.appName,
        label
    );
    return { productRoot: product.productRoot, app };
}

function publication(options, tool, files, inputs, coveredPrefix) {
    return {
        workspaceRoot: options.workspaceRoot ?? repositoryRoot,
        targetRoot: options.targetRoot,
        appName: options.appName,
        tool,
        files,
        inputs,
        omitUnchanged: true,
        coveredPrefix,
    };
}

async function renderWorkOrder(options) {
    const { app } = await context(options, 'external page realization');
    const built = await buildWorkOrder(
        app,
        options.appName,
        options.pageId,
        options.workspaceRoot ?? repositoryRoot,
        options
    );
    return {
        workOrder: built.workOrder,
        publication: publication(
            options,
            REALIZATION_TOOL,
            built.files,
            [],
            `${pageOutputRoot(options.pageId)}/realization/`
        ),
    };
}

export async function planExternalPageRealizationWorkOrder(options) {
    const rendered = await renderWorkOrder(options);
    return {
        ...(await planApplicationPublication(rendered.publication)),
        page_id: options.pageId,
        work_order_id: rendered.workOrder.work_order_id,
        draft_root: rendered.workOrder.draft_root,
    };
}

export function publicExternalPageRealizationPlan(plan) {
    return {
        ...publicApplicationPublicationPlan(plan),
        page_id: plan.page_id,
        work_order_id: plan.work_order_id,
        draft_root: plan.draft_root,
    };
}

const reviewed = (options) => {
    if (!/^[a-f0-9]{64}$/.test(options.expectedPlanId ?? ''))
        externalFailure('publication requires a reviewed plan');
};

export async function publishExternalPageRealizationWorkOrder(
    options,
    dependencies
) {
    reviewed(options);
    const rendered = await renderWorkOrder(options);
    return {
        ...(await publishApplicationPublication(
            { ...rendered.publication, expectedPlanId: options.expectedPlanId },
            dependencies
        )),
        page_id: options.pageId,
        work_order_id: rendered.workOrder.work_order_id,
    };
}

// Brouillon du réalisateur : fichiers réguliers, sans sous-répertoire.
async function readDraft(productRoot, draftRoot) {
    const absolute = resolve(productRoot, inputFilePath(draftRoot));
    if (!(await pathExists(absolute)))
        externalFailure('page realization draft is absent');
    const files = {};
    for (const entry of await treeInventory(absolute))
        files[entry.path] = await readProductFile(
            productRoot,
            `${draftRoot}/${entry.path}`
        );
    return files;
}

async function renderRealization(options) {
    const { productRoot, app } = await context(
        options,
        'external page realization'
    );
    const path = workOrderPath(assertPageId(options.pageId));
    if (publishingTool(app.manifest, path) !== REALIZATION_TOOL)
        externalFailure(
            'page realization work order is not prepared; run prepare:page-realization'
        );
    const published = (await ownedAppFile(app, path)).toString('utf8');
    const expected = await buildWorkOrder(
        app,
        options.appName,
        options.pageId,
        options.workspaceRoot ?? repositoryRoot,
        options
    );
    if (expected.files[path] !== published)
        externalFailure(
            'page realization work order is stale; prepare it again with prepare:page-realization'
        );
    const { workOrder } = expected;
    const draft = await readDraft(productRoot, workOrder.draft_root);
    const violations = realizationViolations({
        files: draft,
        workOrder,
        pageContract: expected.pageContract,
        pageContractSha256: workOrder.page_contract.sha256,
        environment: { productRoot, appRoot: app.appRoot },
        evidenceSchema: await loadJson(
            new URL(
                '../schemas/page-realization-evidence.schema.json',
                import.meta.url
            )
        ),
    });
    if (violations.length > 0) {
        const error = new Error(
            `external application: page realization violates its work order (${violations.length})`
        );
        error.violations = violations;
        throw error;
    }
    const files = {};
    const inputs = [];
    for (const name of workOrder.allowed_files) {
        files[`${workOrder.publication_root}/${name}`] =
            draft[name].toString('utf8');
        inputs.push({
            path: `${workOrder.draft_root}/${name}`,
            sha256: sha256(draft[name]),
        });
    }
    return {
        workOrder,
        publication: publication(
            options,
            REALIZATION_TOOL,
            files,
            inputs,
            `${workOrder.publication_root}/`
        ),
    };
}

export async function planExternalPageRealization(options) {
    const rendered = await renderRealization(options);
    return {
        ...(await planApplicationPublication(rendered.publication)),
        page_id: options.pageId,
        work_order_id: rendered.workOrder.work_order_id,
    };
}

export async function publishExternalPageRealization(options, dependencies) {
    reviewed(options);
    const rendered = await renderRealization(options);
    return {
        ...(await publishApplicationPublication(
            { ...rendered.publication, expectedPlanId: options.expectedPlanId },
            dependencies
        )),
        page_id: options.pageId,
        work_order_id: rendered.workOrder.work_order_id,
    };
}
