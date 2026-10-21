import assert from 'node:assert/strict';
import test from 'node:test';

import {
    COHERENT_UPDATE_GROUPS,
    dependabotPolicyErrors,
    requiredLockConsumers,
    SECURITY_OVERRIDE_MINIMUMS,
    securityResolutionPolicyErrors,
} from './check-dependabot-policy.mjs';

function fixture({ patterns, react = '19.3.0', reactDom = react } = {}) {
    const framework = '22.2.0';
    return {
        config: {
            version: 2,
            updates: [
                {
                    'package-ecosystem': 'bun',
                    directory: '/',
                    groups: {
                        react: {
                            patterns: patterns ?? [
                                'react',
                                'react-dom',
                                '@types/react',
                                '@types/react-dom',
                            ],
                        },
                        angular: {
                            patterns: [
                                '@angular/*',
                                '@angular-devkit/*',
                                '@schematics/angular',
                            ],
                        },
                        ...Object.fromEntries(
                            Object.entries(COHERENT_UPDATE_GROUPS).map(
                                ([name, groupPatterns]) => [
                                    name,
                                    {
                                        patterns: [...groupPatterns],
                                        'update-types': ['minor', 'patch'],
                                    },
                                ]
                            )
                        ),
                    },
                },
            ],
        },
        pkg: {
            devDependencies: {
                react,
                'react-dom': reactDom,
            },
            workspaces: {
                catalog: {
                    '@angular/animations': framework,
                    '@angular/cdk': '22.2.1',
                    '@angular/common': framework,
                    '@angular/compiler': framework,
                    '@angular/core': framework,
                    '@angular/forms': framework,
                    '@angular/localize': framework,
                    '@angular/material': '22.2.1',
                    '@angular/platform-browser': framework,
                    '@angular/router': framework,
                    '@angular/service-worker': framework,
                },
                catalogs: {
                    tooling: Object.fromEntries(
                        [
                            '@angular-devkit/core',
                            '@angular-devkit/schematics',
                            '@angular/build',
                            '@angular/cli',
                            '@angular/compiler-cli',
                            '@angular/language-service',
                            '@schematics/angular',
                        ].map((name) => [name, framework])
                    ),
                },
            },
        },
    };
}

test('accepte un groupe React complet et des runtimes alignés', () => {
    const { config, pkg } = fixture();
    assert.deepEqual(dependabotPolicyErrors(config, pkg), []);
});

test('refuse un membre manquant dans le groupe atomique', () => {
    const { config, pkg } = fixture({
        patterns: ['react', 'react-dom', '@types/react'],
    });
    assert.match(
        dependabotPolicyErrors(config, pkg).join('\n'),
        /'@types\/react-dom' manque/
    );
});

test('refuse un membre React revendiqué par plusieurs groupes', () => {
    const { config, pkg } = fixture();
    config.updates[0].groups.other = { patterns: ['react-dom'] };
    assert.match(
        dependabotPolicyErrors(config, pkg).join('\n'),
        /'react-dom' doit appartenir uniquement/
    );
});

test('refuse des versions runtime React différentes', () => {
    const { config, pkg } = fixture({ reactDom: '19.2.8' });
    assert.match(
        dependabotPolicyErrors(config, pkg).join('\n'),
        /react=19\.3\.0, react-dom=19\.2\.8/
    );
});

test('refuse un groupe Angular qui oublie les schematics hors namespace', () => {
    const { config, pkg } = fixture();
    config.updates[0].groups.angular.patterns.pop();
    assert.match(
        dependabotPolicyErrors(config, pkg).join('\n'),
        /'@schematics\/angular' manque/
    );
});

test('refuse un bloc de mises à jour cohérent incomplet', () => {
    const { config, pkg } = fixture();
    config.updates[0].groups['unit-testing'].patterns.pop();
    assert.match(
        dependabotPolicyErrors(config, pkg).join('\n'),
        /groupe 'unit-testing' incomplet : '@testing-library\/\*' manque/
    );
});

test('refuse de mélanger les mises à jour majeures aux blocs courants', () => {
    const { config, pkg } = fixture();
    config.updates[0].groups['code-quality']['update-types'].push('major');
    assert.match(
        dependabotPolicyErrors(config, pkg).join('\n'),
        /doit limiter update-types à minor et patch/
    );
});

test('refuse un pattern revendiqué par plusieurs blocs', () => {
    const { config, pkg } = fixture();
    config.updates[0].groups['browser-e2e'].patterns.push('vitest');
    assert.match(
        dependabotPolicyErrors(config, pkg).join('\n'),
        /'vitest' doit appartenir uniquement au groupe 'unit-testing'/
    );
});

test('refuse un élargissement de bloc non formalisé', () => {
    const { config, pkg } = fixture();
    config.updates[0].groups['unit-testing'].patterns.push('jsdom');
    assert.match(
        dependabotPolicyErrors(config, pkg).join('\n'),
        /'jsdom' est inattendu/
    );
});

test('refuse un framework ou un tooling Angular désaligné', () => {
    const { config, pkg } = fixture();
    pkg.workspaces.catalog['@angular/router'] = '22.1.7';
    pkg.workspaces.catalogs.tooling['@angular/cli'] = '22.1.7';
    const errors = dependabotPolicyErrors(config, pkg).join('\n');
    assert.match(errors, /framework désalignée.*@angular\/router/);
    assert.match(errors, /tooling désalignée.*@angular\/cli/);
});

test('refuse Material et CDK désalignés', () => {
    const { config, pkg } = fixture();
    pkg.workspaces.catalog['@angular/cdk'] = '22.2.0';
    assert.match(
        dependabotPolicyErrors(config, pkg).join('\n'),
        /Angular Material désalignée/
    );
});

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

test('accepte les planchers installés et conformes sans dépendre d’un consommateur nommé', () => {
    const { pkg, lock } = securityFixture();
    assert.deepEqual(securityResolutionPolicyErrors(pkg, lock), []);
});

test('refuse un pin exact pour chacun des minimums gouvernés', () => {
    for (const [name, minimum] of Object.entries(SECURITY_OVERRIDE_MINIMUMS)) {
        const { pkg, lock } = securityFixture();
        pkg.overrides[name] = minimum;
        lock.overrides[name] = minimum;
        assert.ok(
            securityResolutionPolicyErrors(pkg, lock).some((error) =>
                error.includes(`overrides.${name} doit valoir '^${minimum}'`)
            ),
            name
        );
    }
});

test('refuse aussi un plancher exact ajouté hors de la table des minimums', () => {
    const { pkg, lock } = securityFixture();
    pkg.overrides['fixture-floor'] = '2.0.0';
    lock.overrides['fixture-floor'] = '2.0.0';
    lock.packages['fixture-floor'] = ['fixture-floor@2.0.0'];
    assert.deepEqual(securityResolutionPolicyErrors(pkg, lock), [
        'overrides.fixture-floor doit être un plancher caret auto-actualisable, trouvé 2.0.0',
    ]);
});

test('refuse une résolution transitive sous son minimum de sécurité', () => {
    const { pkg, lock } = securityFixture();
    lock.packages['source-map-js'] = ['source-map-js@1.2.1'];
    assert.match(
        securityResolutionPolicyErrors(pkg, lock).join('\n'),
        /source-map-js@1\.2\.1 est sous le plancher sûr 1\.2\.2/
    );
});

test('refuse une résolution qui ne satisfait pas la plage déclarée', () => {
    const { pkg, lock } = securityFixture();
    pkg.overrides['fixture-floor'] = '^2.0.0';
    lock.overrides['fixture-floor'] = '^2.0.0';
    lock.packages['fixture-floor'] = ['fixture-floor@1.0.0'];
    assert.deepEqual(securityResolutionPolicyErrors(pkg, lock), [
        'fixture-floor@1.0.0 ne respecte pas ^2.0.0',
    ]);
});

test('refuse et nomme un plancher dormant sans consommateur requis', () => {
    const { pkg, lock } = securityFixture();
    pkg.overrides['fixture-floor'] = '^2.0.0';
    lock.overrides['fixture-floor'] = '^2.0.0';
    assert.deepEqual(requiredLockConsumers(lock, 'fixture-floor'), []);
    assert.deepEqual(securityResolutionPolicyErrors(pkg, lock), [
        'overrides.fixture-floor doit être retiré : paquet absent de packages dans bun.lock',
    ]);
});

test('F-2 : absent, override et minimum présents, une seule consigne nomme les deux retraits', () => {
    for (const name of Object.keys(SECURITY_OVERRIDE_MINIMUMS)) {
        const { pkg, lock } = securityFixture();
        delete lock.packages[name];
        assert.deepEqual(securityResolutionPolicyErrors(pkg, lock), [
            `overrides.${name} et SECURITY_OVERRIDE_MINIMUMS.${name} doivent être retirés : paquet absent de packages dans bun.lock`,
        ]);
    }
});

test('F-2 : absent, override retiré, seul le minimum est nommé sans exiger le plancher', () => {
    for (const name of Object.keys(SECURITY_OVERRIDE_MINIMUMS)) {
        const { pkg, lock } = securityFixture();
        delete lock.packages[name];
        delete pkg.overrides[name];
        delete lock.overrides[name];
        assert.deepEqual(securityResolutionPolicyErrors(pkg, lock), [
            `SECURITY_OVERRIDE_MINIMUMS.${name} doit être retiré : paquet absent de packages dans bun.lock`,
        ]);
    }
});

test('F-2 : absent, override et minimum retirés, aucune erreur pour ce nom', () => {
    const { pkg, lock } = securityFixture();
    const name = 'proxy-addr';
    assert.equal(Object.hasOwn(SECURITY_OVERRIDE_MINIMUMS, name), false);
    assert.equal(Object.hasOwn(pkg.overrides, name), false);
    assert.equal(Object.hasOwn(lock.packages, name), false);
    assert.deepEqual(securityResolutionPolicyErrors(pkg, lock), []);
});

test('R-3 : un paquet scopé de même suffixe ne prouve pas la présence du paquet à plancher', () => {
    const { pkg, lock } = securityFixture();
    delete lock.packages['js-yaml'];
    lock.packages['@zkochan/js-yaml'] = [
        `@zkochan/js-yaml@${SECURITY_OVERRIDE_MINIMUMS['js-yaml']}`,
    ];
    assert.deepEqual(securityResolutionPolicyErrors(pkg, lock), [
        'overrides.js-yaml et SECURITY_OVERRIDE_MINIMUMS.js-yaml doivent être retirés : paquet absent de packages dans bun.lock',
    ]);
});

test('F-3 : refuse un verrou incohérent avec un consommateur requis sans conseiller le retrait', () => {
    const { pkg, lock } = securityFixture();
    delete lock.packages['js-yaml'];
    lock.packages.consumer = [
        'consumer@1.0.0',
        '',
        { dependencies: { 'js-yaml': '^4.3.2' } },
    ];
    assert.deepEqual(requiredLockConsumers(lock, 'js-yaml'), ['consumer']);
    assert.deepEqual(securityResolutionPolicyErrors(pkg, lock), [
        'bun.lock incohérent : js-yaml absent de packages, requis par: consumer',
    ]);
});

test('F-3 : nomme le workspace requis dans le verrou incohérent sans conseiller le retrait', () => {
    const { pkg, lock } = securityFixture();
    delete lock.packages['js-yaml'];
    lock.workspaces = {
        'apps/proof': { devDependencies: { 'js-yaml': '^4.3.2' } },
    };
    assert.deepEqual(requiredLockConsumers(lock, 'js-yaml'), [
        'workspace:apps/proof',
    ]);
    assert.deepEqual(securityResolutionPolicyErrors(pkg, lock), [
        'bun.lock incohérent : js-yaml absent de packages, requis par: workspace:apps/proof',
    ]);
});

test('distingue une entrée présente mal formée d’un paquet absent', () => {
    const { pkg, lock } = securityFixture();
    lock.packages['js-yaml'] = [42];
    assert.deepEqual(securityResolutionPolicyErrors(pkg, lock), [
        'résolution js-yaml absente ou invalide dans bun.lock (42), requise par: entrée présente mal formée',
    ]);
});

test('F-2 : installé, override retiré, exige toujours le plancher de sécurité', () => {
    const { pkg, lock } = securityFixture();
    delete pkg.overrides['js-yaml'];
    delete lock.overrides['js-yaml'];
    assert.match(
        securityResolutionPolicyErrors(pkg, lock).join('\n'),
        /overrides\.js-yaml doit valoir '\^4\.3\.2'/
    );
});

test('refuse une dépendance transitive gouvernée ajoutée directement', () => {
    const { pkg, lock } = securityFixture();
    pkg.devDependencies['js-yaml'] = SECURITY_OVERRIDE_MINIMUMS['js-yaml'];
    assert.match(
        securityResolutionPolicyErrors(pkg, lock).join('\n'),
        /js-yaml est gouverné comme dépendance transitive/
    );
});

test("refuse un lockfile qui ne matérialise pas exactement l'override", () => {
    const { pkg, lock } = securityFixture();
    lock.overrides['js-yaml'] = '4.3.2';
    assert.match(
        securityResolutionPolicyErrors(pkg, lock).join('\n'),
        /ne matérialise pas exactement overrides\.js-yaml/
    );
});

function overrideFixture(name, range, version) {
    const { pkg, lock } = securityFixture();
    pkg.overrides[name] = range;
    lock.overrides[name] = range;
    lock.packages[name] = [name + '@' + version];
    return { pkg, lock };
}

test('NESTED A2 : contrôle la dernière copie et ne modifie pas les entrées', () => {
    const { pkg, lock } = overrideFixture('vite', '^8.3.4', '8.3.4');
    lock.packages['first/vite'] = ['vite@8.3.4'];
    lock.packages['last/vite'] = ['vite@8.3.5'];
    assert.deepEqual(securityResolutionPolicyErrors(pkg, lock), []);

    lock.packages['last/vite'] = ['vite@8.3.0'];
    const before = structuredClone({ pkg, lock });
    const errors = securityResolutionPolicyErrors(pkg, lock).join('\n');
    assert.deepEqual({ pkg, lock }, before);
    assert.match(errors, /last\/vite/);
    assert.match(errors, /vite@8\.3\.0/);
    assert.ok(errors.includes('^8.3.4'));
});

test('NESTED A3 : refuse le Vite imbriqué même sans minimum ni avis réseau', () => {
    const { pkg, lock } = overrideFixture('vite', '^8.3.4', '8.3.4');
    assert.equal(Object.hasOwn(SECURITY_OVERRIDE_MINIMUMS, 'vite'), false);
    lock.packages['@angular/build/vite'] = ['vite@8.3.0'];
    const errors = securityResolutionPolicyErrors(pkg, lock).join('\n');
    assert.ok(errors.includes('@angular/build/vite'));
    assert.ok(errors.includes('vite@8.3.0'));
    assert.ok(errors.includes('^8.3.4'));
});

test('NESTED A4 : applique le minimum sûr à chaque copie', () => {
    const { pkg, lock } = securityFixture();
    const minimum = SECURITY_OVERRIDE_MINIMUMS['js-yaml'];
    lock.packages['first/js-yaml'] = ['js-yaml@' + minimum];
    lock.packages['last/js-yaml'] = ['js-yaml@4.3.1'];
    const errors = securityResolutionPolicyErrors(pkg, lock).join('\n');
    assert.ok(errors.includes('last/js-yaml'));
    assert.ok(errors.includes('js-yaml@4.3.1'));
    assert.ok(errors.includes('plancher sûr ' + minimum));
});

test('NESTED A5 : une copie seulement imbriquée existe et doit satisfaire son override', () => {
    const { pkg, lock } = overrideFixture('vite', '^8.3.4', '8.3.4');
    delete lock.packages.vite;
    lock.packages['@angular/build/vite'] = ['vite@8.3.4'];
    assert.deepEqual(securityResolutionPolicyErrors(pkg, lock), []);

    lock.packages['@angular/build/vite'] = ['vite@8.3.0'];
    const errors = securityResolutionPolicyErrors(pkg, lock).join('\n');
    assert.ok(errors.includes('@angular/build/vite'));
    assert.ok(errors.includes('vite@8.3.0'));
    assert.ok(!errors.includes('doit être retiré'));
    assert.ok(!errors.includes('absent de packages'));
});

test('NESTED A5 : le minimum reste exigé pour une présence seulement imbriquée', () => {
    const { pkg, lock } = securityFixture();
    const minimum = SECURITY_OVERRIDE_MINIMUMS['js-yaml'];
    delete lock.packages['js-yaml'];
    lock.packages['consumer/js-yaml'] = ['js-yaml@' + minimum];
    assert.deepEqual(securityResolutionPolicyErrors(pkg, lock), []);

    delete pkg.overrides['js-yaml'];
    delete lock.overrides['js-yaml'];
    const errors = securityResolutionPolicyErrors(pkg, lock).join('\n');
    assert.ok(
        errors.includes("overrides.js-yaml doit valoir '^" + minimum + "'")
    );
    assert.ok(!errors.includes('doivent être retirés'));
    assert.ok(!errors.includes('doit être retiré'));
});

test('NESTED A6 : les noms scopés étrangers ne sont ni des copies ni une présence', () => {
    const { pkg, lock } = overrideFixture('vite', '^8.3.4', '8.3.4');
    lock.packages['@nx/vite'] = ['@nx/vite@0.0.1'];
    lock.packages['parent/@tailwindcss/vite'] = ['@tailwindcss/vite@0.0.1'];
    lock.packages['@zkochan/js-yaml'] = ['@zkochan/js-yaml@0.0.7'];
    assert.deepEqual(securityResolutionPolicyErrors(pkg, lock), []);

    delete lock.packages.vite;
    assert.deepEqual(securityResolutionPolicyErrors(pkg, lock), [
        'overrides.vite doit être retiré : paquet absent de packages dans bun.lock',
    ]);
});

test('NESTED A6 : contrôle aussi les copies d’un paquet gouverné scopé', () => {
    const name = '@fixture/scoped';
    const { pkg, lock } = overrideFixture(name, '^2.0.0', '2.0.0');
    lock.packages['consumer/@fixture/scoped'] = [name + '@2.1.0'];
    assert.deepEqual(securityResolutionPolicyErrors(pkg, lock), []);

    lock.packages['consumer/@fixture/scoped'] = [name + '@1.9.0'];
    const errors = securityResolutionPolicyErrors(pkg, lock).join('\n');
    assert.ok(errors.includes('consumer/@fixture/scoped'));
    assert.ok(errors.includes(name + '@1.9.0'));
    assert.ok(errors.includes('^2.0.0'));
});

test('NESTED A7 : l’identité réelle est contrôlée même sous une autre clé', () => {
    const { pkg, lock } = overrideFixture('vite', '^8.3.4', '8.3.4');
    lock.packages['unrelated-context'] = ['vite@8.3.0'];
    const errors = securityResolutionPolicyErrors(pkg, lock).join('\n');
    assert.ok(errors.includes('unrelated-context'));
    assert.ok(errors.includes('vite@8.3.0'));
});

test('NESTED A7 : une version imbriquée invalide ne doit pas disparaître du contrôle', () => {
    const { pkg, lock } = overrideFixture('vite', '^8.3.4', '8.3.4');
    lock.packages['consumer/vite'] = ['vite@not-a-version'];
    const errors = securityResolutionPolicyErrors(pkg, lock).join('\n');
    assert.ok(errors.includes('consumer/vite'));
    assert.ok(errors.includes('vite@not-a-version'));
    assert.ok(errors.includes('absente ou invalide'));
});

test('NESTED A7 : une copie valide ne masque pas une racine malformée', () => {
    const { pkg, lock } = overrideFixture('vite', '^8.3.4', '8.3.4');
    lock.packages.vite = [42];
    lock.packages['consumer/vite'] = ['vite@8.3.4'];
    assert.match(
        securityResolutionPolicyErrors(pkg, lock).join('\n'),
        /résolution vite absente ou invalide dans bun\.lock \(42\)/
    );
});
