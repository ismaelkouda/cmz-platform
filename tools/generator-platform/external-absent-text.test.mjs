// X5 C5 (B+) : le texte d'absence d'une liaison de lecture va de la conception
// au plan SCELLÉ, puis à une constante de la composition générée
// (`absentText.<liaison>`). Le bon de travail donne le CHEMIN, jamais le
// texte. Deux produits fictifs ; le champ `label` y est déclaré nullable.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

import {
    planExternalPageComposition,
    publishExternalPageComposition,
} from './core/external-page-composition.mjs';
import { planExternalPageRealizationWorkOrder } from './core/external-page-realization.mjs';
import { SESSION_FIXTURE_DOMAINS } from './test-support/external-session-fixture.mjs';
import {
    compositionFile,
    queryPage,
} from './test-support/external-query-page.mjs';

const native = () => ({ run: () => undefined });
const TEXT = 'Non renseigné';

// Contrat : `label` nullable. Conception : une liaison de la lecture, avec ou
// sans texte d'absence.
const nullableLabel =
    (domain, absentText) =>
    ({ contract, design }) => {
        const item = contract.models.find(
            (model) => model.id === `${domain}-item`
        );
        item.fields.find((field) => field.name === 'label').nullable = true;
        const page = design.pages.find((entry) => entry.loads.length > 0);
        page.data_bindings.push({
            id: 'catalogue-rows',
            operation_ref: structuredClone(page.loads[0].operation_ref),
            response_status: 200,
            model_id: `${domain}-items`,
            field_names: [],
            visible_in_state_ids: [page.loads[0].success_state_id],
            ...(absentText === undefined ? {} : { absent_text: absentText }),
        });
        page.regions[0].elements.push({
            id: 'catalogue-list',
            kind: 'list',
            accessible_name: 'Catalogue',
            content: 'Catalogue rows',
            control_ids: [],
            action_ids: [],
            data_binding_ids: ['catalogue-rows'],
        });
    };

async function workOrderOf(options) {
    const composition = await planExternalPageComposition(options);
    await publishExternalPageComposition(
        { ...options, expectedPlanId: composition.plan_id },
        native()
    );
    const plan = await planExternalPageRealizationWorkOrder(options);
    const path = plan.changes
        .map((change) => change.path)
        .find((entry) => entry.endsWith('work-order.json'));
    return { composition, workOrder: JSON.parse(plan.files[path]) };
}

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
        const [read] = workOrder.read_states.reads;
        assert.deepEqual(read.absent_fields, ['label'], domain);
        assert.deepEqual(
            read.bindings,
            [
                {
                    binding_id: 'catalogue-rows',
                    absent_text_path: 'absentText.catalogueRows',
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
