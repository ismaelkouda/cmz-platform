import assert from 'node:assert/strict';
import test from 'node:test';

import { validateSvgoOverrideContract } from './check-security-overrides.mjs';

function valid(overrides = {}) {
    return {
        rootManifest: { overrides: { svgo: '4.1.0' } },
        lockfile: {
            overrides: { svgo: '4.1.0' },
            packages: { svgo: ['svgo@4.1.0'] },
        },
        svgrManifest: { dependencies: { svgo: '^3.0.2' } },
        postcssSvgoManifest: { dependencies: { svgo: '^4.0.1' } },
        svgrResolvedVersion: '4.1.0',
        postcssResolvedVersion: '4.1.0',
        ...overrides,
    };
}

test('accepte la version corrigée après preuve des deux consommateurs', () => {
    const proof = validateSvgoOverrideContract(valid());
    assert.equal(proof.override, '4.1.0');
});

test('refuse un override vulnérable ou une plage flottante', () => {
    assert.throws(
        () =>
            validateSvgoOverrideContract(
                valid({ rootManifest: { overrides: { svgo: '4.0.1' } } })
            ),
        /sous la première version corrigée/
    );
    assert.throws(
        () =>
            validateSvgoOverrideContract(
                valid({ rootManifest: { overrides: { svgo: '^4.1.0' } } })
            ),
        /version exacte/
    );
});

test('refuse un lockfile qui ne matérialise pas exactement l’override', () => {
    assert.throws(
        () =>
            validateSvgoOverrideContract(
                valid({
                    lockfile: {
                        overrides: { svgo: '4.1.0' },
                        packages: { svgo: ['svgo@4.0.1'] },
                    },
                })
            ),
        /verrouille svgo@4\.0\.1/
    );
});

test('refuse toute dérive des plages amont', () => {
    assert.throws(
        () =>
            validateSvgoOverrideContract(
                valid({
                    postcssSvgoManifest: {
                        dependencies: { svgo: '^5.0.0' },
                    },
                })
            ),
        /postcss-svgo déclare/
    );
    assert.throws(
        () =>
            validateSvgoOverrideContract(
                valid({
                    svgrManifest: { dependencies: { svgo: '^4.0.0' } },
                })
            ),
        /preuve exceptionnelle est périmée/
    );
});

test('refuse une installation locale qui conserve une ancienne résolution', () => {
    assert.throws(
        () =>
            validateSvgoOverrideContract(
                valid({ svgrResolvedVersion: '3.3.5' })
            ),
        /@svgr\/plugin-svgo résout svgo@3\.3\.5/
    );
});
