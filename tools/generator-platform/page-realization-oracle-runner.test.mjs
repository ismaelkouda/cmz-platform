import assert from 'node:assert/strict';
import { test } from 'node:test';

import { invocation, main } from './page-realization-oracle-runner.mjs';

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

test('l’oracle lance Nx sans démon, même si l’environnement en demande un', (t) => {
    const previous = process.env.NX_DAEMON;
    process.env.NX_DAEMON = 'true';
    t.after(() => {
        if (previous === undefined) delete process.env.NX_DAEMON;
        else process.env.NX_DAEMON = previous;
    });
    const calls = [];
    main(
        ['--oracle', 'test', '--app', 'demo-app', '--profile', 'angular-pwa'],
        (command, argv, options) => {
            calls.push({ command, argv, options });
            return { status: 0, stdout: '', stderr: '' };
        }
    );
    assert.equal(calls.length, 1);
    assert.equal(calls[0].argv[0], 'node_modules/nx/dist/bin/nx.js');
    assert.equal(calls[0].options.env.NX_DAEMON, 'false');
    assert.equal(calls[0].options.env.PATH, process.env.PATH);
});
