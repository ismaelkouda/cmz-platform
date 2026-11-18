// X5 C6, F-m14 (validation d'E sur 10eddc88) : retirer le témoin des racines
// de branche de `sessionSpecs` laissait l'oracle natif vert (4 fichiers au
// lieu de 5) alors que la config Vitest brute l'exclut aussi : le témoin ne
// tournait plus nulle part. Une spec Angular exclue de Vitest brut doit être
// exactement une spec de l'exécuteur natif, et le témoin doit en faire partie.
// Lecture du texte des deux sources : prepare-stack-tests.mjs s'exécute dès
// son import ; une liste introuvable fait échouer le test.
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

const here = import.meta.dirname;
const specRoot = 'stack-tests/angular';

function block(source, start, end) {
    const from = source.indexOf(start);
    assert.notEqual(from, -1, `début introuvable : ${start}`);
    const to = source.indexOf(end, from + start.length);
    assert.notEqual(to, -1, `fin introuvable : ${end}`);
    return source.slice(from + start.length, to);
}

const specNames = (text) =>
    [...text.matchAll(/'([\w.-]+\.spec\.ts)'/g)].map(([, name]) => name);

async function runners() {
    const prepare = await readFile(
        resolve(here, 'prepare-stack-tests.mjs'),
        'utf8'
    );
    const config = await readFile(
        resolve(here, 'vitest.angular.config.ts'),
        'utf8'
    );
    assert.ok(
        config.includes(`'tools/generator-platform/${specRoot}/**/*.spec.ts'`),
        'Vitest brut doit inclure toutes les specs Angular'
    );
    return {
        native: specNames(block(prepare, 'const sessionSpecs = [', '];')),
        excluded: specNames(block(config, 'exclude: [', '].map(')),
    };
}

test('F-m14 : le témoin des racines de branche tourne dans l oracle natif', async () => {
    const { native } = await runners();
    assert.ok(native.includes('branch-root-witness.spec.ts'), native.join());
});

test('F-m14 : une spec exclue de Vitest brut est une spec native, et réciproquement', async () => {
    const { native, excluded } = await runners();
    const onDisk = (await readdir(resolve(here, specRoot)))
        .filter((name) => name.endsWith('.spec.ts'))
        .sort();
    assert.deepEqual([...excluded].sort(), [...native].sort());
    assert.deepEqual(
        native.filter((name) => !onDisk.includes(name)),
        [],
        'spec native absente du disque'
    );
    assert.equal(new Set(native).size, native.length, 'spec native en double');
});
