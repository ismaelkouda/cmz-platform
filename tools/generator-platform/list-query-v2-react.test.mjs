import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import test from 'node:test';

import { computeReactListQueryV2Target } from './list-query-v2-targets.mjs';
import { renderReactListQueryV2 } from './renderers/react-list-query-v2-renderer.mjs';
import { repositoryRoot } from './validate-ir.mjs';

const activeTarget = await computeReactListQueryV2Target();
const publicTarget = await computeReactListQueryV2Target({
    definitionPath: resolve(
        repositoryRoot,
        'tools/generator-platform/fixtures/editorial-blocks.v2.definition.json'
    ),
});
const parameterizedTarget = await computeReactListQueryV2Target({
    definitionPath: resolve(
        repositoryRoot,
        'tools/generator-platform/fixtures/tasks-actions-processing-type.v2.definition.json'
    ),
});
const usersDefinitionPath = resolve(
    repositoryRoot,
    'tools/generator-platform/fixtures/users-list.v2.definition.json'
);
const usersTarget = await computeReactListQueryV2Target({
    definitionPath: usersDefinitionPath,
});

test('rend le cas actif React depuis le même modèle et sans runtime de données privé', () => {
    const client = activeTarget.files['src/list-site-groups.client.ts'];
    const hooks = activeTarget.files['src/use-list-site-groups.ts'];

    assert.match(client, /serviceId: 'settings-api'/);
    assert.match(client, /readonly mode: 'host'/);
    assert.match(client, /readonly signal: AbortSignal/);
    assert.match(client, /decodeListSiteGroupsResponse/);
    assert.match(hooks, /activeRequestRef\.current\?\.abort\(\)/);
    assert.match(hooks, /sequenceRef\.current !== requestId/);
    assert.match(hooks, /state: 'error'/);
    assert.doesNotMatch(client, /localStorage|sessionStorage|Authorization/);
});

test('transporte la politique publique sans laisser le renderer inventer un Bearer', () => {
    const client = publicTarget.files['src/list-home-block-infos.client.ts'];
    assert.match(client, /mode: 'omit'/);
    assert.match(client, /scope: 'public'/);
    assert.doesNotMatch(client, /backoffice-session-bearer|Authorization/);
});

test('rend le path paramétré et le tableau enum avec le décodeur partagé', () => {
    const client =
        parameterizedTarget.files['src/list-report-action-types.client.ts'];
    const decoder =
        parameterizedTarget.files['src/list-report-action-types.decoder.ts'];
    const hooks =
        parameterizedTarget.files['src/use-list-report-action-types.ts'];

    assert.match(client, /encodeURIComponent\(parameter0\)/);
    assert.match(client, /serviceId: 'report-api'/);
    assert.match(decoder, /\['mtn', 'orange', 'moov'\]/);
    assert.match(hooks, /inputRef\.current = input/);
    assert.match(hooks, /return execute\(input, 'reloading', true\)/);
});

test('la sortie React est déterministe et ne mute pas le modèle compilé', async () => {
    const before = structuredClone(activeTarget.model);
    const second = await computeReactListQueryV2Target();
    assert.deepEqual(second.files, activeTarget.files);
    assert.deepEqual(activeTarget.model, before);
});

test('refuse les mêmes capacités non prouvées que la cible Angular', () => {
    const objectArray = structuredClone(parameterizedTarget.model);
    objectArray.queries[0].wire_model.fields[2].type.items = {
        kind: 'model',
        model_id: 'invented',
    };
    assert.throws(
        () => renderReactListQueryV2(objectArray),
        /proven required enum string-array shape/
    );

    const repeatedPlaceholder = structuredClone(parameterizedTarget.model);
    repeatedPlaceholder.queries[0].transport.path =
        '/processing-actions/{id}/report-types/{id}';
    assert.throws(
        () => renderReactListQueryV2(repeatedPlaceholder),
        /proven single non-empty string path input/
    );

    const retry = structuredClone(activeTarget.model);
    retry.queries[0].controller.execution.retry = { mode: 'automatic' };
    assert.throws(
        () => renderReactListQueryV2(retry),
        /execution policy without a React oracle/
    );
});

test('rend la page C5 et ses query parameters sans convention backend', () => {
    const client = usersTarget.files['src/list-users.client.ts'];
    const hooks = usersTarget.files['src/use-list-users.ts'];
    const decoder = usersTarget.files['src/list-users.decoder.ts'];

    assert.match(
        client,
        /parameters\.push\(\['is_active', String\(parameter4\)\]\)/
    );
    assert.match(client, /encodeURIComponent\(value\)/);
    assert.match(client, /Promise<ListUsersPage>/);
    assert.match(hooks, /readonly page: ListUsersPage \| undefined/);
    assert.match(hooks, /items: snapshot\.page\?\.items \?\? \[\]/);
    assert.match(decoder, /currentPage: pageField0/);
});

test('refuse les variantes de page et query non couvertes par l’oracle React', () => {
    const invalidPage = structuredClone(usersTarget.model);
    invalidPage.queries[0].transport.result.page_fields.totalItems.type =
        'number';
    assert.throws(
        () => renderReactListQueryV2(invalidPage),
        /proven canonical page shape/
    );

    const duplicateParameter = structuredClone(usersTarget.model);
    duplicateParameter.queries[0].transport.parameters[1].name = 'page';
    assert.throws(
        () => renderReactListQueryV2(duplicateParameter),
        /typed query parameters with a runtime oracle/
    );

    const injectableConstraint = structuredClone(usersTarget.model);
    injectableConstraint.queries[0].port.input.fields[0].constraints.minimum =
        '1); throw new Error("injected")';
    injectableConstraint.queries[0].transport.parameters[0].constraints.minimum =
        '1); throw new Error("injected")';
    assert.throws(
        () => renderReactListQueryV2(injectableConstraint),
        /typed query parameters with a runtime oracle/
    );

    const duplicatePageField = structuredClone(usersTarget.model);
    duplicatePageField.queries[0].transport.result.page_fields.totalItems.source_field =
        'current_page';
    assert.throws(
        () => renderReactListQueryV2(duplicatePageField),
        /proven canonical page shape/
    );
});
