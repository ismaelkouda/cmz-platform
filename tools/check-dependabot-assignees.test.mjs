// Assignation native des PR Dependabot (option `assignees`).
// Importé par check-dependabot-policy.test.mjs.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { parse as parseYaml } from 'yaml';

import { assigneePolicyErrors } from './check-dependabot-assignees.mjs';

const real = parseYaml(
    readFileSync(new URL('../.github/dependabot.yml', import.meta.url), 'utf8')
);
const variant = (change) => {
    const config = structuredClone(real);
    change(config.updates);
    return config;
};

test('assignees : la configuration réelle assigne chaque entrée', () => {
    assert.ok(real.updates.length >= 1);
    assert.deepEqual(assigneePolicyErrors(real), []);
});

test('assignees : refuse une entrée sans assigné, quelle qu’elle soit', () => {
    for (let index = 0; index < real.updates.length; index += 1) {
        const errors = assigneePolicyErrors(
            variant((updates) => delete updates[index].assignees)
        );
        assert.equal(errors.length, 1);
        assert.match(
            errors[0],
            new RegExp(
                `^updates\\[${index}\\] .* : assignees doit être une liste non vide$`
            )
        );
    }
});

test('assignees : refuse une liste vide et une valeur qui n’est pas une liste', () => {
    for (const value of [[], 'relecteur', null]) {
        const errors = assigneePolicyErrors(
            variant((updates) => (updates[0].assignees = value))
        );
        assert.equal(errors.length, 1);
        assert.match(errors[0], /assignees doit être une liste non vide$/);
    }
});

test('assignees : refuse un login GitHub invalide', () => {
    for (const login of [
        '',
        '-relecteur',
        'relecteur-',
        're--lecteur',
        'a b',
        'a'.repeat(40),
        7,
    ]) {
        const errors = assigneePolicyErrors(
            variant((updates) => {
                for (const update of updates) update.assignees = [login];
            })
        );
        assert.equal(errors.length, real.updates.length, String(login));
        assert.match(errors[0], /login GitHub invalide/);
    }
});

test('assignees : refuse des entrées qui n’assignent pas la même personne', () => {
    const errors = assigneePolicyErrors(
        variant((updates) => (updates.at(-1).assignees = ['autre-relecteur']))
    );
    assert.equal(errors.length, 1);
    assert.match(
        errors[0],
        /toutes les entrées doivent porter les mêmes assignees/
    );
});

test('assignees : l’ordre et les doublons ne comptent pas', () => {
    const errors = assigneePolicyErrors(
        variant((updates) => {
            for (const update of updates)
                update.assignees = ['b-relecteur', 'a-relecteur'];
            updates[0].assignees = [
                'a-relecteur',
                'b-relecteur',
                'a-relecteur',
            ];
        })
    );
    assert.deepEqual(errors, []);
});

test('assignees : refuse une configuration sans entrées', () => {
    assert.deepEqual(assigneePolicyErrors({ updates: [] }), [
        'Dependabot : updates doit être une liste non vide',
    ]);
    assert.deepEqual(assigneePolicyErrors({}), [
        'Dependabot : updates doit être une liste non vide',
    ]);
});
