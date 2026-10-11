// Garde permanente des oracles C5 : aucun navigateur, aucun serveur.
//
// Un test annoté `test.fail` est compté comme réussi quand il échoue : la
// suite resterait verte avec un oracle rouge. Avant la réalisation de la
// page, un support transitoire en était le seul point d'entrée autorisé ; il
// a été retiré avec elle. Plus aucune spec ne peut en déclarer.
import { expect, test } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';

test('aucune spec C5 n’appelle test.fail', () => {
    const offenders = readdirSync(__dirname)
        .filter((file) => file.endsWith('.ts') && file !== basename(__filename))
        .filter((file) =>
            /\btest\s*\.\s*fail\b/.test(
                readFileSync(join(__dirname, file), 'utf8')
            )
        );
    expect(offenders).toEqual([]);
});
