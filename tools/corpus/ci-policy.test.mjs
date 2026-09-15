import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { parse as parseYaml } from 'yaml';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

function workflow(name) {
    return parseYaml(
        readFileSync(join(ROOT, '.github/workflows', name), 'utf8')
    );
}

describe('politique CI corpus conditionnelle', () => {
    it('produit toujours le contexte requis et conditionne seulement la passe profonde', () => {
        const job = workflow('ci.yml').jobs.corpus;
        assert.equal(job.name, 'Corpus SEOS — structural-only');
        assert.equal(job.if, undefined);
        const contract = job.steps.find((step) =>
            step.run?.includes('check-corpus-contract.mjs')
        );
        const impact = job.steps.find((step) =>
            step.run?.includes('ci-impact.mjs')
        );
        const deep = job.steps.find((step) =>
            step.run?.includes('bun run corpus:ci')
        );
        assert.ok(contract, 'contrat rapide absent');
        assert.equal(
            contract.if,
            undefined,
            'contrat rapide devenu conditionnel'
        );
        assert.ok(impact, 'sélecteur de profondeur absent');
        assert.equal(impact.if, undefined, 'sélecteur devenu conditionnel');
        assert.ok(deep, 'passe profonde absente');
        assert.equal(deep.if, "steps.corpus-impact.outputs.deep == 'true'");
        for (const step of job.steps.filter(
            (candidate) =>
                candidate.uses === 'oven-sh/setup-bun@v2' ||
                candidate.run?.includes('bun install --frozen-lockfile')
        )) {
            assert.equal(step.if, "steps.corpus-impact.outputs.deep == 'true'");
        }
    });

    it('borne corpus-full aux changements corpus tout en gardant le lancement manuel', () => {
        const parsed = workflow('corpus-full.yml');
        const triggers = parsed.on ?? parsed.true;
        assert.ok(triggers.workflow_dispatch !== undefined);
        assert.deepEqual(triggers.push.branches, ['main']);
        assert.deepEqual(triggers.push.paths, [
            'corpus/**',
            'tools/corpus/**',
            'docs/architecture/corpus/pair.schema.json',
            'legacy.lock.json',
            '.github/workflows/corpus-full.yml',
        ]);
    });
});
