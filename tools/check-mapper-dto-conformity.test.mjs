import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { test } from 'node:test';

import {
    checkMapperConformity,
    violationKey,
} from './check-mapper-dto-conformity.mjs';

const fakeSchema = {
    $defs: {
        FooCreateApiDto: {
            type: 'object',
            properties: {
                name: { type: 'string' },
                code: { type: 'string' },
                description: { type: 'string' },
            },
            required: ['name', 'code'],
        },
    },
};

async function withFixtureFile(content, run) {
    const dir = await mkdtemp(resolve(tmpdir(), 'cmz-mapper-conformity-'));
    const file = resolve(dir, 'foo-create.mapper.ts');
    try {
        await writeFile(file, content, 'utf8');
        return await run(file);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
}

test('détecte un champ requis jamais assigné inconditionnellement', async () => {
    await withFixtureFile(
        `
        export function fooCreateMapper(input: unknown): unknown {
            const params = {} as FooCreateApiDto;
            if (input) {
                params.name = 'x';
            }
            params.description = 'y';
            return params;
        }
        `,
        async (file) => {
            const { violations } = checkMapperConformity({
                mapperFiles: [file],
                dtoSchema: fakeSchema,
            });
            assert.equal(violations.length, 1);
            assert.equal(violations[0].dtoTypeName, 'FooCreateApiDto');
            // `name` est assigné mais seulement dans un `if` → toujours manquant ;
            // `code` n'est jamais assigné du tout → manquant aussi.
            assert.deepEqual(violations[0].missing.sort(), ['code', 'name']);
        }
    );
});

test('ne signale rien quand tous les champs requis sont assignés inconditionnellement', async () => {
    await withFixtureFile(
        `
        export function fooCreateMapper(input: unknown): unknown {
            const params = {} as FooCreateApiDto;
            params.name = 'x';
            params.code = 'y';
            if (input) {
                params.description = 'z';
            }
            return params;
        }
        `,
        async (file) => {
            const { violations } = checkMapperConformity({
                mapperFiles: [file],
                dtoSchema: fakeSchema,
            });
            assert.deepEqual(violations, []);
        }
    );
});

test('ignore les casts vers un type qui n’est pas un DTO connu du schéma', async () => {
    await withFixtureFile(
        `
        export function fooCreateMapper(): unknown {
            const params = {} as NotADto;
            return params;
        }
        `,
        async (file) => {
            const { violations, castsChecked } = checkMapperConformity({
                mapperFiles: [file],
                dtoSchema: fakeSchema,
            });
            assert.equal(castsChecked, 0);
            assert.deepEqual(violations, []);
        }
    );
});

test('ignore les casts sur un littéral objet non vide (hors périmètre documenté)', async () => {
    await withFixtureFile(
        `
        export function fooCreateMapper(): unknown {
            const params = { name: 'x' } as FooCreateApiDto;
            return params;
        }
        `,
        async (file) => {
            const { violations, castsChecked } = checkMapperConformity({
                mapperFiles: [file],
                dtoSchema: fakeSchema,
            });
            assert.equal(castsChecked, 0);
            assert.deepEqual(violations, []);
        }
    );
});

test('violationKey est stable et unique par fichier/fonction/DTO', () => {
    const key = violationKey({
        file: 'libs/x/foo.mapper.ts',
        fnName: 'fooMapper',
        dtoTypeName: 'FooApiDto',
    });
    assert.equal(key, 'libs/x/foo.mapper.ts::fooMapper::FooApiDto');
});
