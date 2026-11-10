// X2 : `generate:action-request --target-root`. Une commande 2.1 Angular est
// rendue depuis les entrées du produit, puis publiée dans son application par
// la seule primitive scellée (ADR-0103). Le typage est fait par le compilateur
// installé dans le produit, sur le candidat de publication ; l'atelier ne
// type-check rien de cette sortie.
import { resolve } from 'node:path';

import ts from 'typescript';

import { computeExternalAngularActionRequestTarget } from '../action-request-v2-targets.mjs';
import { sessionEndpointToken } from '../renderers/angular-application-session-renderer.mjs';
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
    externalFailure,
    pathExists,
    readProductFile,
} from './external-application-paths.mjs';
import { sha256 } from './generation-manifest.mjs';

export const ACTION_REQUEST_TOOL = 'generate:action-request';
const SESSION_INDEX = 'src/app/session/index.ts';
const SESSION_ENDPOINTS = 'src/app/session/service-endpoints.ts';
// Depuis src/app/generated/actions/<id>/src/ vers src/app/session.
export const SESSION_MODULE = '../../../../session';

export const actionOutputRoot = (actionId) =>
    `src/app/generated/actions/${actionId}`;
// X3 : le modèle d'exécution est publié avec la commande ; le plan de page le
// référence, et la composition consomme cette commande publiée.
export const actionExecutionModelPath = (actionId) =>
    `${actionOutputRoot(actionId)}/execution-model.json`;

async function digest(root, path) {
    return { path, sha256: sha256(await readProductFile(root, path)) };
}

// Fermeture des entrées liées au plan : définition, contrat backend et sources
// du contrat. Toute dérive périme le plan relu (T5).
async function inputClosure(root, definitionPath, definition) {
    const contractPath = inputFilePath(definition.backend_contract?.uri ?? '');
    const contract = JSON.parse(
        (await readProductFile(root, contractPath)).toString('utf8')
    );
    const paths = new Set([definitionPath, contractPath]);
    for (const source of contract.sources ?? [])
        if (typeof source.snapshot_uri === 'string')
            paths.add(inputFilePath(source.snapshot_uri));
    return Promise.all([...paths].sort().map((path) => digest(root, path)));
}

// Application Angular avec session du produit ; `label` nomme l'outil appelant.
export async function sessionApplication(
    root,
    appName,
    label = 'external action-request'
) {
    if (!/^[a-z][a-z0-9-]*$/.test(appName ?? ''))
        externalFailure('invalid app name');
    const appRoot = resolve(root, 'apps', appName);
    if (!(await pathExists(appRoot))) externalFailure('application is absent');
    const manifest = JSON.parse(
        (await readProductFile(appRoot, '.cmz/app-manifest.json')).toString(
            'utf8'
        )
    );
    // Angular seulement : React reste explicitement refusé.
    if (manifest.profile !== 'angular-pwa')
        externalFailure(`${label} requires an angular-pwa app`);
    const owned = new Set(manifest.generated_files.map((entry) => entry.path));
    if (!owned.has(SESSION_INDEX) || !owned.has(SESSION_ENDPOINTS))
        externalFailure('application has no session module');
    return {
        appRoot,
        manifest,
        endpoints: (await readProductFile(appRoot, SESSION_ENDPOINTS)).toString(
            'utf8'
        ),
    };
}

// Contrat et service que la coque lie à un jeton de service : lus dans la
// déclaration exportée du jeton (syntaxe, indépendante du formatage). Le filtre
// rendu par la coque compare `endpoint.contract_id` et `endpoint.service_id`
// à des littéraux ; ce sont eux qui décident l'URL résolue.
export function shellServiceBinding(source, token) {
    const file = ts.createSourceFile(
        'service-endpoints.ts',
        source,
        ts.ScriptTarget.ES2022,
        true
    );
    for (const statement of file.statements) {
        if (
            !ts.isVariableStatement(statement) ||
            !statement.modifiers?.some(
                (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword
            )
        )
            continue;
        for (const declaration of statement.declarationList.declarations) {
            if (
                !ts.isIdentifier(declaration.name) ||
                declaration.name.text !== token ||
                !declaration.initializer
            )
                continue;
            const binding = {};
            const visit = (node) => {
                if (
                    ts.isBinaryExpression(node) &&
                    node.operatorToken.kind ===
                        ts.SyntaxKind.EqualsEqualsEqualsToken &&
                    ts.isPropertyAccessExpression(node.left) &&
                    ts.isStringLiteral(node.right) &&
                    ['contract_id', 'service_id'].includes(node.left.name.text)
                ) {
                    const key = node.left.name.text;
                    if (key in binding) binding.ambiguous = true;
                    binding[key] = node.right.text;
                }
                ts.forEachChild(node, visit);
            };
            visit(declaration.initializer);
            return binding;
        }
    }
    return null;
}

// Le jeton de service doit être celui que la coque a généré, lié par elle au
// même service et au contrat du modèle (M-5) : sinon l'URL résolue serait celle
// d'un autre contrat. Rend le nom du jeton.
export function assertShellServiceBinding(endpoints, serviceId, contractId) {
    const token = sessionEndpointToken(serviceId);
    const binding = shellServiceBinding(endpoints, token);
    if (!binding)
        externalFailure(
            'service endpoint is not declared by the session shell'
        );
    if (
        binding.ambiguous ||
        binding.service_id !== serviceId ||
        binding.contract_id !== contractId
    )
        externalFailure(
            'service endpoint is bound to another service or contract by the session shell'
        );
    return token;
}

async function renderExternalActionRequest(options) {
    const context = await ownedProductContext({
        workspaceRoot: options.workspaceRoot ?? repositoryRoot,
        targetRoot: options.targetRoot,
    });
    const root = context.productRoot;
    const app = await sessionApplication(root, options.appName);
    const definitionPath = inputFilePath(options.definitionPath ?? '');
    const document = await readProductFile(root, definitionPath);
    let definition;
    try {
        definition = JSON.parse(document.toString('utf8'));
    } catch {
        externalFailure('action-request definition is not JSON');
    }
    // 2.0 et 1.0 importent des bibliothèques de l'atelier : refusées ici.
    if (definition?.schema_version !== '2.1.0')
        externalFailure('external action-request requires definition 2.1.0');
    // Entrées confinées au produit, vérifiées avant toute compilation.
    const inputs = await inputClosure(root, definitionPath, definition);
    const target = await computeExternalAngularActionRequestTarget({
        definitionPath: resolve(root, definitionPath),
        definitionDocument: document,
        artifactRoot: root,
        hostBindings: (model) => {
            const serviceId = model.actions[0].transport.service_id;
            return {
                services: {
                    [serviceId]: {
                        module: SESSION_MODULE,
                        token: assertShellServiceBinding(
                            app.endpoints,
                            serviceId,
                            model.backend_contract.id
                        ),
                    },
                },
            };
        },
    });
    const base = actionOutputRoot(target.actionId);
    const files = Object.fromEntries(
        Object.entries(target.files).map(([path, content]) => [
            `${base}/${path}`,
            content,
        ])
    );
    const manifestPath = `${base}/generation-manifest.json`;
    const modelPath = actionExecutionModelPath(target.actionId);
    Object.assign(
        files,
        await canonicalizeGeneratedFiles({
            [manifestPath]: JSON.stringify(target.manifest, null, 2) + '\n',
            [modelPath]: JSON.stringify(target.model, null, 2) + '\n',
        })
    );
    return {
        actionId: target.actionId,
        modelSha256: target.manifest.input.sha256,
        publication: {
            workspaceRoot: options.workspaceRoot ?? repositoryRoot,
            targetRoot: options.targetRoot,
            appName: options.appName,
            tool: ACTION_REQUEST_TOOL,
            files,
            inputs,
            // Régénération : fichiers identiques omis ; aucun fichier ancien
            // de cette commande ne peut rester sans être republié.
            omitUnchanged: true,
            coveredPrefix: `${base}/`,
        },
    };
}

export async function planExternalActionRequest(options) {
    const rendered = await renderExternalActionRequest(options);
    const plan = await planApplicationPublication(rendered.publication);
    return {
        ...plan,
        action_id: rendered.actionId,
        model_sha256: rendered.modelSha256,
    };
}

export function publicExternalActionRequestPlan(plan) {
    return {
        ...publicApplicationPublicationPlan(plan),
        action_id: plan.action_id,
        model_sha256: plan.model_sha256,
    };
}

export async function publishExternalActionRequest(options, dependencies) {
    if (!/^[a-f0-9]{64}$/.test(options.expectedPlanId ?? ''))
        externalFailure('publication requires a reviewed plan');
    const rendered = await renderExternalActionRequest(options);
    const result = await publishApplicationPublication(
        { ...rendered.publication, expectedPlanId: options.expectedPlanId },
        dependencies
    );
    return { ...result, action_id: rendered.actionId };
}
