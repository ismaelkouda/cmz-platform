import assert from 'node:assert/strict';
import test from 'node:test';

import { dependabotPolicyErrors } from './check-dependabot-policy.mjs';
import { fixture } from './test-support/dependabot-policy-fixture.mjs';

test('PEER-GRAPH : accepte un outillage compatible décalé du framework', () => {
    const { config, pkg, lock } = fixture({ framework: '22.2.3' });
    for (const name of ['@angular/build', '@angular/cli']) {
        pkg.workspaces.catalogs.tooling[name] = '22.2.4';
        lock.packages[name][0] = `${name}@22.2.4`;
    }
    const before = structuredClone({ config, pkg, lock });
    assert.deepEqual(dependabotPolicyErrors(config, pkg, lock), []);
    assert.deepEqual({ config, pkg, lock }, before);
});

test('PEER-GRAPH : refuse un framework dont le pair exact est incompatible', () => {
    const { config, pkg, lock } = fixture();
    lock.packages['@angular/router'][0] = '@angular/router@22.1.7';
    lock.packages['@angular/router'][2].peerDependencies['@angular/core'] =
        '22.1.7';
    assert.match(
        dependabotPolicyErrors(config, pkg, lock).join('\n'),
        /pair de @angular\/router : @angular\/core@22\.2\.0.*ne respecte pas 22\.1\.7/
    );
});

test('PEER-GRAPH : refuse un outillage dont le pair est incompatible', () => {
    const { config, pkg, lock } = fixture();
    lock.packages['@angular/build'][2].peerDependencies['@angular/core'] =
        '^23';
    assert.match(
        dependabotPolicyErrors(config, pkg, lock).join('\n'),
        /pair de @angular\/build : @angular\/core@22\.2\.0.*ne respecte pas \^23/
    );
});

test('refuse Material et CDK désalignés selon le pair publié', () => {
    const { config, pkg, lock } = fixture();
    lock.packages['@angular/cdk'][0] = '@angular/cdk@22.2.0';
    assert.match(
        dependabotPolicyErrors(config, pkg, lock).join('\n'),
        /pair de @angular\/material : @angular\/cdk@22\.2\.0.*ne respecte pas 22\.2\.1/
    );
});

function graphFixture() {
    const value = fixture();
    value.config.updates[0].groups.angular.patterns.push('@fixture/*');
    value.lock.packages['@fixture/consumer'] = [
        '@fixture/consumer@1.0.0',
        '',
        { peerDependencies: { '@fixture/runtime': '^2' } },
    ];
    value.lock.packages['@fixture/runtime'] = [
        '@fixture/runtime@2.4.0',
        '',
        {},
    ];
    return value;
}

test('PEER-GRAPH : dérive aussi un nouveau paquet et sa plage sans table', () => {
    const { config, pkg, lock } = graphFixture();
    assert.deepEqual(dependabotPolicyErrors(config, pkg, lock), []);
    lock.packages['@fixture/runtime'][0] = '@fixture/runtime@1.9.0';
    assert.match(
        dependabotPolicyErrors(config, pkg, lock).join('\n'),
        /@fixture\/runtime@1\.9\.0.*ne respecte pas \^2/
    );
});

test('PEER-GRAPH : contrôle aussi le consommateur extérieur du groupe', () => {
    const { config, pkg, lock } = fixture();
    lock.packages.outside = [
        'outside@1.0.0',
        '',
        { peerDependencies: { '@angular/core': '^23' } },
    ];
    assert.match(
        dependabotPolicyErrors(config, pkg, lock).join('\n'),
        /pair de outside : @angular\/core@22\.2\.0.*ne respecte pas \^23/
    );
});

test('PEER-GRAPH : ne transforme pas le lot Angular en validation de tous les pairs', () => {
    const { config, pkg, lock } = fixture();
    lock.packages.outside = [
        'outside@1.0.0',
        '',
        { peerDependencies: { 'outside-runtime': '^1' } },
    ];
    assert.deepEqual(dependabotPolicyErrors(config, pkg, lock), []);
});

test('PEER-GRAPH : contrôle aussi TypeScript et RxJS demandés par Angular', () => {
    const { config, pkg, lock } = fixture();
    lock.packages.typescript[0] = 'typescript@7.0.2';
    lock.packages.rxjs[0] = 'rxjs@6.6.7';
    const errors = dependabotPolicyErrors(config, pkg, lock).join('\n');
    assert.match(errors, /@angular\/compiler-cli : typescript@7\.0\.2/);
    assert.match(errors, /@angular\/core : rxjs@6\.6\.7/);
});

test('PEER-GRAPH : résout la copie imbriquée avant la racine incompatible', () => {
    const { config, pkg, lock } = graphFixture();
    lock.packages['@fixture/runtime'][0] = '@fixture/runtime@1.0.0';
    lock.packages['@fixture/consumer/@fixture/runtime'] = [
        '@fixture/runtime@2.2.0',
        '',
        {},
    ];
    assert.deepEqual(dependabotPolicyErrors(config, pkg, lock), []);
});

test('PEER-GRAPH : ne contourne pas la copie imbriquée par une racine compatible', () => {
    const { config, pkg, lock } = graphFixture();
    lock.packages['@fixture/consumer/@fixture/runtime'] = [
        '@fixture/runtime@1.0.0',
        '',
        {},
    ];
    assert.match(
        dependabotPolicyErrors(config, pkg, lock).join('\n'),
        /packages\[@fixture\/consumer\/@fixture\/runtime\].*ne respecte pas \^2/
    );
});

test('PEER-GRAPH : remonte un parent scopé sans couper son namespace', () => {
    const { config, pkg, lock } = graphFixture();
    delete lock.packages['@fixture/consumer'];
    lock.packages['@fixture/parent'] = ['@fixture/parent@1.0.0', '', {}];
    lock.packages['@fixture/parent/@fixture/consumer'] = [
        '@fixture/consumer@1.0.0',
        '',
        { peerDependencies: { '@fixture/runtime': '^2' } },
    ];
    assert.deepEqual(dependabotPolicyErrors(config, pkg, lock), []);
    lock.packages['@fixture/parent/@fixture/runtime'] = [
        '@fixture/runtime@1.0.0',
        '',
        {},
    ];
    assert.match(
        dependabotPolicyErrors(config, pkg, lock).join('\n'),
        /packages\[@fixture\/parent\/@fixture\/runtime\].*ne respecte pas \^2/
    );
});

test('PEER-GRAPH : ne prend pas une copie étrangère pour un pair visible', () => {
    const { config, pkg, lock } = graphFixture();
    delete lock.packages['@fixture/runtime'];
    lock.packages['foreign/@fixture/runtime'] = [
        '@fixture/runtime@2.4.0',
        '',
        {},
    ];
    assert.match(
        dependabotPolicyErrors(config, pkg, lock).join('\n'),
        /@fixture\/runtime@\^2 requis mais absent/
    );
});

test('PEER-GRAPH : un pair optionnel absent est permis, présent il reste contraint', () => {
    const { config, pkg, lock } = graphFixture();
    lock.packages['@fixture/consumer'][2].optionalPeers = ['@fixture/runtime'];
    delete lock.packages['@fixture/runtime'];
    assert.deepEqual(dependabotPolicyErrors(config, pkg, lock), []);
    lock.packages['@fixture/runtime'] = ['@fixture/runtime@1.0.0', '', {}];
    assert.match(
        dependabotPolicyErrors(config, pkg, lock).join('\n'),
        /@fixture\/runtime@1\.0\.0.*ne respecte pas \^2/
    );
});

test('PEER-GRAPH : ne déclare pas compatible une version préliminaire hors plage', () => {
    const { config, pkg, lock } = graphFixture();
    lock.packages['@fixture/runtime'][0] = '@fixture/runtime@2.5.0-next.1';
    assert.match(
        dependabotPolicyErrors(config, pkg, lock).join('\n'),
        /@fixture\/runtime@2\.5\.0-next\.1.*ne respecte pas \^2/
    );
});

test('PEER-GRAPH : refuse les plages et les métadonnées impossibles à vérifier', () => {
    for (const value of [null, 7, '', 'latest']) {
        const { config, pkg, lock } = graphFixture();
        lock.packages['@fixture/consumer'][2].peerDependencies[
            '@fixture/runtime'
        ] = value;
        assert.match(
            dependabotPolicyErrors(config, pkg, lock).join('\n'),
            /@fixture\/runtime a une plage invalide/
        );
    }
    for (const value of [null, [], 42]) {
        const { config, pkg, lock } = graphFixture();
        lock.packages['@fixture/consumer'][2].peerDependencies = value;
        assert.match(
            dependabotPolicyErrors(config, pkg, lock).join('\n'),
            /pairs mal formés/
        );
    }
    for (const value of [null, 42, [42], {}]) {
        const { config, pkg, lock } = graphFixture();
        lock.packages['@fixture/consumer'][2].optionalPeers = value;
        assert.match(
            dependabotPolicyErrors(config, pkg, lock).join('\n'),
            /optionalPeers invalide/
        );
    }
});

test('PEER-GRAPH : refuse une copie présente malformée au lieu de chercher ailleurs', () => {
    for (const record of [
        [42],
        ['other@2.0.0', '', {}],
        ['@fixture/runtime@not-a-version', '', {}],
    ]) {
        const { config, pkg, lock } = graphFixture();
        lock.packages['@fixture/consumer/@fixture/runtime'] = record;
        assert.match(
            dependabotPolicyErrors(config, pkg, lock).join('\n'),
            /résolution invalide dans packages\[@fixture\/consumer\/@fixture\/runtime\]/
        );
    }
});

test('PEER-GRAPH : refuse un contexte de consommateur incohérent', () => {
    const { config, pkg, lock } = graphFixture();
    delete lock.packages['@fixture/consumer'];
    lock.packages.alias = [
        '@fixture/consumer@1.0.0',
        '',
        { peerDependencies: { '@fixture/runtime': '^2' } },
    ];
    assert.match(
        dependabotPolicyErrors(config, pkg, lock).join('\n'),
        /contexte incohérent avec son identité : alias/
    );
});

test('PEER-GRAPH : refuse un verrou absent et un pattern non textuel', () => {
    const { config, pkg, lock } = fixture();
    assert.match(
        dependabotPolicyErrors(config, pkg).join('\n'),
        /packages doit être un objet/
    );
    config.updates[0].groups.angular.patterns.push(42);
    assert.match(
        dependabotPolicyErrors(config, pkg, lock).join('\n'),
        /patterns doit contenir des chaînes non vides/
    );
});
