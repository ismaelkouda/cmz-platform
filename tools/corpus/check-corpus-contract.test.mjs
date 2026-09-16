import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { rmSync } from 'node:fs';

import { validateCorpusContract } from './check-corpus-contract.mjs';

const roots = [];
const schemaPath = join(
    dirname(new URL(import.meta.url).pathname),
    '../../docs/architecture/corpus/pair.schema.json'
);

afterEach(() => {
    for (const root of roots.splice(0))
        rmSync(root, { recursive: true, force: true });
});

function fixture() {
    const root = mkdtempSync(join(tmpdir(), 'cmz-corpus-contract-'));
    roots.push(root);
    mkdirSync(join(root, 'corpus'), { recursive: true });
    mkdirSync(join(root, 'libs/demo'), { recursive: true });
    writeFileSync(join(root, 'libs/demo/item.ts'), 'export {};\n');
    writeFileSync(
        join(root, 'legacy.lock.json'),
        JSON.stringify({ commit: 'a'.repeat(40) })
    );
    const pair = {
        id: 'demo.item',
        legacy: null,
        nx: 'libs/demo/item.ts',
        chain_id: 'demo.list',
        node: 'item',
        pattern: 'crud-entity',
        module: 'demo',
        layer: 'domain',
        status: 'verified',
        legacy_ref: { commit: 'a'.repeat(40) },
    };
    writeFileSync(
        join(root, 'corpus/demo.pairs.jsonl'),
        `${JSON.stringify(pair)}\n`
    );
    return { root, pair };
}

function check(root) {
    return validateCorpusContract({ root, schemaPath });
}

describe('check-corpus-contract', () => {
    it('accepte un corpus valide sans exécuter Nx', () => {
        const { root } = fixture();
        assert.deepEqual(check(root), {
            ok: true,
            errors: [],
            files: 1,
            pairs: 1,
            nxPaths: 1,
        });
    });

    it('rejette chemin absent, mauvais module, doublon et mauvais pin', () => {
        const { root, pair } = fixture();
        const broken = {
            ...pair,
            nx: 'libs/demo/absent.ts',
            module: 'autre',
            legacy_ref: { commit: 'b'.repeat(40) },
        };
        writeFileSync(
            join(root, 'corpus/demo.pairs.jsonl'),
            `${JSON.stringify(broken)}\n${JSON.stringify(broken)}\n`
        );
        const result = check(root);
        assert.equal(result.ok, false);
        assert.match(result.errors.join('\n'), /chemin nx absent/);
        assert.match(result.errors.join('\n'), /différent du fichier/);
        assert.match(result.errors.join('\n'), /id dupliqué/);
        assert.match(result.errors.join('\n'), /legacy_ref\.commit/);
    });

    it('rejette une paire hors schéma', () => {
        const { root, pair } = fixture();
        writeFileSync(
            join(root, 'corpus/demo.pairs.jsonl'),
            `${JSON.stringify({ ...pair, propriete_inventee: true })}\n`
        );
        const result = check(root);
        assert.equal(result.ok, false);
        assert.match(result.errors.join('\n'), /additional property/);
    });

    it('rejette traversée et lien symbolique sortant du workspace', () => {
        const { root, pair } = fixture();
        const outside = mkdtempSync(join(tmpdir(), 'cmz-corpus-outside-'));
        roots.push(outside);
        writeFileSync(join(outside, 'secret.ts'), 'secret\n');
        symlinkSync(
            join(outside, 'secret.ts'),
            join(root, 'libs/demo/link.ts')
        );
        const traversal = {
            ...pair,
            id: 'demo.traversal',
            nx: '../outside.ts',
        };
        const symlink = {
            ...pair,
            id: 'demo.symlink',
            nx: 'libs/demo/link.ts',
        };
        writeFileSync(
            join(root, 'corpus/demo.pairs.jsonl'),
            `${JSON.stringify(traversal)}\n${JSON.stringify(symlink)}\n`
        );
        const result = check(root);
        assert.equal(result.ok, false);
        assert.match(result.errors.join('\n'), /traversant/);
        assert.match(result.errors.join('\n'), /lien symbolique/);
    });
});
