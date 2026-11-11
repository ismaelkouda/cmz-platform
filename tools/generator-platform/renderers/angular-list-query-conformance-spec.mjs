// X5 C3b : test de conformité de contrat, généré dans le produit à côté de la
// lecture extérieure (D-X5-2, mécanisme 1). Il s'exécute avec le vitest
// installé du produit :
// - la fixture COMPLÈTE et typée du contrat (tous les champs de l'élément, lus
//   ou non) est acceptée, et la sortie ne porte que les champs lus ;
// - un champ NON lu modifié, ou un champ ajouté, est accepté et absent de la
//   sortie ;
// - un champ LU de mauvais type est refusé.
import { pascalCase } from './shared.mjs';

// Valeur d'un autre type JSON que celui du champ lu.
function wrongValue(field) {
    if (field.type.kind === 'primitive' && field.type.name === 'string')
        return 42;
    return 'x';
}

export function renderListQueryConformanceSpec(query, fixture) {
    const decoder = `decode${pascalCase(query.id)}Response`;
    const envelope = query.transport.envelope;
    const isPage = query.transport.result.kind === 'page';
    const read = query.read_model.fields.map((field) => [
        field.name,
        field.source_field,
    ]);
    const sources = new Set(read.map(([, source]) => source));
    const unread = Object.keys(fixture.item).filter(
        (name) => !sources.has(name)
    );
    let added = 'conformance_added_field';
    while (Object.hasOwn(fixture.item, added)) added += '_';
    const wrong = Object.fromEntries(
        query.wire_model.fields.map((field) => [field.name, wrongValue(field)])
    );
    const collection = isPage
        ? `{ ...PAGE, ${JSON.stringify(query.transport.result.items_field)}: [item] }`
        : '[item]';
    const first = isPage ? '.items[0]' : '[0]';
    return `// Généré par l'atelier (X5, D-X5-2) : conformité de la lecture ${query.id}
// au contrat backend complet. Ne pas modifier : régénérer.
import { describe, expect, it } from 'vitest';

import { ${decoder} } from './${query.id}.decoder';

type CompleteItem = ${fixture.itemType};

// Fixture complète et typée, synthétisée depuis les types du contrat.
const COMPLETE_ITEM: CompleteItem = ${JSON.stringify(fixture.item)};
${isPage ? `const PAGE = ${JSON.stringify(fixture.page)};\n` : ''}const READ = ${JSON.stringify(read)} as const;
const UNREAD: readonly string[] = ${JSON.stringify(unread)};
const WRONG: Readonly<Record<string, unknown>> = ${JSON.stringify(wrong)};

function decodeItem(item: unknown): unknown {
    return ${decoder}({
        ${JSON.stringify(envelope.error_field)}: false,
        ${JSON.stringify(envelope.message_field)}: 'OK',
        ${JSON.stringify(envelope.data_field)}: ${collection},
    })${first};
}

const source = (name: string): unknown =>
    (COMPLETE_ITEM as Readonly<Record<string, unknown>>)[name];
const expected = Object.fromEntries(READ.map(([name, field]) => [name, source(field)]));

describe('conformité du contrat : ${query.id}', () => {
    it('la fixture complète et typée est acceptée ; la sortie ne porte que les champs lus', () => {
        expect(decodeItem(COMPLETE_ITEM)).toEqual(expected);
    });

    it('un champ non lu modifié, ou un champ ajouté, est accepté et absent de la sortie', () => {
        for (const field of UNREAD)
            expect(decodeItem({ ...COMPLETE_ITEM, [field]: { changed: true } })).toEqual(expected);
        expect(decodeItem({ ...COMPLETE_ITEM, ${JSON.stringify(added)}: 1 })).toEqual(expected);
    });

    it('un champ lu de mauvais type est refusé', () => {
        for (const [, field] of READ)
            expect(() => decodeItem({ ...COMPLETE_ITEM, [field]: WRONG[field] })).toThrow();
    });
});
`;
}
