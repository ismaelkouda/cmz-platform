// Garde de l'oracle natif des specs de session (F-m14, B1–B3) : comparaison
// de l'attendu préparé avec les fichiers rapportés par Vitest, en littéral.
// Aucune exécution de l'oracle ici : rapports et provenances sont construits.
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
    REPORT_FILE,
    compareSessionSpecs,
    executedSessionSpecs,
    expectedSessionSpecs,
    main,
} from './check-session-native-specs.mjs';
import {
    sessionSpecLists,
    sessionSpecSources,
    specRoot,
} from './stack-session-specs.mjs';

const witness = 'branch-root-witness.spec.ts';
const textNative = async () => {
    const { prepare, config } = await sessionSpecSources();
    return sessionSpecLists(prepare, config).native;
};
const provenanceOf = (view, names) => ({
    include: names.map(
        (name) => `${view}/tools/generator-platform/${specRoot}/${name}`
    ),
    specHashes: Object.fromEntries(names.map((name) => [name, 'sha'])),
    report: REPORT_FILE,
});
const reportOf = (paths) => ({
    testResults: paths.map((name) => ({
        name,
        status: 'passed',
        assertionResults: [{ status: 'passed' }],
    })),
});

test('comparaison : exactement l attendu, aucun problème', () => {
    assert.deepEqual(
        compareSessionSpecs(
            ['/v/a.spec.ts', '/v/b.spec.ts'],
            ['/v/b.spec.ts', '/v/a.spec.ts']
        ),
        []
    );
});

test('comparaison : spec manquante, en trop, vide, en double', () => {
    assert.deepEqual(
        compareSessionSpecs(
            ['/v/a.spec.ts', `/v/${witness}`],
            ['/v/a.spec.ts']
        ),
        [`spec attendue non exécutée : ${witness}`]
    );
    assert.deepEqual(
        compareSessionSpecs(['/v/a.spec.ts'], ['/v/a.spec.ts', '/v/z.spec.ts']),
        ['spec exécutée hors de l attendu : /v/z.spec.ts']
    );
    assert.deepEqual(compareSessionSpecs(['/v/a.spec.ts'], []), [
        'aucune spec exécutée',
        'spec attendue non exécutée : a.spec.ts',
    ]);
    assert.deepEqual(compareSessionSpecs([], []), [
        'aucune spec attendue',
        'aucune spec exécutée',
    ]);
    assert.deepEqual(
        compareSessionSpecs(['/v/a.spec.ts'], ['/v/a.spec.ts', '/v/a.spec.ts']),
        ['spec exécutée en double']
    );
});

test('attendu : la provenance doit égaler la liste textuelle de sessionSpecs', async () => {
    const native = await textNative();
    assert.ok(native.includes(witness));
    const ok = provenanceOf('/v', native);
    assert.deepEqual(expectedSessionSpecs(ok, native), ok.include);
    // B3 : témoin retiré de sessionSpecs à l'exécution, après la déclaration.
    const b3 = provenanceOf(
        '/v',
        native.filter((name) => name !== witness)
    );
    assert.throws(
        () => expectedSessionSpecs(b3, native),
        /^Error: provenance : specs préparées \[.*\] différentes de sessionSpecs \[.*branch-root-witness\.spec\.ts.*\]$/
    );
    // B3 total : `sessionSpecs.length = 0`.
    assert.throws(
        () => expectedSessionSpecs(provenanceOf('/v', []), native),
        /^Error: provenance : aucune spec de session préparée$/
    );
    assert.throws(
        () => expectedSessionSpecs({}, native),
        /^Error: provenance : aucune spec de session préparée$/
    );
    assert.throws(
        () =>
            expectedSessionSpecs(
                { ...ok, specHashes: { [witness]: 'sha' } },
                native
            ),
        /^Error: provenance : include et specHashes diffèrent$/
    );
    assert.throws(
        () =>
            expectedSessionSpecs(
                { ...ok, include: [...ok.include, ok.include[0]] },
                native
            ),
        /^Error: provenance : spec préparée en double$/
    );
    assert.throws(
        () => expectedSessionSpecs({ ...ok, report: undefined }, native),
        /^Error: provenance : rapport attendu session-tests-report\.json$/
    );
});

test('rapport : testResults requis, chaque fichier porte au moins un test', () => {
    assert.deepEqual(executedSessionSpecs(reportOf(['/v/a.spec.ts'])), [
        '/v/a.spec.ts',
    ]);
    assert.throws(
        () => executedSessionSpecs({}),
        /^Error: rapport : testResults absent$/
    );
    assert.throws(
        () =>
            executedSessionSpecs({
                testResults: [{ name: `/v/${witness}`, assertionResults: [] }],
            }),
        /^Error: rapport : aucun test exécuté dans branch-root-witness\.spec\.ts$/
    );
});

test('main : --dry, puis rapport exact, puis témoin non exécuté (dossier construit)', async (t) => {
    const view = await mkdtemp(join(tmpdir(), 'session-native-'));
    t.after(() => rm(view, { recursive: true, force: true }));
    const native = await textNative();
    const provenance = provenanceOf(view, native);
    await writeFile(
        join(view, 'session-tests-provenance.json'),
        JSON.stringify(provenance)
    );
    const lines = [];
    t.mock.method(console, 'log', (line) => lines.push(line));
    await main(['--dry'], view);
    assert.equal(
        lines.at(-1),
        `attendu (${native.length}) : ${native.join(', ')}`
    );
    await assert.rejects(main([], view), /ENOENT/);
    await writeFile(
        join(view, REPORT_FILE),
        JSON.stringify(reportOf(provenance.include))
    );
    await main([], view);
    assert.equal(
        lines.at(-1),
        `✅ oracle natif : ${native.length} specs de session exécutées, exactement l'attendu.`
    );
    await writeFile(
        join(view, REPORT_FILE),
        JSON.stringify(
            reportOf(
                provenance.include.filter((path) => !path.endsWith(witness))
            )
        )
    );
    await assert.rejects(
        main([], view),
        new RegExp(
            `^Error: spec attendue non exécutée : ${witness.replaceAll('.', '\\.')}$`
        )
    );
    await assert.rejects(
        main(['--x'], view),
        /^Error: argument attendu : \[--dry\]$/
    );
});
