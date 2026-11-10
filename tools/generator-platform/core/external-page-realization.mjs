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

const RULES = Object.freeze([
    'Implement only the validated page contract; appearance is free.',
    'Write only allowed_files, in draft_root; verify:page-realization publishes them to publication_root.',
    'Mount the page composition in the @Component providers (PAGE_COMPOSITION_PROVIDERS) and act only through PageComposition; never import a command, the session or HttpClient directly.',
    'Import only allowed_imports, the composition names, and the page files.',
    'In page.component.ts every reference resolves to an allowed symbol (symbols): the page itself, the composition names and their members, rxjs, and the listed Angular, ES and DOM symbols. No declare, no type assertion except as const, no type predicate, no any, no computed key without a literal type, never assemble a string from literals.',
    'A DOM object is only read through a listed member, compared, or passed whole to a page method whose parameter has a DOM type.',
    'Keep the template declarative: no structure.forbidden_elements, no resource or navigation attribute, attr.* bindings for aria-* only, no structure.denied_properties, structure.template_pipes only, no $any; pass $event or a #reference whole as an argument of a component method.',
    'Never write an endpoint literal or a URL. The shell Content-Security-Policy blocks any other origin, inline script and dynamic code in the browser; product commands run confined.',
    'Map every contract id to one exact static data-cmz-id selector in the template; add no other data-cmz-id.',
    'Keep keyboard, screen-reader, loading, error and offline behavior explicit.',
    'The product compiler, build, lint and tests decide; a failure publishes nothing.',
]);

// I-1 : avant montage, le plan est celui que l'état courant produit et la
// composition lie encore les octets exacts de ce qu'elle consomme.
async function mountableComposition(app, appName, pageId) {
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
    // Littéraux d'endpoint interdits dans la page : chemins des commandes.
    const plan = JSON.parse(planDocument.toString('utf8'));
    const literals = new Set();
    for (const node of plan.command_nodes) {
        const model = JSON.parse(
            (
                await ownedAppFile(
                    app,
                    node.primitive_ref.uri.slice(`apps/${appName}/`.length)
                )
            ).toString('utf8')
        );
        for (const action of model.actions) literals.add(action.transport.path);
    }
    return {
        plan: { path: planPath, sha256: sha256(planDocument) },
        composition: {
            module: compositionModule(pageId),
            manifest: { path: manifestPath, sha256: sha256(manifestDocument) },
            consumed: consumed.sort((left, right) =>
                left.path.localeCompare(right.path)
            ),
        },
        literals: [...literals].sort(),
    };
}

// Bon de travail déterministe : même état de l'application, mêmes octets.
async function buildWorkOrder(app, appName, pageId, toolsRoot) {
    assertPageId(pageId);
    const contractPath = `.cmz/pages/${pageId}.json`;
    if (!app.manifest.generated_files.some(({ path }) => path === contractPath))
        externalFailure('page is not declared by the application');
    const contractDocument = await ownedAppFile(app, contractPath);
    const pageContract = JSON.parse(contractDocument.toString('utf8'));
    const mount = await mountableComposition(app, appName, pageId);
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
        options.workspaceRoot ?? repositoryRoot
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
        options.workspaceRoot ?? repositoryRoot
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
