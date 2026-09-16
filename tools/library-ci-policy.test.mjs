import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';
import { parse as parseYaml } from 'yaml';

import { classifyLibraryCiImpact } from './library-ci-impact.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ISOLATION_CONDITION = "steps.library-impact.outputs.isolation == 'true'";
const INTEGRATION_CONDITION =
    "steps.library-impact.outputs.integration == 'true'";

function workflow(name) {
    return parseYaml(
        readFileSync(join(ROOT, '.github/workflows', name), 'utf8')
    );
}

function requiredContexts() {
    return JSON.parse(
        readFileSync(join(ROOT, '.github/branch-protection.main.json'), 'utf8')
    ).required_status_checks.contexts;
}

function step(job, predicate, label) {
    const found = job.steps.find(predicate);
    assert.ok(found, label);
    return found;
}

function localModuleClosure(entrypoints) {
    const pending = [...entrypoints];
    const visited = new Set();
    while (pending.length > 0) {
        const path = pending.pop();
        if (visited.has(path)) continue;
        visited.add(path);
        const content = readFileSync(join(ROOT, path), 'utf8');
        const source = ts.createSourceFile(
            path,
            content,
            ts.ScriptTarget.Latest,
            true,
            ts.ScriptKind.JS
        );
        function visit(node) {
            if (
                (ts.isImportDeclaration(node) ||
                    ts.isExportDeclaration(node)) &&
                ts.isStringLiteral(node.moduleSpecifier) &&
                node.moduleSpecifier.text.startsWith('.')
            ) {
                const absolute = resolve(
                    ROOT,
                    dirname(path),
                    node.moduleSpecifier.text
                );
                pending.push(relative(ROOT, absolute).split(sep).join('/'));
            }
            ts.forEachChild(node, visit);
        }
        visit(source);
    }
    return [...visited].sort();
}

function assertConditionalDeepJob(job, output, command) {
    const expected =
        output === 'isolation' ? ISOLATION_CONDITION : INTEGRATION_CONDITION;
    assert.equal(job.if, undefined, 'le job requis ne doit jamais être sauté');

    const checkout = step(
        job,
        (candidate) => candidate.uses === 'actions/checkout@v7',
        'checkout absent'
    );
    assert.equal(checkout.if, undefined, 'checkout devenu conditionnel');
    assert.equal(
        checkout.with?.['fetch-depth'],
        0,
        'le diff doit disposer de l’historique complet'
    );

    const node = step(
        job,
        (candidate) => candidate.uses === 'actions/setup-node@v7',
        'setup-node absent'
    );
    assert.equal(node.if, undefined, 'setup-node devenu conditionnel');

    const impact = step(
        job,
        (candidate) => candidate.id === 'library-impact',
        'sélecteur d’impact absent'
    );
    assert.equal(
        impact.if,
        undefined,
        'sélecteur d’impact devenu conditionnel'
    );
    assert.match(impact.run, /tools\/library-ci-impact\.mjs/);
    assert.match(impact.run, />> "\$GITHUB_OUTPUT"/);
    assert.match(impact.env.LIBRARY_DIFF_BASE, /origin\/\{0\}/);
    assert.match(impact.env.LIBRARY_DIFF_BASE, /HEAD~1/);

    const deep = step(
        job,
        (candidate) => candidate.run?.includes(command),
        `preuve profonde absente : ${command}`
    );
    assert.equal(deep.if, expected);

    for (const candidate of job.steps.filter(
        (item) =>
            item.uses === 'oven-sh/setup-bun@v2' ||
            item.run?.includes('bun install --frozen-lockfile')
    )) {
        assert.equal(
            candidate.if,
            expected,
            `étape coûteuse non bornée : ${candidate.name ?? candidate.uses}`
        );
    }
}

describe('politique CI bibliothèque proportionnelle', () => {
    it('conserve les trois contextes requis tout en bornant les preuves profondes', () => {
        const ci = workflow('ci.yml');
        const isolation = ci.jobs['library-candidate-isolation'];
        const integration = ci.jobs['library-end-to-end'];

        assert.equal(
            isolation.name,
            'Library candidate isolation (${{ matrix.profile }})'
        );
        assert.deepEqual(
            isolation.strategy.matrix.include.map(({ profile }) => profile),
            ['linux-docker', 'macos-sandbox']
        );
        assert.equal(
            integration.name,
            'Library integration (create-app → Material → Tailwind)'
        );

        assertConditionalDeepJob(
            isolation,
            'isolation',
            'bun run check:library-candidate-isolation'
        );
        assertConditionalDeepJob(
            integration,
            'integration',
            'bun run check:library-setup-integration'
        );

        const contexts = requiredContexts();
        for (const context of [
            'Library candidate isolation (linux-docker)',
            'Library candidate isolation (macos-sandbox)',
            'Library integration (create-app → Material → Tailwind)',
        ]) {
            assert.ok(
                contexts.includes(context),
                `contexte requis absent : ${context}`
            );
        }
    });

    it('garde une passe nightly profonde, manuelle et non conditionnelle', () => {
        const nightly = workflow('nightly-integration.yml');
        const triggers = nightly.on ?? nightly.true;
        assert.ok(triggers.schedule, 'schedule nightly absent');
        assert.ok(
            triggers.workflow_dispatch !== undefined,
            'déclenchement manuel absent'
        );

        const isolation = nightly.jobs['library-candidate-isolation'];
        const integration = nightly.jobs['library-end-to-end'];
        assert.deepEqual(
            isolation.strategy.matrix.include.map(({ profile }) => profile),
            ['linux-docker', 'macos-sandbox']
        );

        for (const [job, command] of [
            [isolation, 'bun run check:library-candidate-isolation'],
            [integration, 'bun run check:library-setup-integration'],
        ]) {
            const deep = step(
                job,
                (candidate) => candidate.run?.includes(command),
                `preuve nightly absente : ${command}`
            );
            assert.equal(
                deep.if,
                undefined,
                'preuve nightly devenue conditionnelle'
            );
            assert.equal(job.if, undefined, 'job nightly devenu conditionnel');
        }
    });

    it('couvre la fermeture réelle des modules exécutés par les deux preuves', () => {
        const isolationClosure = localModuleClosure([
            'tools/library-setup/sandbox.integration.test.mjs',
        ]);
        for (const path of isolationClosure) {
            assert.equal(
                classifyLibraryCiImpact([path]).isolation,
                true,
                `dépendance isolation non classifiée : ${path}`
            );
        }

        const integrationClosure = localModuleClosure([
            'tools/add-library.mjs',
            'tools/check-library-setup.mjs',
            'tools/create-app.mjs',
            'tools/library-setup/check-create-app-add-library-integration.mjs',
        ]);
        for (const path of integrationClosure) {
            assert.equal(
                classifyLibraryCiImpact([path]).integration,
                true,
                `dépendance intégration non classifiée : ${path}`
            );
        }
    });
});
