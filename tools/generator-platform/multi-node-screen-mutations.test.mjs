/**
 * Lot PLAT-9 — prouve que la garde de complétude du nœud de rôle `screen`
 * est porteuse, pas une tautologie.
 *
 * `core/role-production.mjs` place `load_ids` et `data_binding_ids` dans le
 * payload, et `schemas/role-node.schema.json` les déclare `required`. Si un
 * futur changement retire l'une de ces lignes du payload produit, la
 * validation de schéma dans `producePageRoleNode` doit lever — sinon le
 * work order d'une page qui lit des données repart sans décrire ses nœuds
 * requête, silencieusement.
 *
 * Chaque mutant est écrit dans un `mkdtemp`, jamais comme fichier frère du
 * vrai `role-production.mjs` : l'oracle d'isolation de run (PLAT-5K) hache
 * tout l'arbre `tools/generator-platform/` et lèverait sur un frère
 * transitoire sous la parallélisation de `node --test`. Le seul import
 * relatif de `role-production.mjs` (`../validate-ir.mjs`) est recréé par
 * lien symbolique.
 */
import assert from 'node:assert/strict';
import {
    mkdir,
    mkdtemp,
    readFile,
    rm,
    symlink,
    writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

import { repositoryRoot } from './validate-ir.mjs';

const sourcePath = new URL('./core/role-production.mjs', import.meta.url);
const roleNodeSchema = JSON.parse(
    await readFile(
        new URL('./schemas/role-node.schema.json', import.meta.url),
        'utf8'
    )
);

function pageContract() {
    return {
        kind: 'page-realization-contract',
        design: { id: 'mutant-design' },
        page: {
            id: 'page_4444444444444444',
            path: '/',
            access: { mode: 'public' },
            states: [{ id: 'ready' }],
            controls: [],
            actions: [{ id: 'submit' }],
            loads: [{ id: 'load-overview' }],
            data_bindings: [{ id: 'overview-content' }],
            regions: [{ id: 'main' }],
        },
    };
}

const mutants = [
    {
        name: 'load_ids retiré du payload produit',
        before: 'load_ids: sortedIds(page.loads),',
        after: '',
    },
    {
        name: 'data_binding_ids retiré du payload produit',
        before: 'data_binding_ids: sortedIds(page.data_bindings),',
        after: '',
    },
];

async function loadMutant(mutant) {
    const original = await readFile(sourcePath, 'utf8');
    assert.ok(
        original.includes(mutant.before),
        `${mutant.name}: point de mutation absent de la source`
    );
    const mutated = original.replace(mutant.before, mutant.after);
    assert.notEqual(mutated, original, `${mutant.name}: mutation sans effet`);
    const root = await mkdtemp(resolve(tmpdir(), 'cmz-multi-node-mutant-'));
    const core = resolve(root, 'core');
    await mkdir(core, { recursive: true });
    await symlink(
        resolve(repositoryRoot, 'tools/generator-platform/validate-ir.mjs'),
        resolve(root, 'validate-ir.mjs')
    );
    const modulePath = resolve(core, 'role-production.mjs');
    await writeFile(modulePath, mutated);
    return {
        module: await import(pathToFileURL(modulePath).href),
        cleanup: () => rm(root, { recursive: true, force: true }),
    };
}

test('la garde de complétude du nœud de rôle screen tue ses mutants', async (t) => {
    const original = await import('./core/role-production.mjs');
    const produced = original.producePageRoleNode(
        pageContract(),
        'a'.repeat(64),
        roleNodeSchema
    );
    assert.deepEqual(produced.payload.load_ids, ['load-overview']);
    assert.deepEqual(produced.payload.data_binding_ids, ['overview-content']);

    for (const mutant of mutants) {
        await t.test(mutant.name, async () => {
            const { module, cleanup } = await loadMutant(mutant);
            try {
                assert.throws(
                    () =>
                        module.producePageRoleNode(
                            pageContract(),
                            'a'.repeat(64),
                            roleNodeSchema
                        ),
                    /required/,
                    `${mutant.name}: le mutant aurait dû être rejeté par le schéma`
                );
            } finally {
                await cleanup();
            }
        });
    }
});
