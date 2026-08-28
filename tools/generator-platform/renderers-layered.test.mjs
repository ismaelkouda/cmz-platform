/**
 * renderers-layered.test.mjs — étape 2 du chantier « générateur en couches »
 * (ADR-0003 §5d).
 *
 * Garde-fous exécutables pour renderAngularNxLayered — PAS une
 * comparaison texte au code écrit à la main (libs/newsletter-angular/) :
 * le code manuel a servi de POC pour concevoir le pattern port/token,
 * mais le générateur n'a pas vocation à imiter son formatage (les
 * fichiers du repo passent par Prettier/ESLint selon leur extension, le
 * générateur ne le fait délibérément jamais — voir core/
 * typecheck-generated.mjs, même absence de formatage sur la sortie
 * plate active). Les applications câblées dans le workspace sont des
 * bancs d'essai jetables ; ce qui doit être rigoureux, c'est le
 * générateur et ses garde-fous, pas un artefact de sortie figé.
 *
 * Preuve de correction recherchée, dans l'esprit déjà présent du reste
 * de ce générateur (action-request-runtime.test.mjs exécute le code
 * généré plutôt que de comparer du texte) :
 *   1. Le code généré compile réellement, avec résolution d'alias
 *      inter-package simulant @cmz/<domain>-angular-<layer> (preuve que
 *      le pattern port/token est câblé correctement, pas juste que
 *      chaque fichier compile isolément).
 *   2. Boundary structurel : aucun fichier application n'importe
 *      directement le package data (ADR-0003 §4).
 *   3. Le plan d'artefacts (étape 1, champ `layer`) route chaque
 *      responsabilité vers exactement la couche attendue.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { compileActionRequestDefinition } from './core/action-request-authoring.mjs';
import { buildArtifactPlan } from './core/artifact-plan.mjs';
import { renderAngularNxLayered } from './renderers/angular-nx-layered-renderer.mjs';
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

test('renderAngularNxLayered produces 3 packages that compile together and respect ADR-0003 §4', async () => {
    const compiled = await compileNewsletter();
    const plan = buildArtifactPlan(compiled.semantic, 'semantic-model');
    const profile = await loadJson(
        new URL('profiles/angular-nx-layered.profile.json', root)
    );
    const layered = renderAngularNxLayered(compiled.semantic, plan, profile);

    // 1. Chaque couche produit exactement les fichiers attendus.
    assert.deepEqual(Object.keys(layered.domain.files).sort(), [
        'project.json',
        'src/action-request-port.ts',
        'src/index.ts',
        'src/models.ts',
        'src/validation.ts',
        'tsconfig.json',
    ]);
    assert.deepEqual(Object.keys(layered.data.files).sort(), [
        'project.json',
        'src/action-request-client.ts',
        'src/index.ts',
        'tsconfig.json',
    ]);
    assert.deepEqual(Object.keys(layered.application.files).sort(), [
        'project.json',
        'src/action-request-commands.ts',
        'src/action-request-port.token.ts',
        'src/after-success.extension.ts',
        'src/extension-contract.ts',
        'src/index.ts',
        'tsconfig.json',
    ]);

    // 2. Boundary structurel — application ne dépend jamais de data.
    assertNoApplicationToDataImport(layered, '@cmz/newsletter-angular-data');

    // 3. Compilation réelle des 3 packages ensemble, alias résolus.
    typecheckLayeredTargets(
        {
            domain: {
                packageName: '@cmz/newsletter-angular-domain',
                files: layered.domain.files,
            },
            data: {
                packageName: '@cmz/newsletter-angular-data',
                files: layered.data.files,
            },
            application: {
                packageName: '@cmz/newsletter-angular-application',
                files: layered.application.files,
            },
        },
        'angular-nx-layered',
        repositoryRoot
    );
});

test('the artifact plan routes every layered file to its declared layer', async () => {
    const compiled = await compileNewsletter();
    const plan = buildArtifactPlan(compiled.semantic, 'semantic-model');
    const profile = await loadJson(
        new URL('profiles/angular-nx-layered.profile.json', root)
    );
    const layered = renderAngularNxLayered(compiled.semantic, plan, profile);
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

test('a boundary violation (application importing data) is rejected', () => {
    assert.throws(
        () =>
            assertNoApplicationToDataImport(
                {
                    application: {
                        files: {
                            'src/broken.ts':
                                "import { X } from '@cmz/newsletter-angular-data';",
                        },
                    },
                },
                '@cmz/newsletter-angular-data'
            ),
        /boundary violation/
    );
});
