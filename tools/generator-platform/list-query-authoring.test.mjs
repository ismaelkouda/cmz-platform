import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { buildArtifactPlan } from './core/artifact-plan.mjs';
import {
    compileListQueryDefinition,
    validateListQueryDefinition,
} from './core/list-query-authoring.mjs';
import { renderAngularListQuery } from './renderers/angular-list-query-renderer.mjs';
import { renderReactListQuery } from './renderers/react-list-query-renderer.mjs';
import { assertListQueryRendererInput } from './renderers/list-query-shared.mjs';
import { typecheckGenerated } from './core/typecheck-generated.mjs';
import { repositoryRoot } from './validate-ir.mjs';

const root = new URL('./', import.meta.url);

/**
 * Payload réel transmis par l'utilisateur (2026-08-30) pour
 * `cms/home-block-infos/actives/pwa`, transcrit tel quel, pas inventé.
 * Sert de fixture de non-régression entre la définition et le contrat
 * réel : si le backend ajoute/retire/renomme un champ, ce test doit
 * détecter la dérive avant qu'un consommateur généré ne la découvre au
 * runtime.
 */
const REAL_PAYLOAD = {
    error: false,
    message: 'Successfully',
    data: [
        {
            id: 1,
            title: 'Connect My Zone : la première solution hybride pour réduire la fracture numérique',
            slug: 'connect-my-zone-la-premiere-solution-hybride-pour-reduire-la-fracture-numerique',
            resume: null,
            content:
                'Connect My Zone est une plateforme ivoirienne innovante...',
            type: 'image',
            image_url:
                'https://universal-service-minio-api.paas.imako.digital/cmz-docs/public/cms/home-block-infos/home-block-info-1.jpg',
            video_url: null,
            button_label: null,
            button_url: null,
            updated_at: '2026-06-11 17:18:57',
        },
        {
            id: 2,
            title: 'Une cartographie participative basée sur l’IA et les données RGPH',
            slug: 'une-cartographie-participative-basee-sur-lia-et-les-donnees-rgph',
            resume: null,
            content:
                'Connect My Zone intègre automatiquement les données officielles...',
            type: 'image',
            image_url:
                'https://universal-service-minio-api.paas.imako.digital/cmz-docs/public/cms/home-block-infos/home-block-info-2.jpg',
            video_url: null,
            button_label: null,
            button_url: null,
            updated_at: '2026-06-11 17:18:57',
        },
        {
            id: 3,
            title: 'Un écosystème complet pour moderniser le traitement des signalements',
            slug: 'un-ecosysteme-complet-pour-moderniser-le-traitement-des-signalements',
            resume: null,
            content: 'Grâce à un BackOffice puissant, l’ANSUT...',
            type: 'image',
            image_url:
                'https://universal-service-minio-api.paas.imako.digital/cmz-docs/public/cms/home-block-infos/home-block-info-3.jpg',
            video_url: null,
            button_label: null,
            button_url: null,
            updated_at: '2026-06-11 17:18:57',
        },
    ],
};

async function loadDefinition() {
    return JSON.parse(
        await readFile(
            new URL('sources/cmz-client-landing-home.definition.json', root),
            'utf8'
        )
    );
}

test('la définition réelle compile en un modèle sémantique query/list valide', async () => {
    const definition = await loadDefinition();
    validateListQueryDefinition(definition);
    const { semantic, evidence } = compileListQueryDefinition(definition, {
        sourceUri: 'sources/cmz-client-landing-home.definition.json',
        sourceSha256: 'a'.repeat(64),
    });
    const operation = semantic.operations[0];
    assert.equal(operation.kind, 'query');
    assert.equal(operation.output.kind, 'list');
    assert.equal(operation.output.items.name, 'home-block-info');
    assert.equal(operation.access.mode, 'public');
    const integration = semantic.integrations[0];
    assert.equal(integration.method, 'GET');
    assert.equal(integration.response_envelope, 'simple');
    assert.ok(evidence.sources[0].sha256.match(/^[a-f0-9]{64}$/));
});

test('le payload réel du backend a exactement les champs déclarés dans la définition — aucun manquant, aucun en trop', async () => {
    const definition = await loadDefinition();
    const declaredFields = new Set(
        definition.operations[0].item.fields.map((field) => field.name)
    );
    for (const item of REAL_PAYLOAD.data) {
        const realFields = new Set(Object.keys(item));
        assert.deepEqual(
            [...realFields].sort(),
            [...declaredFields].sort(),
            `item id=${item.id}: la définition et le payload réel ont divergé`
        );
    }
});

test('les deux renderers produisent un client réellement type-safe (angular + reactjs)', async () => {
    const definition = await loadDefinition();
    const { semantic } = compileListQueryDefinition(definition, {
        sourceUri: 'x',
        sourceSha256: 'a'.repeat(64),
    });
    const artifactPlan = buildArtifactPlan(semantic, 'list-query-model');
    const angularProfile = JSON.parse(
        await readFile(
            new URL('profiles/angular-nx.profile.json', root),
            'utf8'
        )
    );
    const reactProfile = JSON.parse(
        await readFile(
            new URL('profiles/react-typescript.profile.json', root),
            'utf8'
        )
    );
    const angularRendered = renderAngularListQuery(
        semantic,
        artifactPlan,
        angularProfile
    );
    const reactRendered = renderReactListQuery(
        semantic,
        artifactPlan,
        reactProfile
    );
    assert.match(
        angularRendered.files['src/list-query-client.ts'],
        /listHomeBlockInfos\(\): Observable<HomeBlockInfo\[\]>/
    );
    assert.match(
        reactRendered.files['src/list-query-client.ts'],
        /listHomeBlockInfos\(\): Promise<HomeBlockInfo\[\]>/
    );
    typecheckGenerated(
        angularRendered.files,
        angularProfile.id,
        repositoryRoot
    );
    typecheckGenerated(reactRendered.files, reactProfile.id, repositoryRoot);
});

test('une mutation de la forme réelle (champ retiré) change le modèle canonique', async () => {
    const definition = await loadDefinition();
    const mutated = structuredClone(definition);
    mutated.operations[0].item.fields =
        mutated.operations[0].item.fields.filter(
            (field) => field.name !== 'button_url'
        );
    const { semantic: original } = compileListQueryDefinition(definition, {
        sourceUri: 'x',
        sourceSha256: 'a'.repeat(64),
    });
    const { semantic: changed } = compileListQueryDefinition(mutated, {
        sourceUri: 'x',
        sourceSha256: 'a'.repeat(64),
    });
    assert.notDeepEqual(original, changed);
});

test('refuse un mode d’accès "authorized" — hors périmètre restreint (List simple)', () => {
    const semantic = {
        schema_version: '1.0.0',
        model_id: 'x-list-query-semantic',
        domain: { id: 'x', name: 'X', description: 'x' },
        types: [],
        operations: [
            {
                id: 'x',
                kind: 'query',
                description: 'x',
                input: {
                    kind: 'model',
                    name: 'list-query-no-input',
                    nullable: false,
                },
                output: {
                    kind: 'list',
                    nullable: false,
                    items: { kind: 'model', name: 'x', nullable: false },
                },
                access: { mode: 'authorized', evidence_refs: ['f'] },
                effects: [],
                integration_ref: 'integration.x',
                evidence_refs: ['f'],
            },
        ],
        constraints: [],
        integrations: [],
    };
    const profile = {
        id: 'angular-nx',
        output_root: 'libs/generated/{domain}-angular',
        package_name: 'generated-{domain}-angular',
    };
    assert.throws(
        () => assertListQueryRendererInput(semantic, profile, 'angular-nx'),
        /authorized.*out of scope/
    );
});
