// X5 C6, F-m14 (validation d'E sur 10eddc88) : retirer le témoin des racines
// de branche de `sessionSpecs` laissait l'oracle natif vert (4 fichiers au
// lieu de 5) alors que la config Vitest brute l'exclut aussi : le témoin ne
// tournait plus nulle part. Une spec Angular exclue de Vitest brut doit être
// exactement une spec de l'exécuteur natif, et le témoin doit en faire partie.
// Lecture du texte des deux sources : prepare-stack-tests.mjs s'exécute dès
// son import ; une liste introuvable fait échouer le test. Les commentaires
// du bloc sont retirés avant l'extraction : une ligne désactivée ne compte
// pas (M3, M4 de la validation d'E sur c4c030fd).
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

const here = import.meta.dirname;
const specRoot = 'stack-tests/angular';
const witness = 'branch-root-witness.spec.ts';

function block(source, start, end) {
    const from = source.indexOf(start);
    assert.notEqual(from, -1, `début introuvable : ${start}`);
    const to = source.indexOf(end, from + start.length);
    assert.notEqual(to, -1, `fin introuvable : ${end}`);
    return withoutComments(source.slice(from + start.length, to));
}

// Retire `//` et `/* */` hors des chaînes : le glob `**/*.spec.ts` contient
// `/*` et n'est pas un commentaire.
function withoutComments(text) {
    let out = '';
    let quote = null;
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (quote) {
            out += char;
            if (char === '\\') out += text[++i] ?? '';
            else if (char === quote) quote = null;
        } else if (char === '/' && text[i + 1] === '/') {
            while (i + 1 < text.length && text[i + 1] !== '\n') i++;
        } else if (char === '/' && text[i + 1] === '*') {
            const end = text.indexOf('*/', i + 2);
            assert.notEqual(end, -1, 'commentaire non fermé');
            i = end + 1;
        } else {
            if (char === "'" || char === '"' || char === '`') quote = char;
            out += char;
        }
    }
    assert.equal(quote, null, 'chaîne non fermée');
    return out;
}

const specNames = (text) =>
    [...text.matchAll(/'([\w.-]+\.spec\.ts)'/g)].map(([, name]) => name);

function runners(prepare, config) {
    assert.ok(
        block(config, 'include: [', ']').includes(
            `'tools/generator-platform/${specRoot}/**/*.spec.ts'`
        ),
        'Vitest brut doit inclure toutes les specs Angular'
    );
    return {
        native: specNames(block(prepare, 'const sessionSpecs = [', '];')),
        excluded: specNames(block(config, 'exclude: [', '].map(')),
    };
}

const sources = async () => ({
    prepare: await readFile(resolve(here, 'prepare-stack-tests.mjs'), 'utf8'),
    config: await readFile(resolve(here, 'vitest.angular.config.ts'), 'utf8'),
});

// Désactive l'unique ligne qui porte `text` (mutant M3/M4 sur le vrai texte).
function disable(source, text, style) {
    const lines = source.split('\n');
    const hits = lines.flatMap((line, index) =>
        line.trim() === text ? [index] : []
    );
    assert.equal(hits.length, 1, `ligne à désactiver : ${text}`);
    const [index] = hits;
    const indent = lines[index].match(/^\s*/)[0];
    lines[index] = indent + (style === 'line' ? `// ${text}` : `/* ${text} */`);
    return lines.join('\n');
}

test('F-m14 : le témoin des racines de branche tourne dans l oracle natif', async () => {
    const { prepare, config } = await sources();
    const { native } = runners(prepare, config);
    assert.ok(native.includes(witness), native.join());
});

test('F-m14 : une spec exclue de Vitest brut est une spec native, et réciproquement', async () => {
    const { prepare, config } = await sources();
    const { native, excluded } = runners(prepare, config);
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

for (const style of ['line', 'block'])
    test(`F-m14 : témoin mis en commentaire (${style}), il ne compte plus (M3, M4)`, async () => {
        const { prepare, config } = await sources();
        const intact = runners(prepare, config);
        // M3 : désactivé dans sessionSpecs, il ne tourne plus en natif.
        const m3 = runners(disable(prepare, `'${witness}',`, style), config);
        assert.deepEqual(
            m3.native,
            intact.native.filter((name) => name !== witness)
        );
        assert.deepEqual(m3.excluded, intact.excluded);
        // M4 : désactivé dans l'exclusion, Vitest brut le reprend.
        const m4 = runners(prepare, disable(config, `'${witness}',`, style));
        assert.deepEqual(m4.native, intact.native);
        assert.deepEqual(
            m4.excluded,
            intact.excluded.filter((name) => name !== witness)
        );
    });

// Le glob contient `*/` : seul `//` peut le désactiver sans casser la config.
test('F-m14 : glob d inclusion de Vitest brut mis en commentaire, refus', async () => {
    const { prepare, config } = await sources();
    const glob = `'tools/generator-platform/${specRoot}/**/*.spec.ts'`;
    assert.throws(
        () => runners(prepare, disable(config, glob, 'line')),
        /Vitest brut doit inclure toutes les specs Angular/
    );
});
