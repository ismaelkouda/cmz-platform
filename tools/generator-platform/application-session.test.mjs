import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import test from 'node:test';
import {
    assertArtifactPlan,
    bindRenderedArtifacts,
    buildArtifactPlan,
} from './core/artifact-plan.mjs';
import { compilePageExecutionPlan } from './core/page-execution-plan.mjs';
import { computeAngularPageCompositionTarget } from './page-composition-targets.mjs';
import { assertListQueryV2RendererModel } from './renderers/list-query-v2-renderer-shared.mjs';
import {
    validateApplicationDesign,
    validateApplicationDesignWithDependencies,
} from './core/application-design.mjs';
import {
    actionGraphTypeAtPointer,
    projectActionResultGraph,
} from './core/action-request-result-graph.mjs';
import {
    canonicalSessionPath,
    resolveApplicationSession,
} from './core/application-design-session.mjs';
import {
    createApplicationSessionFixture,
    SESSION_FIXTURE_DOMAINS,
} from './test-support/application-session-fixture.mjs';

for (const domain of SESSION_FIXTURE_DOMAINS) {
    test(`session déclarative fermée et traçable : ${domain}`, async (t) => {
        const fixture = await createApplicationSessionFixture({ domain });
        t.after(() => rm(fixture.root, { recursive: true, force: true }));
        const { design, schemas, contracts, contract } = fixture;
        const query = fixture.queryModel.queries[0];
        assert.deepEqual(query.transport.envelope, {
            kind: 'object',
            error_field: fixture.names.error,
            message_field: fixture.names.message,
            data_field: 'data',
        });
        assert.equal(
            query.wire_model.fields.find((field) => field.name === 'id').type
                .name,
            'string'
        );
        // X5 C2 : une lecture de session est au profil extérieur ; seul le
        // rendu qui déclare ce profil l'accepte.
        const external = { page: true, queryParameters: true, external: true };
        assert.equal(
            assertListQueryV2RendererModel(
                fixture.queryModel,
                'angular',
                external
            ),
            query
        );
        assert.throws(
            () =>
                assertListQueryV2RendererModel(fixture.queryModel, 'angular', {
                    page: true,
                    queryParameters: true,
                }),
            /uses the external profile without its renderer/
        );
        const withoutEnvelope = structuredClone(fixture.queryModel);
        withoutEnvelope.queries[0].transport.envelope = { kind: 'none' };
        assert.throws(
            () => assertListQueryV2RendererModel(withoutEnvelope, 'angular'),
            /requires the proven JSON object envelope/
        );
        const unsupportedWire = structuredClone(fixture.queryModel);
        unsupportedWire.queries[0].wire_model.fields.find(
            (field) => field.name === 'id'
        ).type.name = 'uuid';
        assert.throws(
            () =>
                assertListQueryV2RendererModel(
                    unsupportedWire,
                    'angular',
                    external
                ),
            /unsupported wire primitive primitive:uuid/
        );
        assert.deepEqual(
            validateApplicationDesign(
                design,
                schemas['application-design'],
                contracts
            ),
            []
        );
        assert.deepEqual(
            await validateApplicationDesignWithDependencies({
                design,
                applicationDesignSchema: schemas['application-design'],
                backendContractSchema: schemas['backend-contract'],
                workspaceRoot: fixture.root,
            }),
            []
        );
        assert.equal(fixture.networkVerified, false);
        assert.ok(
            contract.sources.every((entry) => entry.status === 'planned')
        );
        assert.ok(design.pages.every((entry) => entry.id.startsWith('page_')));
        const resolved = resolveApplicationSession(
            design,
            design.experiences[0],
            contracts
        );
        assert.ok(resolved);
        const session = design.experiences[0].session;
        const mutations = [
            (value) => {
                value.storage = 'local';
            },
            (value) => {
                value.projection.token_pointer = '/unresolved';
            },
            (value) => {
                value.projection.token_pointer = '/toString';
            },
            (value) => {
                value.projection.subject_pointer =
                    value.projection.token_pointer;
            },
            (value) => {
                value.stages[0].predicate.operator =
                    value.stages[0].predicate.operator === 'is-true'
                        ? 'is-null'
                        : 'is-true';
            },
            (value) => {
                value.stages[0].predicate.pointer = '/unresolved';
            },
            (value) => {
                value.stages[0].completion.producer.response_status = 401;
            },
            (value) => {
                value.stages[1].completion.result_condition.pointer = '/absent';
            },
            (value) => {
                value.protected_operations[0].path = '/invented';
            },
            (value) => {
                value.protected_operations.pop();
            },
            (value) => {
                value.permissions_from_role = true;
            },
        ];
        for (const mutate of mutations) {
            const changed = structuredClone(design);
            mutate(changed.experiences[0].session);
            assert.notDeepEqual(
                validateApplicationDesign(
                    changed,
                    schemas['application-design'],
                    contracts
                ),
                []
            );
        }
        assert.deepEqual(design.experiences[0].session, session);
        const graph = projectActionResultGraph(contract.models, [
            session.producer.result_model_id,
        ]);
        const token = actionGraphTypeAtPointer(
            graph,
            session.producer.result_model_id,
            session.projection.token_pointer
        );
        assert.equal(token.type.name, 'string');
        assert.throws(() =>
            actionGraphTypeAtPointer(
                graph,
                session.producer.result_model_id,
                '/~2'
            )
        );
        const old = structuredClone(design);
        old.schema_version = '1.0.0';
        assert.notDeepEqual(
            validateApplicationDesign(
                old,
                schemas['application-design'],
                contracts
            ),
            []
        );
    });
}

for (const domain of SESSION_FIXTURE_DOMAINS) {
    test(`artefacts de page dérivés des éléments déclarés : ${domain}`, async (t) => {
        const fixture = await createApplicationSessionFixture({ domain });
        t.after(() => rm(fixture.root, { recursive: true, force: true }));
        const pages = [...fixture.pages.values()];
        const common = [
            'domain-model',
            'response-decoder',
            'integration-client',
            'execution-controller',
            'runtime-binding',
            'public-api',
        ];
        for (const path of ['/catalogue', '/agree', '/enter']) {
            const { plan } = pages.find(({ page }) => page.path === path);
            const command = path !== '/catalogue';
            assert.equal(plan.query_nodes.length, command ? 0 : 1);
            assert.equal(plan.command_nodes.length, command ? 1 : 0);
            const artifactPlan = buildArtifactPlan(plan, 'page-execution-plan');
            const expected = [
                ...common,
                ...(command ? ['input-validator'] : []),
            ].sort();
            assert.deepEqual(
                artifactPlan.artifacts.map(({ id }) => id).sort(),
                expected
            );
            assertArtifactPlan(artifactPlan, plan, 'page-execution-plan');
            for (const artifact of artifactPlan.artifacts)
                for (const dependency of artifact.depends_on)
                    assert.ok(expected.includes(dependency));
            if (command) {
                const incomplete = structuredClone(artifactPlan);
                incomplete.artifacts = incomplete.artifacts.filter(
                    ({ id }) => id !== 'input-validator'
                );
                assert.throws(
                    () =>
                        assertArtifactPlan(
                            incomplete,
                            plan,
                            'page-execution-plan'
                        ),
                    /responsibilities mismatch/
                );
            }
            if (path === '/enter') continue;
            if (command)
                assert.equal(
                    fixture.actions.get(`${domain}-agree`).model.actions[0].port
                        .input.kind,
                    'none'
                );
            const { angular } = await computeAngularPageCompositionTarget({
                plan,
                artifactRoot: fixture.root,
                hostBindings: fixture.hostBindings,
            });
            const bindings = Object.fromEntries(
                angular.artifacts.map(({ path, artifact_id: id }) => [path, id])
            );
            assert.deepEqual(
                bindRenderedArtifacts(artifactPlan, angular.files, bindings)
                    .artifacts,
                angular.artifacts
            );
            const missingId = command
                ? 'input-validator'
                : 'integration-client';
            const missingPaths = angular.artifacts
                .filter(({ artifact_id: id }) => id === missingId)
                .map(({ path }) => path);
            assert.ok(missingPaths.length > 0);
            const incompleteFiles = { ...angular.files };
            const incompleteBindings = { ...bindings };
            for (const path of missingPaths) {
                delete incompleteFiles[path];
                delete incompleteBindings[path];
            }
            assert.throws(
                () =>
                    bindRenderedArtifacts(
                        artifactPlan,
                        incompleteFiles,
                        incompleteBindings
                    ),
                new RegExp(`artifact plan: ${missingId}: not materialized`)
            );
        }
        const empty = pages.find(({ page }) => page.path === '/dashboard');
        assert.equal(empty.plan, null);
        assert.throws(
            () =>
                compilePageExecutionPlan({
                    pageContract: empty.artifact,
                    applicationDesignSchema:
                        fixture.schemas['application-design'],
                    pageExecutionPlanSchema:
                        fixture.schemas['page-execution-plan'],
                }),
            /a composed plan requires at least one query node and one command node/
        );
    });
}

test('chemins canoniques : aucun protocole, encodage, fragment ou traversée', () => {
    for (const path of ['/', '/catalogue', '/a-b/c_d'])
        assert.equal(canonicalSessionPath(path), path);
    for (const path of [
        '//host',
        'https://host/a',
        '/a?token=x',
        '/a#x',
        '/%61',
        '/a/../b',
        '/a\\b',
        '/a/',
        'javascript:x',
        '/' + 'x'.repeat(513),
    ])
        assert.equal(canonicalSessionPath(path), null);
});
