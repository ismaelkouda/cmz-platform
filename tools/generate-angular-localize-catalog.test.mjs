import assert from 'node:assert/strict';
import { existsSync, globSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

const ROOT = new URL('..', import.meta.url).pathname;
const SOURCE = join(
    ROOT,
    'apps/backoffice-angular/src/locale/messages.fr.source.json'
);
const GENERATED_INDEX = join(
    ROOT,
    'apps/backoffice-angular/src/app/i18n/messages.fr.generated.ts'
);
const GENERATED_DIRECTORY = join(ROOT, 'apps/backoffice-angular/src/app/i18n');

function flatten(node, prefix = '', target = new Map()) {
    for (const [segment, value] of Object.entries(node)) {
        const key = prefix ? `${prefix}.${segment}` : segment;
        if (typeof value === 'string') target.set(key, value);
        else flatten(value, key, target);
    }
    return target;
}

test('le catalogue Angular généré est frais et couvre chaque feuille source', () => {
    const check = spawnSync(
        process.execPath,
        ['tools/generate-angular-localize-catalog.mjs', '--check'],
        { cwd: ROOT, encoding: 'utf8' }
    );
    assert.equal(check.status, 0, check.stderr || check.stdout);

    const source = flatten(JSON.parse(readFileSync(SOURCE, 'utf8')));
    const packs = globSync('messages.fr.pack-*.generated.ts', {
        cwd: GENERATED_DIRECTORY,
    }).sort();
    assert.deepEqual(packs, [
        'messages.fr.pack-001.generated.ts',
        'messages.fr.pack-002.generated.ts',
        'messages.fr.pack-003.generated.ts',
        'messages.fr.pack-004.generated.ts',
    ]);
    const ids = packs.flatMap((pack) => {
        const generated = readFileSync(join(GENERATED_DIRECTORY, pack), 'utf8');
        assert.ok(
            generated.split('\n').length <= 800,
            `${pack} dépasse le plafond de 800 lignes`
        );
        return [...generated.matchAll(/\$localize`:@@([^:]+):/g)].map(
            (match) => match[1]
        );
    });
    const index = readFileSync(GENERATED_INDEX, 'utf8');

    assert.equal(ids.length, source.size);
    assert.deepEqual([...ids].sort(), [...source.keys()].sort());
    assert.doesNotMatch(index, /\$localize`/);
    for (const pack of packs) {
        assert.match(index, new RegExp(pack.replace('.ts', '')));
    }
});

test('Angular ne conserve ni runtime Transloco ni dictionnaire public', () => {
    const activeFiles = globSync('{apps,libs,tools}/**/*.{ts,mjs,json}', {
        cwd: ROOT,
    }).filter((path) => !path.endsWith('.test.mjs'));
    const offenders = activeFiles.filter((path) =>
        /(?:from\s+['"]@jsverse\/transloco|"@jsverse\/transloco"|provideTransloco|TranslocoService)/.test(
            readFileSync(join(ROOT, path), 'utf8')
        )
    );
    assert.deepEqual(offenders, []);
    assert.doesNotMatch(
        readFileSync(join(ROOT, 'package.json'), 'utf8'),
        /"@jsverse\/transloco"/
    );
    assert.equal(
        existsSync(join(ROOT, 'apps/backoffice-angular/public/i18n/fr.json')),
        false
    );
    assert.equal(
        existsSync(
            join(ROOT, 'apps/users-management-proof/public/i18n/fr.json')
        ),
        false
    );
});
