import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    catalogRangeIsBounded,
    findDuplicateKeys,
    parseWithoutDuplicateKeys,
    verifyResolvedVersion,
} from './check-library-setup-deps.mjs';

// Suite 3/3 : primitives pures de check-library-setup-deps.mjs.
// (verifyApps → -apps.test.mjs ; validateRecipes → .test.mjs)

const has = (result) => result.length > 0;
const rec = (identifier) => [identifier, '', {}, 'sha'];

test('catalogRangeIsBounded : borne basse EFFECTIVE (0.0.0 exclu, sauf exact)', () => {
    for (const bounded of [
        '0.0.0', // exact : accepté même s'il vaut 0.0.0
        '1.2.3',
        '^1.2.0',
        '~1.2.0',
        '~0.0.5', // >=0.0.5 <0.1.0-0 : 0.0.0 exclu
        '^0.5.0', // >=0.5.0 <0.6.0-0
        '1.x',
        '>=1 <10000', // très large mais bornée des deux côtés
        '>=22 <23',
        '1.2.3 - 2.3.4',
        '>=1.0.0 <2.0.0||>=3.0.0 <4.0.0',
    ]) {
        assert.equal(catalogRangeIsBounded(bounded), true, bounded);
    }
    for (const unbounded of [
        '*',
        'x',
        '0', // >=0.0.0 <1.0.0-0 : accepte 0.0.0
        '0.x', // idem
        '>=0.0.0 <23', // borne basse non effective
        '>=0.0.0-0 <23', // semver simplifie en `<23`
        '>=10000', // pas de plafond
        '>9999.9999.9999',
        '>=1.0.0 <2.0.0||>=3.0.0', // une branche sans plafond
        'not-a-range',
        '',
    ]) {
        assert.equal(catalogRangeIsBounded(unbounded), false, unbounded);
    }
});

test('findDuplicateKeys : simple, imbriquée, structurelle ; frères de tableau OK', () => {
    assert.equal(findDuplicateKeys('{"a":1,"a":2}').length, 1);
    assert.equal(findDuplicateKeys('{"x":{"b":1,"b":2}}')[0].key, 'b');
    assert.equal(
        findDuplicateKeys(
            '{"dependencies":{"p":"1"},"dependencies":{"p":"2"}}'
        )[0].key,
        'dependencies'
    );
    assert.deepEqual(findDuplicateKeys('[{"a":1},{"a":2}]'), []);
    assert.throws(
        () => parseWithoutDuplicateKeys('{"a":1,"a":2}', 'x'),
        /clé dupliquée "a"/
    );
    assert.throws(
        () => parseWithoutDuplicateKeys('{"a":1', 'x'),
        /syntaxe invalide/
    );
});

test('verifyResolvedVersion : contre-tests SemVer (revues 4 à 7)', () => {
    // revue 4 — les 5 exemples
    assert.ok(has(verifyResolvedVersion('p', '1.2.3', rec('p@1.2.3-beta.1'))));
    assert.ok(has(verifyResolvedVersion('p', '1.2.3', rec('p@1.2.3garbage'))));
    assert.ok(has(verifyResolvedVersion('p', '1.2.3', rec('malformed'))));
    assert.ok(has(verifyResolvedVersion('p', 123, rec('p@1.2.3'))));

    // revue 5 — identité / forme du record ; déclarations multiples
    assert.ok(has(verifyResolvedVersion('p', '1.2.3', rec('autre@1.2.3'))));
    assert.ok(has(verifyResolvedVersion('p', '1.2.3', 'p@1.2.3')));
    assert.ok(has(verifyResolvedVersion('p', '1.2.3', [])));
    assert.ok(has(verifyResolvedVersion('p', '1.2.3', [123])));

    // revues 6 & 7 — bornage via new semver.Range().set
    assert.ok(has(verifyResolvedVersion('p', '>=0.0.0-0', rec('p@1.2.3'))));
    assert.ok(has(verifyResolvedVersion('p', '>0.0.0', rec('p@1.2.3'))));
    assert.ok(has(verifyResolvedVersion('p', '>=22', rec('p@22.5.0'))));
    assert.ok(
        has(verifyResolvedVersion('p', '>9999.9999.9999', rec('p@1.0.0')))
    );
    assert.ok(has(verifyResolvedVersion('p', '>=10000', rec('p@10000.0.0'))));
    assert.ok(
        has(verifyResolvedVersion('p', '>=0.0.0-0 <23', rec('p@22.0.0')))
    );
    assert.ok(
        has(
            verifyResolvedVersion(
                'p',
                '>=1.0.0 <2.0.0||>=3.0.0',
                rec('p@1.5.0')
            )
        )
    );

    // formes légitimes
    assert.deepEqual(verifyResolvedVersion('p', '1.2.3', rec('p@1.2.3')), []);
    assert.deepEqual(verifyResolvedVersion('p', '^1.2.0', rec('p@1.9.9')), []);
    assert.ok(has(verifyResolvedVersion('p', '^1.2.0', rec('p@2.0.0'))));
    assert.deepEqual(
        verifyResolvedVersion('p', '>=1 <10000', rec('p@5.0.0')),
        []
    );
    assert.deepEqual(
        verifyResolvedVersion(
            'p',
            '>=1.0.0 <2.0.0||>=3.0.0 <4.0.0',
            rec('p@1.5.0')
        ),
        []
    );
    assert.deepEqual(
        verifyResolvedVersion('p', '>=22 <23', rec('p@22.5.0')),
        []
    );
    assert.deepEqual(
        verifyResolvedVersion('p', '1.2.3 - 2.3.4', rec('p@2.0.0')),
        []
    );
    assert.deepEqual(
        verifyResolvedVersion('@a/b', '1.2.3', rec('@a/b@1.2.3')),
        []
    );
    assert.ok(has(verifyResolvedVersion('p', 'not-a-version', rec('p@1.2.3'))));
});
