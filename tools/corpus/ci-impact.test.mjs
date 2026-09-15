import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { classifyCorpusImpact, relevantPackageScripts } from './ci-impact.mjs';

describe('corpus CI impact', () => {
    it('garde la passe rapide pour une modification applicative ordinaire', () => {
        assert.deepEqual(
            classifyCorpusImpact([
                'libs/requests/ui/src/lib/requests.component.ts',
                'docs/architecture/audit.md',
            ]),
            { deep: false, reasons: [] }
        );
    });

    it('active la passe profonde pour chaque source de vérité corpus', () => {
        for (const path of [
            'corpus/requests.pairs.jsonl',
            'tools/corpus/mapping.mjs',
            'docs/architecture/corpus/pair.schema.json',
            'legacy.lock.json',
            '.github/workflows/ci.yml',
            'nx.json',
            'libs/requests/ui/project.json',
            'libs/core/project.json',
        ]) {
            const result = classifyCorpusImpact([path]);
            assert.equal(result.deep, true, path);
            assert.deepEqual(result.reasons, [path]);
        }
    });

    it('ignore une dépendance package sans rapport mais détecte un script corpus', () => {
        const before = {
            scripts: { 'corpus:ci': 'node old.mjs', test: 'node test.mjs' },
            dependencies: { angular: '1' },
        };
        const dependencyOnly = {
            ...before,
            dependencies: { angular: '2' },
        };
        assert.equal(
            classifyCorpusImpact(['package.json'], {
                packageBefore: before,
                packageAfter: dependencyOnly,
            }).deep,
            false
        );
        const scriptChanged = {
            ...before,
            scripts: { ...before.scripts, 'corpus:ci': 'node new.mjs' },
        };
        assert.deepEqual(
            classifyCorpusImpact(['package.json'], {
                packageBefore: before,
                packageAfter: scriptChanged,
            }),
            {
                deep: true,
                reasons: ['package.json#scripts corpus/legacy'],
            }
        );
    });

    it('borne la signature package aux scripts corpus et legacy', () => {
        assert.deepEqual(
            relevantPackageScripts({
                scripts: {
                    test: 'vitest',
                    'check:pair-schema': 'node pair.mjs',
                    'check:corpus-contract': 'node contract.mjs',
                    'legacy:checkout': 'node legacy.mjs',
                    'corpus:ci': 'node corpus.mjs',
                },
            }),
            {
                'check:corpus-contract': 'node contract.mjs',
                'check:pair-schema': 'node pair.mjs',
                'corpus:ci': 'node corpus.mjs',
                'legacy:checkout': 'node legacy.mjs',
            }
        );
    });
});
