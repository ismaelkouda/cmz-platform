// X5 C5 (B+) : le texte d'absence d'une liaison de lecture va de la conception
// au plan SCELLÉ, puis à une constante de la composition générée
// (`absentText.<liaison>`). Le bon de travail donne le CHEMIN, jamais le
// texte. Deux produits fictifs ; le champ `label` y est déclaré nullable.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

import { READ_PAGE_RULES } from './core/read-access.mjs';
import { SESSION_FIXTURE_DOMAINS } from './test-support/external-session-fixture.mjs';
import {
    compositionFile,
    nullableLabel,
    queryPage,
    readWorkOrderOf as workOrderOf,
} from './test-support/external-query-page.mjs';

const TEXT = 'Non renseigné';

test('B+ : texte scellé au plan, constante de composition, chemin seul au bon de travail', async (t) => {
    for (const domain of SESSION_FIXTURE_DOMAINS) {
        const { product, options } = await queryPage(
            t,
            domain,
            nullableLabel(domain, TEXT)
        );
        const { composition, workOrder } = await workOrderOf(options);
        // Le plan scellé porte le texte.
        const plan = JSON.parse(
            await readFile(
                join(
                    product.app,
                    workOrder.page_execution.path.replace(/^apps\/[^/]+\//, '')
                ),
                'utf8'
            )
        );
        assert.deepEqual(
            plan.output_bindings.map((binding) => [
                binding.id,
                binding.absent_text,
            ]),
            [['catalogue-rows', TEXT]],
            domain
        );
        // La composition le publie en constante, littéral inerte.
        assert.match(
            compositionFile(composition, 'page-composition.ts'),
            /readonly absentText = Object\.freeze\(\{\n\s+catalogueRows: 'Non renseigné',\n\s+\}\);/,
            domain
        );
        assert.deepEqual(
            workOrder.composition.api.filter((entry) =>
                entry.path.startsWith('absentText')
            ),
            [{ path: 'absentText.catalogueRows', kind: 'constant' }],
            domain
        );
        assert.match(
            compositionFile(composition, 'page-composition.api.ts'),
            /IsData<PageComposition\['absentText'\]\['catalogueRows'\]>/,
            domain
        );
        // Le bon de travail : le chemin et les champs, jamais le texte.
        // C5b : règles et noms d'accès publiés, depuis la source unique.
        assert.deepEqual(workOrder.read_states.rules, READ_PAGE_RULES);
        assert.equal(workOrder.read_states.online_access, 'online');
        assert.deepEqual(workOrder.read_states.reads[0].access, {
            state: 'catalogueState',
            items: 'catalogueItems',
        });
        const [read] = workOrder.read_states.reads;
        assert.deepEqual(read.absent_fields, ['label'], domain);
        assert.deepEqual(
            read.bindings,
            [
                {
                    binding_id: 'catalogue-rows',
                    absent_text_path: 'absentText.catalogueRows',
                    absent_access: 'catalogueRowsAbsent',
                },
            ],
            domain
        );
        assert.doesNotMatch(JSON.stringify(workOrder), /Non renseign/, domain);
    }
});

test('B+ : un champ lu nullable sans texte d’absence, refus nommé au bon de travail', async (t) => {
    const domain = SESSION_FIXTURE_DOMAINS[0];
    const { options } = await queryPage(
        t,
        domain,
        nullableLabel(domain, undefined)
    );
    await assert.rejects(
        () => workOrderOf(options),
        /PAGE_ABSENT_TEXT_MISSING: data binding catalogue-rows needs absent_text for label/
    );
});

// Réserve Z11 de E sur C5a : la liste blanche admet `'`, `;`, `(` et `)`. Un
// texte piégé, admis, reste une DONNÉE parce que la constante est émise par
// JSON.stringify ; émise entre apostrophes, elle deviendrait du code.
test('B+ (Z11) : un texte avec apostrophe reste un littéral inerte, égal au texte', async (t) => {
    const TRAP = "a' ; alert(1) ; '";
    const domain = SESSION_FIXTURE_DOMAINS[0];
    const { product, options } = await queryPage(
        t,
        domain,
        nullableLabel(domain, TRAP)
    );
    const { composition, workOrder } = await workOrderOf(options);
    const plan = JSON.parse(
        await readFile(
            join(
                product.app,
                workOrder.page_execution.path.replace(/^apps\/[^/]+\//, '')
            ),
            'utf8'
        )
    );
    assert.equal(plan.output_bindings[0].absent_text, TRAP);
    const source = compositionFile(composition, 'page-composition.ts');
    // Émise EXACTEMENT comme JSON.stringify(texte).
    assert.ok(
        source.includes(`catalogueRows: ${JSON.stringify(TRAP)},`),
        source
    );
    // Le TypeScript généré se lit sans erreur ; la constante est UN littéral
    // de chaîne, de valeur égale au texte, et rien d'autre.
    const file = ts.createSourceFile(
        'page-composition.ts',
        source,
        ts.ScriptTarget.ES2022,
        true
    );
    assert.deepEqual(file.parseDiagnostics, []);
    let initializer;
    const visit = (node) => {
        if (
            ts.isPropertyDeclaration(node) &&
            node.name.getText() === 'absentText'
        )
            initializer = node.initializer;
        ts.forEachChild(node, visit);
    };
    visit(file);
    const [table] = initializer.arguments;
    assert.equal(table.properties.length, 1);
    assert.ok(ts.isStringLiteral(table.properties[0].initializer));
    assert.equal(table.properties[0].initializer.text, TRAP);
    // Exécutée, la constante vaut le texte.
    const module = { exports: {} };
    runInNewContext(
        ts.transpileModule(`module.exports = ${initializer.getText()};`, {
            compilerOptions: { module: ts.ModuleKind.CommonJS },
        }).outputText,
        { module, Object }
    );
    assert.deepEqual({ ...module.exports }, { catalogueRows: TRAP });
    assert.ok(Object.isFrozen(module.exports));
    assert.doesNotMatch(JSON.stringify(workOrder), /alert/);
});
