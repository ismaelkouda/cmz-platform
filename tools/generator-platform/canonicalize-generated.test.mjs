import assert from 'node:assert/strict';
import { test } from 'node:test';

import { canonicalizeGeneratedFiles } from './core/canonicalize-generated.mjs';

test('la canonicalisation converge vers un point fixe Prettier', async () => {
    const path = 'src/action-request-commands.ts';
    const source = `import type { CreateWidgetInput, WidgetCreationResult } from '@cmz/example-domain';
export function run(client: any, input: CreateWidgetInput): WidgetCreationResult {
    return client.createWidget(input).pipe(
        switchMap((result: WidgetCreationResult) => from(afterSuccess({ operationId: 'create-widget', output: result })).pipe(map(() => result)))
    );
}
`;
    const once = await canonicalizeGeneratedFiles({ [path]: source });
    const twice = await canonicalizeGeneratedFiles(once);
    assert.equal(once[path], twice[path]);
});
