import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';

import {
    compositionSha256,
    loadCompositionRegistry,
    validateCompositionRegistry,
} from './core/composition-registry.mjs';

const repository = new URL('../..', import.meta.url).pathname;

async function write(path, content) {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content);
}

function sha256(content) {
    return createHash('sha256').update(content).digest('hex');
}

async function fixture() {
    const root = await mkdtemp(join(tmpdir(), 'composition-registry-'));
    await write(
        join(root, 'tools/generator-platform/generate-probe.mjs'),
        'console.log("probe");\n'
    );
    for (const id of ['first-case', 'second-case'])
        await write(
            join(root, `sources/${id}.definition.json`),
            `${JSON.stringify({ schema_version: '2.0.0', kind: 'probe-kind', feature: { id } })}\n`
        );
    const isolatedOracle =
        "import test from 'node:test';\ntest('probe', () => {});\n";
    const composedOracle =
        "import { it } from 'vitest';\nit('probe', () => {});\n";
    await write(join(root, 'oracles/probe-angular.test.mjs'), isolatedOracle);
    await write(
        join(root, 'oracles/stack-tests/angular/composed.test.ts'),
        composedOracle
    );
    return {
        root,
        document: {
            schema_version: '2.0.0',
            compositions: [
                {
                    id: 'probe-kind-v2-angular-nx',
                    kind: 'probe-kind',
                    contract_version: '2.0.0',
                    maturity: 'proven',
                    target: 'angular-nx',
                    output_model: 'target-native',
                    generator_script:
                        'tools/generator-platform/generate-probe.mjs',
                    layers: [],
                    evidence: [
                        'sources/first-case.definition.json',
                        'sources/second-case.definition.json',
                    ],
                    oracles: [
                        {
                            path: 'oracles/probe-angular.test.mjs',
                            scope: 'isolated',
                            sha256: sha256(isolatedOracle),
                        },
                        {
                            path: 'oracles/stack-tests/angular/composed.test.ts',
                            scope: 'composed-page',
                            sha256: sha256(composedOracle),
                        },
                    ],
                },
            ],
        },
    };
}

test('le registre réel est fermé, trié et fondé sur des preuves relisibles', () => {
    const registry = loadCompositionRegistry(repository);
    assert.deepEqual(
        registry.entries.map(({ id }) => id),
        [
            'action-request-v1-angular-layered',
            'action-request-v2-angular-nx',
            'action-request-v2-react-typescript',
            'list-query-v1-angular-layered',
            'list-query-v2-angular-nx',
            'list-query-v2-react-typescript',
        ]
    );
    for (const kind of ['action-request', 'list-query']) {
        assert.equal(registry.byKind[kind].maturity, 'experimental');
        assert.equal(registry.byKind[kind].target, 'angular-layered');
        assert.equal(
            Object.hasOwn(registry.byKind[kind], 'contractVersion'),
            false,
            'create-module must keep its resumable v1 state shape'
        );
        assert.equal(
            registry.byId[`${kind}-v1-angular-layered`].contractVersion,
            '1.0.0'
        );
        assert.match(
            registry.byKind[kind].maturityNote,
            /Frozen v1 angular-layered path/
        );
        assert.equal(registry.resumeCompatibleSha256ByKind[kind].length, 1);
        assert.notEqual(
            registry.resumeCompatibleSha256ByKind[kind][0],
            compositionSha256(registry.byKind[kind])
        );
        for (const target of ['angular-nx', 'react-typescript']) {
            const promoted = registry.byCoordinates[`${kind}@2.0.0:${target}`];
            assert.equal(promoted.maturity, 'proven');
            assert.equal(promoted.outputModel, 'target-native');
            assert.deepEqual(
                new Set(promoted.oracles.map(({ scope }) => scope)),
                new Set(['isolated', 'composed-page'])
            );
        }
    }
    assert.match(
        compositionSha256(registry.byKind['action-request']),
        /^[a-f0-9]{64}$/
    );
});

test('une composition expérimentale exige une limite de maturité explicite', async () => {
    const { root, document } = await fixture();
    document.compositions[0].maturity = 'experimental';
    assert.throws(
        () => validateCompositionRegistry(root, document),
        /must contain exactly.*maturity_note/
    );
    document.compositions[0].maturity_note = '   ';
    document.compositions[0].resume_compatible_sha256 = [];
    assert.throws(
        () => validateCompositionRegistry(root, document),
        /must explain the experimental limit/
    );
});

test('une composition prouvée exige deux cas métier distincts', async () => {
    const { root, document } = await fixture();
    document.compositions[0].evidence.pop();
    assert.throws(
        () => validateCompositionRegistry(root, document),
        /requires 2 distinct case/
    );
});

test('une composition prouvée exige les oracles cible isolé et composé', async () => {
    const { root, document } = await fixture();
    document.compositions[0].oracles.pop();
    assert.throws(
        () => validateCompositionRegistry(root, document),
        /proven requires isolated and composed-page target oracles/
    );
});

test('un oracle d’une autre cible ne peut pas prouver la maturité', async () => {
    const { root, document } = await fixture();
    document.compositions[0].oracles[0].path = 'oracles/probe-react.test.mjs';
    const content = "import test from 'node:test';\ntest('probe', () => {});\n";
    await write(join(root, 'oracles/probe-react.test.mjs'), content);
    document.compositions[0].oracles[0].sha256 = sha256(content);
    assert.throws(
        () => validateCompositionRegistry(root, document),
        /does not belong to target angular-nx/
    );
});

test('un oracle vide ou modifié après revue ne prouve rien', async () => {
    const { root, document } = await fixture();
    const oracle = document.compositions[0].oracles[0];
    await write(join(root, oracle.path), 'export {};\n');
    assert.throws(
        () => validateCompositionRegistry(root, document),
        /sha256 does not match/
    );
    oracle.sha256 = sha256('export {};\n');
    assert.throws(
        () => validateCompositionRegistry(root, document),
        /contains no executable test declaration/
    );
});

test('une preuve de nature différente est rejetée', async () => {
    const { root, document } = await fixture();
    await write(
        join(root, 'sources/second-case.definition.json'),
        `${JSON.stringify({ schema_version: '2.0.0', kind: 'other-kind', feature: { id: 'second-case' } })}\n`
    );
    assert.throws(
        () => validateCompositionRegistry(root, document),
        /does not prove kind probe-kind/
    );
});

test('une preuve issue d’une autre version de contrat est rejetée', async () => {
    const { root, document } = await fixture();
    const path = join(root, 'sources/second-case.definition.json');
    await write(
        path,
        `${JSON.stringify({ schema_version: '1.0.0', kind: 'probe-kind', feature: { id: 'second-case' } })}\n`
    );
    assert.throws(
        () => validateCompositionRegistry(root, document),
        /uses contract 1.0.0 instead of 2.0.0/
    );
});

test('les clés inconnues et l’ordre de couches non canonique échouent fermé', async () => {
    const { root, document } = await fixture();
    document.compositions[0].surprise = true;
    assert.throws(
        () => validateCompositionRegistry(root, document),
        /must contain exactly/
    );
    delete document.compositions[0].surprise;
    document.compositions[0].output_model = 'layered';
    assert.throws(
        () => validateCompositionRegistry(root, document),
        /output_model is incompatible with its target/
    );
});

test('une sortie target-native ne peut pas réintroduire les couches legacy', async () => {
    const { root, document } = await fixture();
    document.compositions[0].layers = ['domain', 'data'];
    assert.throws(
        () => validateCompositionRegistry(root, document),
        /target-native output must not declare legacy layers/
    );
});

test('identité, coordonnées et ordre sont uniques et déterministes', async () => {
    const { root, document } = await fixture();
    const duplicate = structuredClone(document.compositions[0]);
    duplicate.id = 'zz-another-entry';
    document.compositions.unshift(duplicate);
    assert.throws(
        () => validateCompositionRegistry(root, document),
        /sorted by id/
    );
    document.compositions.sort((left, right) =>
        left.id.localeCompare(right.id)
    );
    assert.throws(
        () => validateCompositionRegistry(root, document),
        /coordinates must be unique/
    );
});

test('un générateur accessible par lien symbolique est rejeté', async () => {
    const { root, document } = await fixture();
    await symlink(
        join(root, 'tools/generator-platform/generate-probe.mjs'),
        join(root, 'tools/generator-platform/generate-linked.mjs')
    );
    document.compositions[0].generator_script =
        'tools/generator-platform/generate-linked.mjs';
    assert.throws(
        () => validateCompositionRegistry(root, document),
        /symbolic link/
    );
});

test('un oracle accessible par lien symbolique est rejeté', async () => {
    const { root, document } = await fixture();
    await symlink(
        join(root, 'oracles/probe-angular.test.mjs'),
        join(root, 'oracles/linked.test.mjs')
    );
    document.compositions[0].oracles[0].path = 'oracles/linked.test.mjs';
    assert.throws(
        () => validateCompositionRegistry(root, document),
        /symbolic link/
    );
});
