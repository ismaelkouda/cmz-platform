import assert from 'node:assert/strict';
import { test } from 'node:test';

import { invocation } from './page-realization-oracle-runner.mjs';

for (const profile of ['angular-pwa', 'react-spa']) {
    test(`le test ${profile} délègue à la configuration native gouvernée`, () => {
        const command = invocation('test', 'demo-app', profile);

        assert.equal(command.script, 'node_modules/nx/dist/bin/nx.js');
        assert.deepEqual(command.argv, [
            'run',
            'demo-app:test',
            '--skipNxCache',
        ]);
    });
}

test('le runner refuse tout oracle hors de la liste fermée', () => {
    assert.throws(
        () => invocation('shell', 'demo-app', 'angular-pwa'),
        /non autorisé/
    );
});

test('sélectionne un compilateur fermé à partir du profil publié', () => {
    assert.equal(
        invocation('compile', 'demo-app', 'angular-pwa').script,
        'node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js'
    );
    assert.equal(
        invocation('compile', 'demo-app', 'react-spa').script,
        'node_modules/typescript/bin/tsc'
    );
    assert.throws(
        () => invocation('compile', 'demo-app', 'unknown'),
        /profil d'application invalide/
    );
});
