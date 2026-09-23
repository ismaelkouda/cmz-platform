import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

import {
    cmzAngularListQueryHostBindings,
    computeAngularListQueryV2Target,
} from './list-query-v2-targets.mjs';
import { renderAngularListQueryV2 } from './renderers/angular-list-query-v2-renderer.mjs';
import { repositoryRoot } from './validate-ir.mjs';

const activeTarget = await computeAngularListQueryV2Target();
const publicTarget = await computeAngularListQueryV2Target({
    definitionPath: resolve(
        repositoryRoot,
        'tools/generator-platform/fixtures/editorial-blocks.v2.definition.json'
    ),
});
const parameterizedTarget = await computeAngularListQueryV2Target({
    definitionPath: resolve(
        repositoryRoot,
        'tools/generator-platform/fixtures/tasks-actions-processing-type.v2.definition.json'
    ),
});

function mutateActive(mutator) {
    const model = structuredClone(activeTarget.model);
    mutator(model.queries[0], model);
    return model;
}

test('rend le cas actif site-group de façon déterministe et sans runtime privé', async () => {
    const second = await computeAngularListQueryV2Target();

    assert.deepEqual(second.files, activeTarget.files);
    assert.deepEqual(Object.keys(activeTarget.files).sort(), [
        'src/index.ts',
        'src/list-site-groups.decoder.ts',
        'src/list-site-groups.facade.ts',
        'src/list-site-groups.source.ts',
        'src/models.ts',
    ]);

    const models = activeTarget.files['src/models.ts'];
    assert.match(models, /interface SiteGroupSelectWire/);
    assert.match(models, /interface SelectOption/);
    assert.match(models, /readonly description: string/);
    assert.doesNotMatch(
        models.match(/interface SelectOption[\s\S]*$/)?.[0] ?? '',
        /description/
    );

    const source = activeTarget.files['src/list-site-groups.source.ts'];
    assert.match(source, /createListQueryRequestContext/);
    assert.match(source, /inject\(SETTINGS_API_URL\)/);
    assert.match(source, /\.get<unknown>/);
    assert.doesNotMatch(source, /new HttpContextToken|Authorization|Bearer/);

    const facade = activeTarget.files['src/list-site-groups.facade.ts'];
    assert.match(facade, /extends ResourceFacade/);
    assert.match(facade, /context\.previousStatus !== 'idle'/);
    assert.match(facade, /readonly items/);
    assert.match(facade, /lastResolvedItems/);
    assert.doesNotMatch(facade, /readonly options\s*=/);
    assert.doesNotMatch(facade, /\.subscribe\(/);
});

test('traduit une query publique vers le token exact du host sans bearer généré', () => {
    const source = publicTarget.files['src/list-home-block-infos.source.ts'];

    assert.match(source, /authentication: \{\s*mode: 'omit'/);
    assert.doesNotMatch(source, /bearer|Authorization/i);
    assert.match(source, /createListQueryRequestContext/);
});

test('rend le cas actif paramétré et son tableau enum sans mécanisme parallèle', () => {
    const models = parameterizedTarget.files['src/models.ts'];
    assert.match(models, /interface ListReportActionTypesInput/);
    assert.match(models, /readonly reportUniqId: string/);
    assert.match(models, /readonly operators: readonly string\[\]/);

    const source =
        parameterizedTarget.files['src/list-report-action-types.source.ts'];
    assert.match(source, /inject\(REPORT_API_URL\)/);
    assert.match(source, /encodeURIComponent\(parameter0\)/);
    assert.match(source, /path\.replace\('\{id\}'/);
    assert.match(source, /parameter0\.length < 1/);
    assert.doesNotMatch(source, /Authorization|Bearer|new HttpContextToken/);

    const decoder =
        parameterizedTarget.files['src/list-report-action-types.decoder.ts'];
    assert.match(decoder, /Array\.isArray\(value\)/);
    assert.match(decoder, /\['mtn', 'orange', 'moov'\]/);
    assert.match(decoder, /\$\{path\}\[\$\{itemIndex\}\]/);

    const facade =
        parameterizedTarget.files['src/list-report-action-types.facade.ts'];
    assert.match(
        facade,
        /load\(input: ListReportActionTypesInput, options: LoadOptions = \{\}\)/
    );
    assert.match(facade, /this\.source\.readAll\(params\.input, isRefresh\)/);
});

test('refuse d’élargir le renderer aux tableaux d’objets ou à plusieurs paths', () => {
    const objectArray = structuredClone(parameterizedTarget.model);
    objectArray.queries[0].wire_model.fields[2].type.items = {
        kind: 'model',
        model_id: 'invented',
    };
    assert.throws(
        () =>
            renderAngularListQueryV2(
                objectArray,
                cmzAngularListQueryHostBindings
            ),
        /proven required enum string-array shape/
    );

    const twoPaths = structuredClone(parameterizedTarget.model);
    twoPaths.queries[0].port.input.fields.push(
        structuredClone(twoPaths.queries[0].port.input.fields[0])
    );
    twoPaths.queries[0].transport.parameters.push(
        structuredClone(twoPaths.queries[0].transport.parameters[0])
    );
    assert.throws(
        () =>
            renderAngularListQueryV2(twoPaths, cmzAngularListQueryHostBindings),
        /proven single non-empty string path input/
    );

    const repeatedPlaceholder = structuredClone(parameterizedTarget.model);
    repeatedPlaceholder.queries[0].transport.path =
        '/processing-actions/{id}/report-types/{id}';
    assert.throws(
        () =>
            renderAngularListQueryV2(
                repeatedPlaceholder,
                cmzAngularListQueryHostBindings
            ),
        /proven single non-empty string path input/
    );
});

test('échoue fermé sur les capacités Angular non encore prouvées', () => {
    assert.throws(
        () =>
            renderAngularListQueryV2(
                mutateActive((_query, model) => {
                    model.queries.push(structuredClone(model.queries[0]));
                }),
                cmzAngularListQueryHostBindings
            ),
        /requires exactly one query/
    );

    assert.throws(
        () =>
            renderAngularListQueryV2(
                mutateActive((query) => {
                    query.wire_model.fields[0].type.name = 'boolean';
                }),
                cmzAngularListQueryHostBindings
            ),
        /unsupported wire primitive primitive:boolean/
    );

    assert.throws(
        () =>
            renderAngularListQueryV2(
                mutateActive((query) => {
                    query.controller.execution.retry = {
                        mode: 'automatic',
                        max_attempts: 2,
                    };
                }),
                cmzAngularListQueryHostBindings
            ),
        /execution policy without an Angular oracle/
    );

    assert.throws(
        () =>
            renderAngularListQueryV2(
                mutateActive((query) => {
                    query.request_policy.authentication.schemes[0].kind =
                        'api-key';
                }),
                cmzAngularListQueryHostBindings
            ),
        /supports exactly one bearer scheme/
    );

    assert.throws(
        () =>
            renderAngularListQueryV2(
                mutateActive((query) => {
                    query.access.permissions = ['site-groups.read'];
                }),
                cmzAngularListQueryHostBindings
            ),
        /unsupported permission gate/
    );

    assert.throws(
        () =>
            renderAngularListQueryV2(
                mutateActive((query) => {
                    query.transport.envelope = { kind: 'none' };
                }),
                cmzAngularListQueryHostBindings
            ),
        /proven JSON object envelope/
    );
});

test('refuse les bindings host absents, ouverts ou injectables', () => {
    const missing = { services: {} };
    assert.throws(
        () => renderAngularListQueryV2(activeTarget.model, missing),
        /missing closed host binding for settings-api/
    );

    const openBinding = {
        services: {
            'settings-api': {
                module: '@cmz/core',
                token: 'SETTINGS_API_URL',
                fallback: 'invented',
            },
        },
    };
    assert.throws(
        () => renderAngularListQueryV2(activeTarget.model, openBinding),
        /missing closed host binding for settings-api/
    );

    const unsafe = {
        services: {
            'settings-api': {
                module: "@cmz/core'; throw new Error('injected') //",
                token: 'SETTINGS_API_URL',
            },
        },
    };
    assert.throws(
        () => renderAngularListQueryV2(activeTarget.model, unsafe),
        /unsafe host binding for settings-api/
    );
});

test('refuse une contrainte incompatible avec le primitive décodé', () => {
    const invalid = mutateActive((query) => {
        query.wire_model.fields[0].constraints = { minimum: 1 };
    });

    assert.throws(
        () =>
            renderAngularListQueryV2(invalid, cmzAngularListQueryHostBindings),
        /unsupported string constraint minimum/
    );
});

test('refuse une traversée backend avant toute lecture hors workspace', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'cmz-list-query-target-'));
    const definitionPath = join(directory, 'definition.json');
    const definition = structuredClone(activeTarget.definition);
    definition.backend_contract.uri = '../../../../../../etc/passwd';
    await writeFile(definitionPath, `${JSON.stringify(definition)}\n`);

    try {
        await assert.rejects(
            computeAngularListQueryV2Target({ definitionPath }),
            /backend contract uri must stay inside the workspace/
        );
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});
