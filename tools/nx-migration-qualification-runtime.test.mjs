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

test('qualification : Node et Bun de S sont sélectionnés après checkout et gardés avant install', () => {
    const steps = workflow().jobs.qualification.steps;
    const path = '${{ runner.temp }}/nx-qualified-candidate';
    const checkout = steps.findIndex((s) => s.id === 'qualification-checkout');
    const input = steps.findIndex((s) => s.id === 'qualification-input');
    const prepare = steps.findIndex((s) => s.id === 'qualification-prepare');
    const nodes = steps.flatMap((s, i) =>
        s.uses?.startsWith('actions/setup-node@') ? [i] : []
    );
    const [trusted, node] = nodes;
    const bun = steps.findIndex((s) =>
        s.uses?.startsWith('oven-sh/setup-bun@')
    );
    assert.equal(nodes.length, 2);
    assert.equal(trusted + 2, input);
    assert.equal(checkout + 1, node);
    assert.equal(node + 2, bun);
    assert.equal(bun + 2, prepare);
    assert.deepEqual(steps[trusted].with, { 'node-version-file': '.nvmrc' });
    assert.deepEqual(steps[node].with, {
        'node-version-file': path + '/.nvmrc',
    });
    assert.deepEqual(steps[bun].with, {
        'bun-version-file': path + '/package.json',
    });
    for (const at of [node, bun])
        assert.equal(steps[at + 1]['working-directory'], path);
    assert.doesNotMatch(steps[checkout].run, /node --version/);
    assert.deepEqual(nxWorkflowErrors(workflow()), []);
    const mutations = [
        (s) => {
            const pair = s.splice(node, 2);
            s.splice(checkout, 0, ...pair);
        },
        (s) => {
            s[node].with['node-version-file'] = '.nvmrc';
        },
        (s) => {
            s[node].with['node-version-file'] = path + '/other';
        },
        (s) => {
            delete s[node + 1]['working-directory'];
        },
        (s) => {
            s[node + 1].run = 'true\n';
        },
        (s) => {
            s.splice(node, 0, structuredClone(s[node]));
        },
        (s) => {
            s.splice(trusted, 2);
        },
        (s) => {
            s[trusted].with['node-version-file'] = path + '/.nvmrc';
        },
        (s) => {
            s[checkout].run += 'test "$(node --version)" = "v$(cat .nvmrc)"\n';
        },
        (s) => {
            const pair = s.splice(bun, 2);
            s.splice(checkout, 0, ...pair);
        },
        (s) => {
            s[bun].with['bun-version-file'] = 'package.json';
        },
        (s) => {
            delete s[bun + 1]['working-directory'];
        },
        (s) => {
            s[bun + 1].run = s[bun + 1].run.replace(
                /^test .*node --version.*\n/m,
                ''
            );
        },
        (s) => {
            s[bun + 1].run = s[bun + 1].run.replace(
                /^test .*bun --version.*\n/m,
                ''
            );
        },
        (s) => {
            s.splice(node, 0, {
                run: 'bun install --frozen-lockfile --ignore-scripts',
            });
        },
        (s) => {
            s.splice(bun, 0, structuredClone(s[bun]));
        },
    ];
    for (const mutate of mutations) {
        const w = workflow();
        mutate(w.jobs.qualification.steps);
        assert.ok(nxWorkflowErrors(w).length, String(mutate));
    }
    const neutral = workflow();
    neutral.jobs.qualification.steps[checkout].run +=
        '\n# Le candidat est extrait avant la sélection des runtimes.\n';
    assert.deepEqual(nxWorkflowErrors(neutral), []);
});

test('qualification : W22/S26 sélectionne S et refuse un runtime erroné avant frozen install', (t) => {
    const root = mkdtempSync(join(tmpdir(), 'nx-runtime-candidate-'));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    const trusted = join(root, 'trusted');
    const candidate = join(root, 'nx-qualified-candidate');
    const bin = join(root, 'bin');
    for (const dir of [trusted, candidate, bin]) mkdirSync(dir);
    for (const [dir, node, bun] of [
        [trusted, '22.22.3', '1.3.14'],
        [candidate, '26.12.0', '1.4.4'],
    ]) {
        writeFileSync(
            join(dir, 'package.json'),
            JSON.stringify({ packageManager: 'bun@' + bun })
        );
        writeFileSync(join(dir, '.nvmrc'), node + '\n');
    }
    // L'action native n'est pas lancée par ce test local : ses chemins YAML
    // sont relus, puis les assertions shell réelles sont exercées par un
    // exécuteur de versions contrôlé. Ce test ne qualifie pas Node26.
    const quote = (s) => "'" + s.replaceAll("'", "'\\''") + "'";
    writeFileSync(
        join(bin, 'node'),
        '#!/bin/sh\ncase "$1" in\n--version) printf "v%s\n" "$OBSERVED_NODE";;\n-p) exec ' +
            quote(process.execPath) +
            ' "$@";;\n*) exit 98;;\nesac\n',
        { mode: 0o755 }
    );
    writeFileSync(
        join(bin, 'bun'),
        '#!/bin/sh\ncase "$1" in\n--version) printf "%s\n" "$OBSERVED_BUN";;\ninstall) printf "%s\n" "$PWD" > "$INSTALL_MARKER";;\n*) exit 99;;\nesac\n',
        { mode: 0o755 }
    );
    const steps = workflow().jobs.qualification.steps;
    const nodes = steps.flatMap((s, i) =>
        s.uses?.startsWith('actions/setup-node@') ? [i] : []
    );
    const bunAt = steps.findIndex((s) =>
        s.uses?.startsWith('oven-sh/setup-bun@')
    );
    const expand = (p) => p.replace('${{ runner.temp }}', root);
    assert.equal(
        readFileSync(
            resolve(trusted, steps[nodes[0]].with['node-version-file']),
            'utf8'
        ).trim(),
        '22.22.3'
    );
    const selectedNode = readFileSync(
        resolve(trusted, expand(steps[nodes[1]].with['node-version-file'])),
        'utf8'
    ).trim();
    const selectedBun = JSON.parse(
        readFileSync(
            resolve(trusted, expand(steps[bunAt].with['bun-version-file']))
        )
    ).packageManager.slice(4);
    assert.equal(selectedNode, '26.12.0');
    assert.equal(selectedBun, '1.4.4');
    const install = steps
        .find((s) => s.id === 'qualification-prepare')
        .run.split('\n')
        .find((line) => line.startsWith('bun install '));
    assert.equal(install, 'bun install --frozen-lockfile --ignore-scripts');
    for (const [node, bun, sourceNode, ok] of [
        ['22.22.3', selectedBun, selectedNode, false],
        [selectedNode, '1.3.14', selectedNode, false],
        [selectedNode, selectedBun, '99.0.0', false],
        [selectedNode, selectedBun, selectedNode, true],
    ]) {
        const marker = join(root, 'install');
        rmSync(marker, { force: true });
        writeFileSync(join(candidate, '.nvmrc'), sourceNode + '\n');
        const script =
            steps[nodes[1] + 1].run +
            '\n' +
            steps[bunAt + 1].run +
            '\n' +
            install +
            '\n';
        const result = spawnSync(
            '/bin/bash',
            ['--noprofile', '--norc', '-e', '-o', 'pipefail', '-c', script],
            {
                cwd: candidate,
                env: {
                    ...process.env,
                    PATH: bin + ':' + process.env.PATH,
                    OBSERVED_NODE: node,
                    OBSERVED_BUN: bun,
                    INSTALL_MARKER: marker,
                },
                encoding: 'utf8',
                timeout: 5000,
            }
        );
        assert.equal(result.error, undefined);
        assert.equal(result.status === 0, ok, result.stdout + result.stderr);
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
