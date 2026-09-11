import assert from 'node:assert/strict';
import test from 'node:test';

import {
    cartesianProduct,
    declaredContexts,
    diffContexts,
    expandMatrix,
    expectedContexts,
    isReportOnly,
    jobContexts,
    renderName,
} from './check-branch-protection-contexts.mjs';

test('cartesianProduct combine tous les axes', () => {
    assert.deepEqual(
        cartesianProduct({ os: ['linux', 'mac'], node: ['20', '22'] }),
        [
            { os: 'linux', node: '20' },
            { os: 'linux', node: '22' },
            { os: 'mac', node: '20' },
            { os: 'mac', node: '22' },
        ]
    );
});

test('expandMatrix déplie une matrice `include` seule', () => {
    assert.deepEqual(
        expandMatrix({
            include: [
                { profile: 'linux-ext4', runner: 'ubuntu-24.04' },
                { profile: 'macos-apfs', runner: 'macos-14' },
            ],
        }),
        [
            { profile: 'linux-ext4', runner: 'ubuntu-24.04' },
            { profile: 'macos-apfs', runner: 'macos-14' },
        ]
    );
});

test('expandMatrix applique exclude puis include sur des axes', () => {
    assert.deepEqual(
        expandMatrix({
            os: ['linux', 'mac'],
            node: ['20', '22'],
            exclude: [{ os: 'mac', node: '20' }],
            include: [{ os: 'linux', node: '22', extra: 'coverage' }],
        }),
        [
            { os: 'linux', node: '20' },
            { os: 'linux', node: '22', extra: 'coverage' },
            { os: 'mac', node: '22' },
        ]
    );
});

test('renderName substitue les jetons matrix et signale les non résolus', () => {
    assert.equal(
        renderName('Publication durability (${{ matrix.profile }})', {
            profile: 'linux-ext4',
        }),
        'Publication durability (linux-ext4)'
    );
    assert.throws(
        () => renderName('X (${{ matrix.missing }})', { profile: 'y' }),
        /non résolu/
    );
});

test('jobContexts : job simple, job matrice templatée, job matrice non templatée', () => {
    assert.deepEqual(
        jobContexts('secrets', { name: 'Secret scan (gitleaks)' }),
        ['Secret scan (gitleaks)']
    );
    assert.deepEqual(
        jobContexts('pub', {
            name: 'Publication durability (${{ matrix.profile }})',
            strategy: {
                matrix: { include: [{ profile: 'a' }, { profile: 'b' }] },
            },
        }),
        ['Publication durability (a)', 'Publication durability (b)']
    );
    assert.deepEqual(
        jobContexts('build', {
            name: 'Build',
            strategy: { matrix: { node: ['20', '22'] } },
        }),
        ['Build (20)', 'Build (22)']
    );
});

test('jobContexts retombe sur la clé de job sans `name`', () => {
    assert.deepEqual(jobContexts('lint', {}), ['lint']);
});

test('isReportOnly : continue-on-error job + allowlist step-level', () => {
    assert.equal(isReportOnly('x', { 'continue-on-error': true }), true);
    assert.equal(isReportOnly('sast', {}), true);
    assert.equal(isReportOnly('oracle', {}), false);
});

test('expectedContexts exige un déclencheur PR vers main', () => {
    assert.throws(
        () =>
            expectedContexts(
                'on:\n  push:\n    branches: [main]\njobs:\n  a:\n    name: A\n',
                'sansPR.yml'
            ),
        /pull_request` vers `main`/
    );
});

test('expectedContexts exclut les jobs rapport-seul, garde les autres', () => {
    const yml = `
on:
  pull_request:
    branches: [main]
jobs:
  guardrails:
    name: Garde-fous socle
    steps: []
  sast:
    name: SAST (Semgrep, rapport seul)
    steps: []
  bundle:
    name: Bundle info
    continue-on-error: true
    steps: []
  pub:
    name: Publication durability (\${{ matrix.profile }})
    strategy:
      matrix:
        include:
          - profile: linux-ext4
          - profile: macos-apfs
    steps: []
`;
    assert.deepEqual(
        [...expectedContexts(yml, 'test.yml')].sort(),
        [
            'Garde-fous socle',
            'Publication durability (linux-ext4)',
            'Publication durability (macos-apfs)',
        ].sort()
    );
});

test('expectedContexts refuse une allowlist référençant un job absent', () => {
    // `sast` est dans STEP_LEVEL_REPORT_ONLY : un workflow sans ce job doit lever.
    assert.throws(
        () =>
            expectedContexts(
                'on:\n  pull_request:\n    branches: [main]\njobs:\n  a:\n    name: A\n',
                'test.yml'
            ),
        /STEP_LEVEL_REPORT_ONLY référence des jobs absents/
    );
});

test('declaredContexts lit la liste, rejette une forme invalide', () => {
    assert.deepEqual(
        declaredContexts(
            '{"required_status_checks":{"contexts":["A","B"]}}',
            't'
        ),
        ['A', 'B']
    );
    assert.throws(
        () => declaredContexts('{"required_status_checks":{}}', 't'),
        /absent ou non-liste/
    );
});

test('diffContexts remonte missing / stale / duplicates', () => {
    assert.deepEqual(
        diffContexts(new Set(['A', 'B', 'C']), ['B', 'C', 'C', 'D']),
        { missing: ['A'], stale: ['D'], duplicates: ['C'] }
    );
});

test('cohérence réelle : ci.yml ↔ branch-protection.main.json', async () => {
    const { readFileSync } = await import('node:fs');
    const { join, dirname } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const root = join(dirname(fileURLToPath(import.meta.url)), '..');

    const expected = expectedContexts(
        readFileSync(join(root, '.github/workflows/ci.yml'), 'utf8')
    );
    const declared = declaredContexts(
        readFileSync(join(root, '.github/branch-protection.main.json'), 'utf8')
    );
    assert.deepEqual(diffContexts(expected, declared), {
        missing: [],
        stale: [],
        duplicates: [],
    });
});
