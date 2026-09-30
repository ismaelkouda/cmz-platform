import assert from 'node:assert/strict';
import test from 'node:test';

import {
    dependabotPolicyErrors,
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

function securityFixture({
    override = '^1.20.0',
    locked = '1.20.0',
    nxRange = '1.18.1',
    direct = false,
} = {}) {
    return {
        pkg: {
            devDependencies: direct ? { axios: locked } : {},
            overrides: { axios: override },
        },
        lock: {
            overrides: { axios: override },
            packages: {
                axios: [`axios@${locked}`],
                nx: ['nx@23.2.1', '', { dependencies: { axios: nxRange } }],
            },
        },
    };
}

test('accepte un plancher Axios auto-actualisable et encore nécessaire à Nx', () => {
    const { pkg, lock } = securityFixture();
    assert.deepEqual(securityResolutionPolicyErrors(pkg, lock), []);
});

test('refuse de réintroduire un pin Axios exact', () => {
    const { pkg, lock } = securityFixture({ override: '1.20.0' });
    assert.match(
        securityResolutionPolicyErrors(pkg, lock).join('\n'),
        /doit valoir '\^1\.20\.0'/
    );
});

test('refuse tout autre override de sécurité exact', () => {
    const { pkg, lock } = securityFixture();
    pkg.overrides['brace-expansion'] = '5.0.12';
    lock.overrides['brace-expansion'] = '5.0.12';
    lock.packages['brace-expansion'] = ['brace-expansion@5.0.12'];
    assert.match(
        securityResolutionPolicyErrors(pkg, lock).join('\n'),
        /overrides\.brace-expansion doit être un plancher caret/
    );
});

test('refuse une résolution Axios sous le plancher corrigé', () => {
    const { pkg, lock } = securityFixture({ locked: '1.19.0' });
    assert.match(
        securityResolutionPolicyErrors(pkg, lock).join('\n'),
        /ne respecte pas le plancher sûr/
    );
});

test('refuse une dépendance Axios directe artificielle', () => {
    const { pkg, lock } = securityFixture({ direct: true });
    assert.match(
        securityResolutionPolicyErrors(pkg, lock).join('\n'),
        /dépendance directe artificielle/
    );
});

test("refuse un lockfile qui ne matérialise pas l'override", () => {
    const { pkg, lock } = securityFixture();
    lock.overrides.axios = '1.20.0';
    assert.match(
        securityResolutionPolicyErrors(pkg, lock).join('\n'),
        /ne matérialise pas exactement/
    );
});

test("s'auto-invalide quand Nx accepte nativement la résolution sûre", () => {
    const { pkg, lock } = securityFixture({ nxRange: '^1.20.0' });
    assert.match(
        securityResolutionPolicyErrors(pkg, lock).join('\n'),
        /override est devenu inutile/
    );
});
