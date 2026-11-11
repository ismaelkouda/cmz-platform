// X3 : `generate:page-composition --target-root`. La composition Angular d'une
// page est rendue depuis son plan publié, recompilé à l'identique depuis l'état
// courant de l'application. Elle consomme les commandes publiées par
// `generate:action-request` au lieu d'en rendre une copie, et elle est publiée
// dans le registre scellé (ADR-0103). Le typage est fait par le compilateur du
// produit.
import { posix } from 'node:path';

import {
    angularPrimitiveBindings,
    EXTERNAL_COMPOSITION_COMMAND_OPTIONS,
} from '../page-composition-targets.mjs';
import { renderAngularActionRequestV2 } from '../renderers/angular-action-request-v2-renderer.mjs';
import { sampleCommandInput } from '../renderers/angular-page-composition-api.mjs';
import {
    ANGULAR_PAGE_COMPOSITION_CAPABILITIES,
    renderAngularPageComposition,
} from '../renderers/angular-page-composition-renderer.mjs';
import { loadJson, repositoryRoot } from '../validate-ir.mjs';
import { bindRenderedArtifacts, buildArtifactPlan } from './artifact-plan.mjs';
import { ownedProductContext } from './application-workspace-root.mjs';
import {
    planApplicationPublication,
    publicApplicationPublicationPlan,
    publishApplicationPublication,
} from './application-publication.mjs';
import { canonicalizeGeneratedFiles } from './canonicalize-generated.mjs';
import {
    assertShellServiceBinding,
    SESSION_MODULE,
    sessionApplication,
} from './external-action-request.mjs';
import { externalFailure } from './external-application-paths.mjs';
import { compileOwnedPagePlan } from './external-page-plan.mjs';
import {
    ACTION_REQUEST_TOOL,
    ownedAppFile,
    PAGE_COMPOSITION_TOOL,
    PAGE_PLAN_TOOL,
    pageCompositionRoot,
    pagePlanPath,
    publishingTool,
} from './external-publication-paths.mjs';
import { buildGenerationManifest } from './generation-manifest.mjs';
import { validatePageExecutionCapabilities } from './page-execution-plan.mjs';

export { PAGE_COMPOSITION_TOOL } from './external-publication-paths.mjs';
const GENERATED = 'src/app/generated/';
const ACTION_MODEL =
    /^src\/app\/generated\/actions\/([a-z0-9][a-z0-9._-]*)\/execution-model\.json$/;
// Depuis src/app/generated/pages/<page>/composition/src/ vers src/app/session.
const COMPOSITION_SESSION_MODULE = '../../../../../session';
// Depuis la même source vers src/app/generated/actions/<id>/src.
const actionModule = (actionId) => `../../../../actions/${actionId}/src`;

// Références du plan : seulement des fichiers possédés de cette application,
// jamais un chemin hors du produit, d'une autre application ou non inscrit.
export function assertPlanReferences(plan, appName, owned) {
    const prefix = `apps/${appName}/`;
    const references = [
        plan.source?.page_contract?.uri,
        ...[...(plan.query_nodes ?? []), ...(plan.command_nodes ?? [])].map(
            (node) => node.primitive_ref?.uri
        ),
    ];
    return references.map((uri) => {
        if (
            typeof uri !== 'string' ||
            !uri.startsWith(prefix) ||
            posix.normalize(uri) !== uri ||
            uri.split('/').includes('..')
        )
            externalFailure(
                'page plan references a file outside the application'
            );
        const path = uri.slice(prefix.length);
        if (!owned.has(path))
            externalFailure(
                'page plan references a file outside the application'
            );
        return path;
    });
}

// Nœud de commande : la commande publiée doit être exactement celle que la
// composition rendrait pour ce nœud ; elle est alors consommée telle quelle.
async function consumedCommand(app, node, modelPath) {
    const match = ACTION_MODEL.exec(modelPath);
    if (
        !match ||
        publishingTool(app.manifest, modelPath) !== ACTION_REQUEST_TOOL
    )
        externalFailure(`page command ${node.id} has no published command`);
    const actionId = match[1];
    const model = JSON.parse(
        (await ownedAppFile(app, modelPath)).toString('utf8')
    );
    const operation = model.actions.find(
        (candidate) => candidate.id === node.primitive_ref.operation_id
    );
    // `actionId` vient du chemin du modèle : le chemin est exact par
    // construction (validation X3, S7).
    if (!operation)
        externalFailure(`page command ${node.id} has no published command`);
    const serviceId = operation.transport.service_id;
    const token = assertShellServiceBinding(
        app.endpoints,
        serviceId,
        model.backend_contract.id
    );
    const rendered = renderAngularActionRequestV2(
        model,
        { services: { [serviceId]: { module: SESSION_MODULE, token } } },
        EXTERNAL_COMPOSITION_COMMAND_OPTIONS
    );
    const files = await canonicalizeGeneratedFiles(rendered.files);
    for (const [path, content] of Object.entries(files)) {
        const owned = `${GENERATED}actions/${actionId}/${path}`;
        let published;
        try {
            published = (await ownedAppFile(app, owned)).toString('utf8');
        } catch {
            published = undefined;
        }
        if (published !== content)
            externalFailure(
                `page command ${node.id} differs from its published command; republish it with generate:action-request`
            );
    }
    return {
        actionId,
        token,
        serviceId,
        sampleInput: sampleCommandInput(model),
        rendered: {
            kind: 'command',
            nodeId: node.id,
            target: {
                ...rendered,
                ...bindRenderedArtifacts(
                    buildArtifactPlan(model, model.kind),
                    files,
                    angularPrimitiveBindings(node.id, files)
                ),
            },
        },
    };
}

async function renderExternalPageComposition(options) {
    const context = await ownedProductContext({
        workspaceRoot: options.workspaceRoot ?? repositoryRoot,
        targetRoot: options.targetRoot,
    });
    const app = await sessionApplication(
        context.productRoot,
        options.appName,
        'external page composition'
    );
    const planPath = pagePlanPath(options.pageId);
    const owned = new Set(app.manifest.generated_files.map(({ path }) => path));
    if (
        !owned.has(planPath) ||
        publishingTool(app.manifest, planPath) !== PAGE_PLAN_TOOL
    )
        externalFailure(
            'page execution plan is not published; run compile:page-execution-plan'
        );
    const planDocument = await ownedAppFile(app, planPath);
    const plan = JSON.parse(planDocument.toString('utf8'));
    const [, ...modelPaths] = assertPlanReferences(
        plan,
        options.appName,
        owned
    );
    // Recompilation déterministe : le plan publié doit être celui que l'état
    // courant de l'application produit, octet pour octet.
    const expected = await compileOwnedPagePlan(
        app,
        options.appName,
        options.pageId
    );
    if (expected.files[planPath] !== planDocument.toString('utf8'))
        externalFailure(
            'page execution plan is stale; recompile it with compile:page-execution-plan'
        );
    if (plan.schema_version !== '1.1.0' || plan.query_nodes.length > 0)
        externalFailure(
            'external page composition supports session command pages only'
        );
    const unsupported = validatePageExecutionCapabilities(
        plan,
        ANGULAR_PAGE_COMPOSITION_CAPABILITIES
    );
    if (unsupported.length > 0)
        externalFailure('page plan requires unsupported capabilities');
    const services = {};
    const renderedNodes = [];
    const externalNodes = {};
    for (const [index, node] of plan.command_nodes.entries()) {
        const command = await consumedCommand(app, node, modelPaths[index]);
        services[command.serviceId] = {
            module: SESSION_MODULE,
            token: command.token,
        };
        renderedNodes.push(command.rendered);
        externalNodes[node.id] = {
            root: `actions/${command.actionId}/src`,
            module: actionModule(command.actionId),
            sampleInput: command.sampleInput,
            serviceToken: command.token,
        };
    }
    const rendered = renderAngularPageComposition(
        plan,
        renderedNodes,
        {
            schema_version: '1.1.0',
            kind: 'angular-page-host-bindings',
            session: {
                module: COMPOSITION_SESSION_MODULE,
                token: 'APPLICATION_SESSION',
            },
            // X4-sécurité-3, G2 : verrou du profil extérieur. Seule cette
            // liaison fait rendre `online`, la table `api` et son assertion.
            connectivity: {
                module: `${COMPOSITION_SESSION_MODULE}/connectivity`,
                token: 'ApplicationConnectivity',
            },
            services,
        },
        { externalNodes }
    );
    // Matérialisation complète, relative à src/app/generated/ : fichiers de la
    // composition et commandes consommées. Seuls les premiers sont publiés ; le
    // manifeste de génération lie les empreintes des secondes.
    const base = pageCompositionRoot(options.pageId);
    const local = (path) =>
        path.startsWith('src/')
            ? `${base.slice(GENERATED.length)}/${path}`
            : path;
    const canonical = await canonicalizeGeneratedFiles(rendered.files);
    const files = {};
    const bindings = {};
    for (const [path, content] of Object.entries(canonical)) {
        files[local(path)] = content;
        bindings[local(path)] = rendered.bindings[path];
    }
    const artifactPlan = buildArtifactPlan(plan, 'page-execution-plan');
    const bound = bindRenderedArtifacts(artifactPlan, files, bindings);
    const profile = await loadJson(
        new URL('../profiles/angular-nx.profile.json', import.meta.url)
    );
    const manifest = buildGenerationManifest(
        plan,
        artifactPlan,
        profile,
        bound
    );
    const publication = {};
    for (const [path, content] of Object.entries(files))
        if (path.startsWith(`${base.slice(GENERATED.length)}/`))
            publication[`${GENERATED}${path}`] = content;
    const manifestPath = `${base}/generation-manifest.json`;
    Object.assign(
        publication,
        await canonicalizeGeneratedFiles({
            [manifestPath]: JSON.stringify(manifest, null, 2) + '\n',
        })
    );
    return {
        pageId: options.pageId,
        commands: Object.values(externalNodes).map(
            ({ root }) => `${GENERATED}${root.replace(/\/src$/, '')}`
        ),
        publication: {
            workspaceRoot: options.workspaceRoot ?? repositoryRoot,
            targetRoot: options.targetRoot,
            appName: options.appName,
            tool: PAGE_COMPOSITION_TOOL,
            files: publication,
            inputs: [],
            omitUnchanged: true,
            coveredPrefix: `${base}/`,
        },
    };
}

// X4-sécurité-3 (Π2) : fichiers que le générateur courant publierait pour la
// composition de cette page. Un bon de travail n'est préparé que si la
// composition publiée leur est identique, octet pour octet.
export async function expectedExternalPageCompositionFiles(options) {
    return (await renderExternalPageComposition(options)).publication.files;
}

export async function planExternalPageComposition(options) {
    const rendered = await renderExternalPageComposition(options);
    return {
        ...(await planApplicationPublication(rendered.publication)),
        page_id: rendered.pageId,
        consumed_commands: rendered.commands,
    };
}

export function publicExternalPageCompositionPlan(plan) {
    return {
        ...publicApplicationPublicationPlan(plan),
        page_id: plan.page_id,
        consumed_commands: plan.consumed_commands,
    };
}

export async function publishExternalPageComposition(options, dependencies) {
    if (!/^[a-f0-9]{64}$/.test(options.expectedPlanId ?? ''))
        externalFailure('publication requires a reviewed plan');
    const rendered = await renderExternalPageComposition(options);
    return {
        ...(await publishApplicationPublication(
            { ...rendered.publication, expectedPlanId: options.expectedPlanId },
            dependencies
        )),
        page_id: rendered.pageId,
    };
}
