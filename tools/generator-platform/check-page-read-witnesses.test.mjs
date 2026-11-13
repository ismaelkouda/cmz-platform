// X5 C5b, N5-navigateur : jugement des témoins d'une page à lectures, sur des
// rapports synthétiques. La mesure dans Chromium vient en C6.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
    READ_WITNESS_REPORT_VERSION,
    judgeReadWitnesses,
} from './check-page-read-witnesses.mjs';
import { EXTERNAL_QUERY_STATES } from './core/list-query-external-profile.mjs';

const VISIBLE = Object.freeze({
    display: 'block',
    visibility: 'visible',
    opacity: '1',
    font_size: '16px',
});
const READ_STATES = {
    online_access: 'online',
    reads: [
        {
            member: 'catalogue',
            states: Object.fromEntries(
                EXTERNAL_QUERY_STATES.map((state) => [state, null])
            ),
            bindings: [
                {
                    binding_id: 'catalogue-rows',
                    absent_access: 'catalogueRowsAbsent',
                },
            ],
        },
    ],
};
const branch = (text = 'shown') => ({ present: true, text, visible: VISIBLE });
const report = () => ({
    schema_version: READ_WITNESS_REPORT_VERSION,
    offline: branch('Network access is unavailable.'),
    reads: [
        {
            member: 'catalogue',
            observations: EXTERNAL_QUERY_STATES.map((state) => ({
                state,
                branch: branch(state),
                ...(state === 'success'
                    ? {
                          absent: [
                              {
                                  binding_id: 'catalogue-rows',
                                  count: 1,
                                  visible: VISIBLE,
                              },
                          ],
                      }
                    : {}),
            })),
        },
    ],
});
const observation = (value, state) =>
    value.reads[0].observations.find((item) => item.state === state);

test('N5-navigateur : un rapport complet et visible est accepté', () => {
    assert.deepEqual(judgeReadWitnesses(READ_STATES, report()), []);
});

test('N5-navigateur : état manquant, vide, inconnu ou invisible, refus nommés', () => {
    const cases = [
        [
            'état manquant',
            (value) =>
                value.reads[0].observations.splice(
                    EXTERNAL_QUERY_STATES.indexOf('empty'),
                    1
                ),
            /catalogue\.empty: no rendered branch/,
        ],
        [
            'branche absente',
            (value) => (observation(value, 'error').branch.present = false),
            /catalogue\.error: no rendered branch/,
        ],
        [
            'texte vide',
            (value) => (observation(value, 'loading').branch.text = '  '),
            /catalogue\.loading: empty branch text/,
        ],
        [
            'état inconnu',
            (value) =>
                value.reads[0].observations.push({
                    state: 'stale',
                    branch: branch(),
                }),
            /catalogue\.stale: unknown state/,
        ],
        [
            'lecture non déclarée',
            (value) => value.reads.push({ member: 'other', observations: [] }),
            /read other: not declared in read_states/,
        ],
        [
            'lecture sans témoin',
            (value) => (value.reads = []),
            /read catalogue: no witness/,
        ],
    ];
    for (const [property, value, message] of [
        ['display', 'none', /display: none/],
        ['visibility', 'hidden', /visibility: hidden/],
        ['visibility', 'collapse', /visibility: collapse/],
        ['opacity', '0', /opacity: 0/],
        ['font_size', '0px', /font-size: 0px/],
    ])
        cases.push([
            `${property} ${value}`,
            (entry) =>
                (observation(entry, 'empty').branch.visible = {
                    ...VISIBLE,
                    [property]: value,
                }),
            new RegExp(`catalogue\\.empty: ${message.source}`),
        ]);
    for (const [label, edit, message] of cases) {
        const value = report();
        edit(value);
        assert.match(
            judgeReadWitnesses(READ_STATES, value).join('\n'),
            message,
            label
        );
    }
});

test('N5-navigateur : hors ligne et texte d’absence, présents et visibles', () => {
    for (const [label, edit, message] of [
        [
            'hors ligne absent',
            (value) => delete value.offline,
            /offline \(online\): no rendered branch/,
        ],
        [
            'hors ligne masqué',
            (value) => (value.offline.visible = { ...VISIBLE, opacity: '0' }),
            /offline \(online\): opacity: 0/,
        ],
        [
            'texte d’absence non montré',
            (value) => (observation(value, 'success').absent[0].count = 0),
            /catalogue\.success\.catalogueRowsAbsent: absent text not shown/,
        ],
        [
            'texte d’absence masqué',
            (value) =>
                (observation(value, 'success').absent[0].visible = {
                    ...VISIBLE,
                    display: 'none',
                }),
            /catalogue\.success\.catalogueRowsAbsent: display: none/,
        ],
        [
            'version du rapport',
            (value) => (value.schema_version = '0.9.0'),
            /report: schema_version must be 1\.0\.0/,
        ],
    ]) {
        const value = report();
        edit(value);
        assert.match(
            judgeReadWitnesses(READ_STATES, value).join('\n'),
            message,
            label
        );
    }
});

test('N5-navigateur : la ligne de commande rend 0 si conforme, 1 sinon, 2 si mal appelée', async (t) => {
    const root = await mkdtemp(join(tmpdir(), 'cmz-read-witnesses-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    const script = fileURLToPath(
        new URL('./check-page-read-witnesses.mjs', import.meta.url)
    );
    const workOrder = join(root, 'work-order.json');
    await writeFile(workOrder, JSON.stringify({ read_states: READ_STATES }));
    const run = async (value) => {
        const path = join(root, 'report.json');
        await writeFile(path, JSON.stringify(value));
        return spawnSync(
            process.execPath,
            [script, '--work-order', workOrder, '--report', path],
            { encoding: 'utf8' }
        );
    };
    assert.equal((await run(report())).status, 0);
    const broken = report();
    broken.offline.present = false;
    const failed = await run(broken);
    assert.equal(failed.status, 1);
    assert.match(failed.stderr, /FAIL offline/);
    assert.equal(
        spawnSync(process.execPath, [script], { encoding: 'utf8' }).status,
        2
    );
});
