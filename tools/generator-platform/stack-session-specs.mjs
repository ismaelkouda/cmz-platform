// Lecture du TEXTE des deux listes de specs Angular de session :
// `sessionSpecs` (prepare-stack-tests.mjs, exécuteur natif) et l'exclusion
// de Vitest brut (vitest.angular.config.ts). prepare-stack-tests.mjs
// s'exécute dès son import ; une liste introuvable ou non littérale est
// refusée. Partagé par stack-session-specs.test.mjs (F-m14) et par la garde
// de l'oracle natif (check-session-native-specs.mjs).
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const here = import.meta.dirname;
export const specRoot = 'stack-tests/angular';

function block(source, start, end) {
    const from = source.indexOf(start);
    assert.notEqual(from, -1, `début introuvable : ${start}`);
    const to = source.indexOf(end, from + start.length);
    assert.notEqual(to, -1, `fin introuvable : ${end}`);
    return withoutComments(source.slice(from + start.length, to));
}

// Retire `//` et `/* */` hors des chaînes : le glob `**/*.spec.ts` contient
// `/*` et n'est pas un commentaire. Une ligne désactivée ne compte pas (M3, M4).
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

const SPEC = /'([\w.-]+\.spec\.ts)'/g;

// R-b de Fable : une entrée en gabarit, entre guillemets doubles ou par une
// variable échapperait aux deux côtés à la fois. La liste ne doit contenir que
// des noms littéraux, des virgules et des blancs, après son préfixe connu.
function specNames(text, list, prefix = '') {
    const residue = text.replace(SPEC, '').replace(/[\s,]/g, '');
    assert.equal(residue, prefix, `entrée non littérale dans ${list}`);
    return [...text.matchAll(SPEC)].map(([, name]) => name);
}

export function sessionSpecLists(prepare, config) {
    assert.ok(
        block(config, 'include: [', ']').includes(
            `'tools/generator-platform/${specRoot}/**/*.spec.ts'`
        ),
        'Vitest brut doit inclure toutes les specs Angular'
    );
    return {
        native: specNames(
            block(prepare, 'const sessionSpecs = [', '];'),
            'sessionSpecs'
        ),
        excluded: specNames(
            block(config, 'exclude: [', '].map('),
            'exclude',
            '...configDefaults.exclude...['
        ),
    };
}

export const sessionSpecSources = async () => ({
    prepare: await readFile(resolve(here, 'prepare-stack-tests.mjs'), 'utf8'),
    config: await readFile(resolve(here, 'vitest.angular.config.ts'), 'utf8'),
});
