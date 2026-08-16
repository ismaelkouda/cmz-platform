import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
    validateCoreVerbReferences,
    validateCoreVerbRegistry,
} from './validate-pattern-core.mjs';

const schema = JSON.parse(
    readFileSync(new URL('./pattern-core.schema.json', import.meta.url), 'utf8')
);

test('CORE_VERBS respecte son schéma et déclare tous ses placeholders', () => {
    assert.deepEqual(validateCoreVerbRegistry(schema), []);
});

test('un placeholder de template non déclaré est rejeté', () => {
    const mutated = structuredClone(schema);
    mutated.CORE_VERBS.collection.file_templates.ui.push(
        'libs/{MODULE}/ui/{missing-placeholder}.ts'
    );

    assert.ok(
        validateCoreVerbRegistry(mutated).some((error) =>
            error.includes('{missing-placeholder}')
        )
    );
});

test('un files_field absent du pattern est rejeté', () => {
    const pattern = {
        pattern: 'fixture',
        version: 0,
        composition: [
            {
                verb: 'collection',
                files_field: 'missing_files',
            },
        ],
    };

    assert.ok(
        validateCoreVerbReferences(schema, pattern).some((error) =>
            error.includes('missing_files')
        )
    );
});
