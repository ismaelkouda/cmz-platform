// CI de la PR #389 : une étape native en échec ne publie que des lignes
// `CMZ_DIAG=` de forme fermée, jamais la sortie brute, un jeton ou une ligne
// d'environnement.
import assert from 'node:assert/strict';
import test from 'node:test';

import {
    diagnosticLines,
    record,
} from './proof-support/external-application-runtime.mjs';

// Faux jeton construit à l'exécution : aucun secret n'est écrit en clair.
const FAKE_TOKEN = ['ghp', '_', 'A1b2C3d4E5f6G7h8I9j0'].join('');

test('seules les lignes CMZ_DIAG de forme fermée sont gardées', () => {
    const output = [
        'CMZ_DIAG=stage:heading',
        'CMZ_DIAG=error:TimeoutError: locator.waitFor: Timeout 30000ms exceeded.',
        'CMZ_DIAG=http:200 /main-ABC123.js',
        'CMZ_DIAG=http:299 /connexion',
        'CMZ_DIAG=csp:require-trusted-types-for=2',
        'CMZ_DIAG=console:Refused to load http://127.0.0.1:41234/x.png from /workspace/dist/app',
        'raw line from the child',
        `CMZ_DIAG=error:leaked ${FAKE_TOKEN}`,
        'CMZ_DIAG=console:CI_SECRET=value',
        'CMZ_DIAG=env:HOME=/cmz-home',
        'CMZ_DIAG=http:200 /x?token=abc',
        'CMZ_DIAG=stage:Heading',
        'CMZ_DIAG=console:Bearer abcdef',
        `CMZ_DIAG=console:${'a'.repeat(40)}`,
        `GITHUB_TOKEN=${FAKE_TOKEN}`,
    ].join('\n');
    assert.deepEqual(diagnosticLines(output), [
        'CMZ_DIAG=stage:heading',
        'CMZ_DIAG=error:TimeoutError: locator.waitFor: Timeout 30000ms exceeded.',
        'CMZ_DIAG=http:200 /main-ABC123.js',
        'CMZ_DIAG=http:299 /connexion',
        'CMZ_DIAG=csp:require-trusted-types-for=2',
        'CMZ_DIAG=console:Refused to load <origin>/x.png from <path>',
    ]);
    const many = Array.from(
        { length: 80 },
        (_, index) => `CMZ_DIAG=http:200 /f${index}.js`
    ).join('\n');
    assert.equal(diagnosticLines(many).length, 60);
});

test('record en échec publie le diagnostic filtré, jamais la sortie brute', () => {
    const session = { lines: [] };
    const stdout = [
        'CMZ_DIAG=stage:heading',
        `GITHUB_TOKEN=${FAKE_TOKEN}`,
        `CMZ_DIAG=error:token ${FAKE_TOKEN}`,
        'HOME=/Users/someone',
        'CMZ_DIAG=http:200 /index.html',
    ].join('\n');
    assert.throws(
        () =>
            record(session, 'X4/fictif/browser-realized-page', {
                status: 1,
                signal: null,
                stdout,
                stderr: 'stack /Users/someone/x.mjs:1',
            }),
        /Échec de la preuve X4\/fictif\/browser-realized-page/
    );
    assert.equal(
        session.lines[0],
        'FAIL X4/fictif/browser-realized-page exit=1'
    );
    assert.match(session.lines[1], /^diagnostic_sha256=[0-9a-f]{64}$/);
    assert.deepEqual(session.lines.slice(2), [
        'diagnostic X4/fictif/browser-realized-page CMZ_DIAG=stage:heading',
        'diagnostic X4/fictif/browser-realized-page CMZ_DIAG=http:200 /index.html',
    ]);
    const report = session.lines.join('\n');
    for (const leaked of [FAKE_TOKEN, 'GITHUB_TOKEN', '/Users/', 'HOME='])
        assert.equal(report.includes(leaked), false, leaked);
});

test('record en succès ne publie aucun diagnostic', () => {
    const session = { lines: [] };
    record(session, 'X4/fictif/ok', {
        status: 0,
        signal: null,
        stdout: 'CMZ_DIAG=stage:done\n',
        stderr: '',
    });
    assert.deepEqual(session.lines, ['PASS X4/fictif/ok exit=0']);
});
