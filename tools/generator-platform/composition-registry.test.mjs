import assert from 'node:assert/strict';
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

async function fixture() {
    const root = await mkdtemp(join(tmpdir(), 'composition-registry-'));
    await write(
        join(root, 'tools/generator-platform/generate-probe.mjs'),
        'console.log("probe");\n'
    );
    for (const id of ['first-case', 'second-case'])
        await write(
            join(root, `sources/${id}.definition.json`),
            `${JSON.stringify({ kind: 'probe-kind', feature: { id } })}\n`
        );
    return {
        root,
        document: {
            schema_version: '1.0.0',
            compositions: [
                {
                    kind: 'probe-kind',
                    maturity: 'proven',
                    target: 'angular-layered',
                    generator_script:
                        'tools/generator-platform/generate-probe.mjs',
                    layers: ['domain', 'data', 'application'],
                    evidence: [
                        'sources/first-case.definition.json',
                        'sources/second-case.definition.json',
                    ],
                },
            ],
        },
    };
}

test('le registre réel est fermé, trié et fondé sur des preuves relisibles', () => {
    const registry = loadCompositionRegistry(repository);
    assert.deepEqual(
        registry.entries.map(({ kind }) => kind),
        ['action-request', 'list-query']
    );
    assert.equal(registry.byKind['action-request'].maturity, 'proven');
    assert.equal(registry.byKind['list-query'].maturity, 'experimental');
    assert.match(
        registry.byKind['list-query'].maturityNote,
        /removed cmz-client-landing-home POC \(rollback 6f70743\)/
    );
    assert.match(
        registry.byKind['list-query'].maturityNote,
        /requires a distinct active, non-retired case/
    );
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

test('une preuve de nature différente est rejetée', async () => {
    const { root, document } = await fixture();
    await write(
        join(root, 'sources/second-case.definition.json'),
        `${JSON.stringify({ kind: 'other-kind', feature: { id: 'second-case' } })}\n`
    );
    assert.throws(
        () => validateCompositionRegistry(root, document),
        /does not prove kind probe-kind/
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
    document.compositions[0].layers = ['data', 'domain'];
    assert.throws(
        () => validateCompositionRegistry(root, document),
        /canonical layer prefix/
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
