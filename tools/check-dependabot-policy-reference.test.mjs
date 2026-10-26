import assert from 'node:assert/strict';
import test from 'node:test';

import {
    SECURITY_OVERRIDE_MINIMUMS,
    securityResolutionPolicyErrors,
} from './check-dependabot-policy.mjs';

function securityFixture() {
    const overrides = Object.fromEntries(
        Object.entries(SECURITY_OVERRIDE_MINIMUMS).map(([name, minimum]) => [
            name,
            `^${minimum}`,
        ])
    );
    return {
        pkg: { devDependencies: {}, overrides },
        lock: {
            overrides: { ...overrides },
            packages: Object.fromEntries(
                Object.entries(SECURITY_OVERRIDE_MINIMUMS).map(
                    ([name, version]) => [name, [`${name}@${version}`]]
                )
            ),
        },
    };
}

function overrideFixture(name, range, version) {
    const { pkg, lock } = securityFixture();
    pkg.overrides[name] = range;
    lock.overrides[name] = range;
    lock.packages[name] = [name + '@' + version];
    return { pkg, lock };
}

function referenceFixture({
    name = 'vite',
    range = '^8.3.4',
    version = '8.3.4',
    field = 'devDependencies',
} = {}) {
    const { pkg, lock } = overrideFixture(name, range, version);
    pkg[field] ??= {};
    pkg[field][name] = range;
    pkg.overrides[name] = '$' + name;
    return { pkg, lock };
}

test('REFERENCE accepte le même nom direct et le verrou développé par Bun', () => {
    for (const field of [
        'dependencies',
        'devDependencies',
        'optionalDependencies',
    ]) {
        const { pkg, lock } = referenceFixture({ field });
        const before = structuredClone({ pkg, lock });
        assert.deepEqual(securityResolutionPolicyErrors(pkg, lock), []);
        assert.deepEqual({ pkg, lock }, before);
    }
});

test('REFERENCE suit une mise à jour directe sans nouveau littéral override', () => {
    const { pkg, lock } = referenceFixture({
        range: '^8.3.5',
        version: '8.3.5',
    });
    assert.equal(pkg.overrides.vite, '$vite');
    assert.deepEqual(securityResolutionPolicyErrors(pkg, lock), []);
});

test('REFERENCE refuse un autre nom et une référence sans dépendance directe', () => {
    const { pkg, lock } = referenceFixture();
    pkg.overrides.vite = '$eslint';
    assert.match(
        securityResolutionPolicyErrors(pkg, lock).join('\n'),
        /même nom exigée/
    );
    pkg.overrides.vite = '$vite';
    delete pkg.devDependencies.vite;
    assert.match(
        securityResolutionPolicyErrors(pkg, lock).join('\n'),
        /même nom exigée/
    );
});

test('REFERENCE refuse le caret désaligné de la PR322 même si le lock le satisfait', () => {
    const { pkg, lock } = overrideFixture('vite', '^8.3.4', '8.3.5');
    pkg.devDependencies.vite = '^8.3.5';
    assert.match(
        securityResolutionPolicyErrors(pkg, lock).join('\n'),
        /doit reprendre exactement devDependencies.vite/
    );
    pkg.overrides.vite = '^8.3.5';
    lock.overrides.vite = '^8.3.5';
    assert.deepEqual(securityResolutionPolicyErrors(pkg, lock), []);
});

test('REFERENCE conserve le contrôle de la dernière copie et des identités réelles', () => {
    const { pkg, lock } = referenceFixture();
    lock.packages['consumer/vite'] = ['vite@8.3.5'];
    lock.packages['last-context'] = ['vite@8.3.0'];
    assert.match(
        securityResolutionPolicyErrors(pkg, lock).join('\n'),
        /vite@8\.3\.0.*last-context.*ne respecte pas \^8\.3\.4/
    );
    lock.packages['last-context'] = ['vite@8.3.5'];
    assert.deepEqual(securityResolutionPolicyErrors(pkg, lock), []);
});

test('REFERENCE exige le range développé exact du verrou et une plage caret', () => {
    const { pkg, lock } = referenceFixture();
    lock.overrides.vite = '$vite';
    assert.match(
        securityResolutionPolicyErrors(pkg, lock).join('\n'),
        /ne matérialise pas exactement overrides.vite/
    );
    lock.overrides.vite = '^8.3.4';
    pkg.devDependencies.vite = '*';
    assert.match(
        securityResolutionPolicyErrors(pkg, lock).join('\n'),
        /plancher caret auto-actualisable/
    );
});

test('REFERENCE ne transforme pas une transitive gouvernée en directe', () => {
    const { pkg, lock } = securityFixture();
    pkg.devDependencies['js-yaml'] = '^4.3.2';
    pkg.overrides['js-yaml'] = '$js-yaml';
    assert.match(
        securityResolutionPolicyErrors(pkg, lock).join('\n'),
        /est gouverné comme dépendance transitive/
    );
});

test('REFERENCE refuse une déclaration directe ambiguë', () => {
    const { pkg, lock } = referenceFixture();
    pkg.dependencies = { vite: '^8.3.5' };
    assert.match(
        securityResolutionPolicyErrors(pkg, lock).join('\n'),
        /dépendance directe vite ambiguë/
    );
});
