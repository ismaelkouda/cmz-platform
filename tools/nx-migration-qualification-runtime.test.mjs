import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
    existsSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    realpathSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { parse } from 'yaml';
import { nxWorkflowErrors } from './nx-migration-plan.mjs';

const workflow = () =>
    parse(
        readFileSync(
            new URL('../.github/workflows/nx-migrations.yml', import.meta.url),
            'utf8'
        )
    );

test('qualification : runtime candidat sélectionné après checkout et gardé avant install', () => {
    const steps = workflow().jobs.qualification.steps;
    const at = steps.findIndex((s) => s.uses?.startsWith('oven-sh/setup-bun@'));
    const checkout = steps.findIndex((s) => s.id === 'qualification-checkout');
    const prepare = steps.findIndex((s) => s.id === 'qualification-prepare');
    const path = '${{ runner.temp }}/nx-qualified-candidate';
    assert.ok(checkout < at && at + 2 === prepare);
    assert.deepEqual(steps[at].with, {
        'bun-version-file': path + '/package.json',
    });
    assert.equal(steps[at + 1]['working-directory'], path);
    assert.match(
        steps[checkout].run,
        /test "\$\(node --version\)" = "v\$\(cat \.nvmrc\)"/
    );
    assert.deepEqual(nxWorkflowErrors(workflow()), []);
    const mutations = [
        (s) => {
            const pair = s.splice(at, 2);
            s.splice(checkout, 0, ...pair);
        },
        (s) => {
            s[at].with['bun-version-file'] = 'package.json';
        },
        (s) => {
            delete s[at + 1]['working-directory'];
        },
        (s) => {
            s[at + 1].run = s[at + 1].run.replace(
                /^test .*node --version.*\n/m,
                ''
            );
        },
        (s) => {
            s[at + 1].run = s[at + 1].run.replace(
                /^test .*bun --version.*\n/m,
                ''
            );
        },
        (s) => {
            s.splice(at, 0, {
                run: 'bun install --frozen-lockfile --ignore-scripts',
            });
        },
        (s) => {
            s.splice(at, 0, structuredClone(s[at]));
        },
        (s) => {
            s[checkout].run = s[checkout].run.replace(
                /^test .*node --version.*\n/m,
                ''
            );
        },
    ];
    for (const mutate of mutations) {
        const w = workflow();
        mutate(w.jobs.qualification.steps);
        assert.ok(nxWorkflowErrors(w).length, String(mutate));
    }
    const neutral = workflow();
    neutral.jobs.qualification.steps[checkout].run +=
        '\n# Le candidat est extrait avant la sélection Bun.\n';
    assert.deepEqual(nxWorkflowErrors(neutral), []);
});

test('qualification : runtime candidat Bun ou Node erroné refuse avant frozen install', (t) => {
    const root = mkdtempSync(join(tmpdir(), 'nx-runtime-candidate-'));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    const trusted = join(root, 'trusted');
    const candidate = join(root, 'nx-qualified-candidate');
    const bin = join(root, 'bin');
    for (const dir of [trusted, candidate, bin]) mkdirSync(dir);
    for (const [dir, version] of [
        [trusted, '1.3.14'],
        [candidate, '1.4.4'],
    ]) {
        writeFileSync(
            join(dir, 'package.json'),
            JSON.stringify({ packageManager: 'bun@' + version })
        );
        writeFileSync(join(dir, '.nvmrc'), process.versions.node + '\n');
    }
    writeFileSync(
        join(bin, 'bun'),
        '#!/bin/sh\ncase "$1" in\n--version) printf "%s\\n" "$OBSERVED_BUN";;\ninstall) printf "%s\\n" "$PWD" > "$INSTALL_MARKER";;\n*) exit 99;;\nesac\n',
        { mode: 0o755 }
    );
    const steps = workflow().jobs.qualification.steps;
    const at = steps.findIndex((s) => s.uses?.startsWith('oven-sh/setup-bun@'));
    const assertion = steps[at + 1];
    const expand = (p) => p.replace('${{ runner.temp }}', root);
    const source = resolve(trusted, expand(steps[at].with['bun-version-file']));
    // resolve accepte aussi le chemin absolu sélectionné nativement.
    const selected = JSON.parse(readFileSync(source)).packageManager.slice(4);
    assert.equal(selected, '1.4.4', 'la sélection doit venir de S et non de W');
    const install = steps
        .find((s) => s.id === 'qualification-prepare')
        .run.split('\n')
        .find((line) => line.startsWith('bun install '));
    assert.equal(install, 'bun install --frozen-lockfile --ignore-scripts');
    for (const [bun, node, ok] of [
        ['1.3.14', process.versions.node, false],
        [selected, '99.0.0', false],
        [selected, process.versions.node, true],
    ]) {
        const marker = join(root, 'install');
        rmSync(marker, { force: true });
        writeFileSync(join(candidate, '.nvmrc'), node + '\n');
        const r = spawnSync(
            '/bin/bash',
            [
                '--noprofile',
                '--norc',
                '-e',
                '-o',
                'pipefail',
                '-c',
                assertion.run + '\n' + install + '\n',
            ],
            {
                cwd: assertion['working-directory']
                    ? expand(assertion['working-directory'])
                    : trusted,
                env: {
                    ...process.env,
                    PATH: bin + ':' + process.env.PATH,
                    OBSERVED_BUN: bun,
                    INSTALL_MARKER: marker,
                },
                encoding: 'utf8',
                timeout: 5000,
            }
        );
        assert.equal(r.error, undefined);
        assert.equal(r.status === 0, ok, r.stdout + r.stderr);
        assert.equal(
            existsSync(marker),
            ok,
            'installation interdite si un runtime diverge'
        );
        if (ok)
            assert.equal(
                realpathSync(readFileSync(marker, 'utf8').trim()),
                realpathSync(candidate)
            );
    }
});
