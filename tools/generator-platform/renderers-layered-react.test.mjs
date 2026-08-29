/**
 * renderers-layered-react.test.mjs — étape 2 (React) du chantier
 * « générateur en couches » (ADR-0003 §5d).
 *
 * Symétrique de renderers-layered.test.mjs (Angular) — mêmes garde-fous
 * exécutables, même philosophie (pas de comparaison texte à du code
 * manuel — un POC de conception, depuis retiré, n'a jamais été une
 * référence figée) :
 *   1. Le code généré compile réellement, avec résolution d'alias
 *      inter-package simulant @cmz/<domain>-react-<layer>.
 *   2. Boundary structurel : aucun fichier application n'importe
 *      directement le package data (ADR-0003 §4).
 *   3. Le plan d'artefacts (étape 1, champ `layer`) route chaque
 *      responsabilité vers exactement la couche attendue.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { compileActionRequestDefinition } from './core/action-request-authoring.mjs';
import { buildArtifactPlan } from './core/artifact-plan.mjs';
import { renderReactTypescriptLayered } from './renderers/react-typescript-layered-renderer.mjs';
import {
    assertNoApplicationToDataImport,
    typecheckLayeredTargets,
} from './renderers/typecheck-layered.mjs';
import { loadJson } from './validate-ir.mjs';

const root = new URL('./', import.meta.url);
const repositoryRoot = new URL('../../', root).pathname;

async function compileNewsletter() {
    const definitionUrl = new URL(
        'sources/newsletter-subscribe.definition.json',
        root
    );
    const definition = await loadJson(definitionUrl);
    return compileActionRequestDefinition(definition, {
        sourceUri:
            'tools/generator-platform/sources/newsletter-subscribe.definition.json',
        sourceSha256: 'a'.repeat(64),
    });
}

test('renderReactTypescriptLayered produces 3 packages that compile together and respect ADR-0003 §4', async () => {
    const compiled = await compileNewsletter();
    const plan = buildArtifactPlan(compiled.semantic, 'semantic-model');
    const profile = await loadJson(
        new URL('profiles/react-typescript-layered.profile.json', root)
    );
    const layered = renderReactTypescriptLayered(
        compiled.semantic,
        plan,
        profile
    );

    // 1. Chaque couche produit exactement les fichiers attendus.
    assert.deepEqual(Object.keys(layered.domain.files).sort(), [
        'package.json',
        'src/action-request-port.ts',
        'src/index.ts',
        'src/models.ts',
        'src/validation.ts',
        'tsconfig.json',
    ]);
    assert.deepEqual(Object.keys(layered.data.files).sort(), [
        'package.json',
        'src/action-request-client.ts',
        'src/index.ts',
        'tsconfig.json',
    ]);
    assert.deepEqual(Object.keys(layered.application.files).sort(), [
        'package.json',
        'src/after-success.extension.ts',
        'src/extension-contract.ts',
        'src/index.ts',
        'src/use-action-request-commands.ts',
        'tsconfig.json',
    ]);

    // 2. Boundary structurel — application ne dépend jamais de data.
    assertNoApplicationToDataImport(layered, '@cmz/newsletter-react-data');

    // 3. Compilation réelle des 3 packages ensemble, alias résolus.
    typecheckLayeredTargets(
        {
            domain: {
                packageName: '@cmz/newsletter-react-domain',
                files: layered.domain.files,
            },
            data: {
                packageName: '@cmz/newsletter-react-data',
                files: layered.data.files,
            },
            application: {
                packageName: '@cmz/newsletter-react-application',
                files: layered.application.files,
            },
        },
        'react-typescript-layered',
        repositoryRoot
    );
});

test('the artifact plan routes every React layered file to its declared layer', async () => {
    const compiled = await compileNewsletter();
    const plan = buildArtifactPlan(compiled.semantic, 'semantic-model');
    const profile = await loadJson(
        new URL('profiles/react-typescript-layered.profile.json', root)
    );
    const layered = renderReactTypescriptLayered(
        compiled.semantic,
        plan,
        profile
    );
    const layerById = new Map(
        plan.artifacts.map((artifact) => [artifact.id, artifact.layer])
    );
    for (const [layerName, { artifacts }] of Object.entries(layered)) {
        for (const { artifact_id: artifactId } of artifacts) {
            const declaredLayer = layerById.get(artifactId);
            assert.ok(
                declaredLayer === layerName || declaredLayer === 'per-layer',
                `${layerName}: ${artifactId} declares layer ${declaredLayer}, not usable here`
            );
        }
    }
});

test('Angular and React layered renderers agree on which responsibilities exist per layer', async () => {
    // Les deux stacks partagent le même artifact plan (même modèle
    // sémantique) — preuve que le split en couches n'est pas une
    // décision spécifique au framework, mais une propriété du plan lui
    // même (étape 1). Régression utile si un futur renderer layered
    // divergeait silencieusement sur le routage responsabilité -> couche.
    const { renderAngularNxLayered } =
        await import('./renderers/angular-nx-layered-renderer.mjs');
    const compiled = await compileNewsletter();
    const plan = buildArtifactPlan(compiled.semantic, 'semantic-model');
    const angularProfile = await loadJson(
        new URL('profiles/angular-nx-layered.profile.json', root)
    );
    const reactProfile = await loadJson(
        new URL('profiles/react-typescript-layered.profile.json', root)
    );
    const angularLayered = renderAngularNxLayered(
        compiled.semantic,
        plan,
        angularProfile
    );
    const reactLayered = renderReactTypescriptLayered(
        compiled.semantic,
        plan,
        reactProfile
    );
    for (const layerName of ['domain', 'data', 'application']) {
        const angularResponsibilities = new Set(
            angularLayered[layerName].artifacts.map((a) => a.artifact_id)
        );
        const reactResponsibilities = new Set(
            reactLayered[layerName].artifacts.map((a) => a.artifact_id)
        );
        assert.deepEqual(
            [...angularResponsibilities].sort(),
            [...reactResponsibilities].sort(),
            `${layerName}: Angular and React disagree on responsibilities`
        );
    }
});
