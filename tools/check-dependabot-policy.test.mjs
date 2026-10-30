import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import {
    cpSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    realpathSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

import {
    dependabotPolicyErrors,
    ignoredVersionPolicyErrors,
    requiredLockConsumers,
    SECURITY_OVERRIDE_MINIMUMS,
    securityResolutionPolicyErrors,
} from './check-dependabot-policy.mjs';
import { fixture } from './test-support/dependabot-policy-fixture.mjs';

// check:dependabot-policy conserve ce point d’entrée ; cet import exécute
// aussi les contre-tests PEER-GRAPH dans le même contexte CI.
import './check-dependabot-peer-policy.test.mjs';

test('accepte un groupe React complet et des runtimes alignés', () => {
    const { config, pkg, lock } = fixture();
    assert.deepEqual(dependabotPolicyErrors(config, pkg, lock), []);
});

test('refuse un membre manquant dans le groupe atomique', () => {
    const { config, pkg, lock } = fixture({
        patterns: ['react', 'react-dom', '@types/react'],
    });
    assert.match(
        dependabotPolicyErrors(config, pkg, lock).join('\n'),
        /'@types\/react-dom' manque/
    );
});

test('refuse un membre React revendiqué par plusieurs groupes', () => {
    const { config, pkg, lock } = fixture();
    config.updates[0].groups.other = { patterns: ['react-dom'] };
    assert.match(
        dependabotPolicyErrors(config, pkg, lock).join('\n'),
        /'react-dom' doit appartenir uniquement/
    );
});

test('refuse des versions runtime React différentes', () => {
    const { config, pkg, lock } = fixture({ reactDom: '19.2.8' });
    assert.match(
        dependabotPolicyErrors(config, pkg, lock).join('\n'),
        /react=19\.3\.0, react-dom=19\.2\.8/
    );
});

test('refuse un groupe Angular qui oublie les schematics hors namespace', () => {
    const { config, pkg, lock } = fixture();
    config.updates[0].groups.angular.patterns.pop();
    assert.match(
        dependabotPolicyErrors(config, pkg, lock).join('\n'),
        /'@schematics\/angular' manque/
    );
});

test('refuse un bloc de mises à jour cohérent incomplet', () => {
    const { config, pkg, lock } = fixture();
    config.updates[0].groups['unit-testing'].patterns.pop();
    assert.match(
        dependabotPolicyErrors(config, pkg, lock).join('\n'),
        /groupe 'unit-testing' incomplet : '@testing-library\/\*' manque/
    );
});

test('refuse de mélanger les mises à jour majeures aux blocs courants', () => {
    const { config, pkg, lock } = fixture();
    config.updates[0].groups['code-quality']['update-types'].push('major');
    assert.match(
        dependabotPolicyErrors(config, pkg, lock).join('\n'),
        /doit limiter update-types à minor et patch/
    );
});

test('refuse un pattern revendiqué par plusieurs blocs', () => {
    const { config, pkg, lock } = fixture();
    config.updates[0].groups['browser-e2e'].patterns.push('vitest');
    assert.match(
        dependabotPolicyErrors(config, pkg, lock).join('\n'),
        /'vitest' doit appartenir uniquement au groupe 'unit-testing'/
    );
});

test('refuse un élargissement de bloc non formalisé', () => {
    const { config, pkg, lock } = fixture();
    config.updates[0].groups['unit-testing'].patterns.push('jsdom');
    assert.match(
        dependabotPolicyErrors(config, pkg, lock).join('\n'),
        /'jsdom' est inattendu/
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

function ignoreFixture() {
    const name = 'fixture-compiler';
    return {
        config: {
            updates: [
                {
                    'package-ecosystem': 'bun',
                    directory: '/',
                    ignore: [{ 'dependency-name': name, versions: ['7.x'] }],
                },
            ],
        },
        lock: {
            packages: {
                [name]: [`${name}@6.0.3`],
                consumer: [
                    'consumer@1.0.0',
                    '',
                    { peerDependencies: { [name]: '>=6.0 <6.1' } },
                ],
                permissive: [
                    'permissive@1.0.0',
                    '',
                    { peerDependencies: { [name]: '*' } },
                ],
            },
        },
    };
}

test('ignore : une exclusion justifiée fonctionne sans nom de paquet codé en dur', () => {
    const { config, lock } = ignoreFixture();
    const before = structuredClone({ config, lock });
    assert.deepEqual(ignoredVersionPolicyErrors(config, lock), []);
    assert.deepEqual({ config, lock }, before);
});

test('ignore : le dernier refus peut être une copie seulement imbriquée', () => {
    const { config, lock } = ignoreFixture();
    lock.packages.consumer[2].peerDependencies['fixture-compiler'] = '^7';
    lock.packages['parent/nested'] = [
        'nested@2.0.0',
        '',
        { peerDependencies: { 'fixture-compiler': '>=6 <6.1' } },
    ];
    assert.deepEqual(ignoredVersionPolicyErrors(config, lock), []);
    delete lock.packages['parent/nested'];
    assert.match(
        ignoredVersionPolicyErrors(config, lock).join('\n'),
        /sans justification par un pair installé : la lever/
    );
});

test('ignore : refus quand tous les pairs acceptent la plage, et restauration verte', () => {
    const { config, lock } = ignoreFixture();
    const previous = structuredClone(lock);
    lock.packages.consumer[2].peerDependencies['fixture-compiler'] = '^7';
    assert.match(
        ignoredVersionPolicyErrors(config, lock).join('\n'),
        /exclusion de fixture-compiler 7\.x sans justification/
    );
    assert.deepEqual(ignoredVersionPolicyErrors(config, previous), []);
});

test('ignore : une plage qui intersecte tous les pairs ne justifie rien', () => {
    const { config, lock } = ignoreFixture();
    config.updates[0].ignore[0].versions = ['6.x'];
    assert.match(
        ignoredVersionPolicyErrors(config, lock).join('\n'),
        /exclusion de fixture-compiler 6\.x sans justification/
    );
});

test('ignore : vérifier chaque plage, même si la première est justifiée', () => {
    const { config, lock } = ignoreFixture();
    config.updates[0].ignore[0].versions.push('6.x');
    const errors = ignoredVersionPolicyErrors(config, lock);
    assert.equal(errors.length, 1);
    assert.match(errors[0], /fixture-compiler 6\.x sans justification/);
});

test('ignore : pas de justification sans consommateur déclarant le pair exact', () => {
    const { config, lock } = ignoreFixture();
    config.updates[0].ignore[0]['dependency-name'] = 'another-package';
    assert.match(
        ignoredVersionPolicyErrors(config, lock).join('\n'),
        /exclusion de another-package 7\.x sans justification/
    );
});

test('ignore : refus des noms glob, formes implicites et update-types', () => {
    const malformed = [
        null,
        [],
        { 'dependency-name': '*', versions: ['7.x'] },
        { 'dependency-name': 'fixture-*', versions: ['7.x'] },
        {
            'dependency-name': 'fixture-compiler',
            'update-types': ['version-update:semver-major'],
        },
        {
            'dependency-name': 'fixture-compiler',
            versions: ['7.x'],
            'update-types': [],
        },
        {
            'dependency-name': 'fixture-compiler',
            versions: ['7.x'],
            extra: true,
        },
    ];
    for (const entry of malformed) {
        const { config, lock } = ignoreFixture();
        config.updates[0].ignore = [entry];
        assert.match(
            ignoredVersionPolicyErrors(config, lock).join('\n'),
            /nom exact requis/,
            JSON.stringify(entry)
        );
    }
});

test('ignore : refus des listes et plages absentes ou invalides', () => {
    for (const versions of [
        undefined,
        null,
        [],
        '7.x',
        [''],
        ['latest'],
        [7],
    ]) {
        const { config, lock } = ignoreFixture();
        config.updates[0].ignore[0].versions = versions;
        assert.match(
            ignoredVersionPolicyErrors(config, lock).join('\n'),
            /liste non vide de plages SemVer valides/
        );
    }
    const { config, lock } = ignoreFixture();
    config.updates[0].ignore = {};
    assert.match(
        ignoredVersionPolicyErrors(config, lock).join('\n'),
        /liste explicite/
    );
});

test('ignore : un pair pertinent mal formé reste bloquant même avec un autre refus', () => {
    for (const peer of [null, 7, '', 'latest']) {
        const { config, lock } = ignoreFixture();
        lock.packages.permissive[2].peerDependencies['fixture-compiler'] = peer;
        assert.match(
            ignoredVersionPolicyErrors(config, lock).join('\n'),
            /packages\[permissive\] : pair fixture-compiler mal formé/
        );
    }
});

test('ignore : métadonnées de pairs ou packages mal formées ne sont pas sautées', () => {
    const { config, lock } = ignoreFixture();
    lock.packages.permissive[2].peerDependencies = null;
    assert.match(
        ignoredVersionPolicyErrors(config, lock).join('\n'),
        /pairs mal formés/
    );
    assert.match(
        ignoredVersionPolicyErrors(config, { packages: [] }).join('\n'),
        /packages doit être un objet/
    );
});

test('ignore : une dépendance présente reste contrainte par son pair optionnel', () => {
    const { config, lock } = ignoreFixture();
    lock.packages.consumer[2].optionalPeers = ['fixture-compiler'];
    assert.deepEqual(ignoredVersionPolicyErrors(config, lock), []);
});

test('ignore : liste vide ou absente admise sans figer une exclusion', () => {
    for (const ignore of [undefined, []]) {
        const { config, lock } = ignoreFixture();
        if (ignore === undefined) delete config.updates[0].ignore;
        else config.updates[0].ignore = ignore;
        assert.deepEqual(ignoredVersionPolicyErrors(config, lock), []);
    }
});

test('B : la CLI réelle lie les exclusions au workflow et refuse une délégation inopérante', (t) => {
    const source = fileURLToPath(new URL('..', import.meta.url));
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'cmz-nx-policy-')));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    mkdirSync(join(root, 'tools'), { recursive: true });
    mkdirSync(join(root, '.github/workflows'), { recursive: true });
    mkdirSync(join(root, 'node_modules'));
    // Copies physiques des trois dépendances de ces outils seulement : ce
    // test de CLI ne monte aucun projet ni graphe de qualification factice.
    const require = createRequire(import.meta.url);
    for (const name of ['semver', 'yaml', 'jsonc-parser']) {
        cpSync(
            dirname(require.resolve(`${name}/package.json`)),
            join(root, 'node_modules', name),
            { recursive: true }
        );
    }
    for (const path of [
        'package.json',
        'bun.lock',
        'tools/check-dependabot-policy.mjs',
        'tools/check-library-setup-deps.mjs',
        'tools/nx-migration-plan.mjs',
        'tools/check-workflow-privileges.mjs',
        'tools/runtime-version-workflow.mjs',
    ]) {
        cpSync(join(source, path), join(root, path));
    }
    const workflowPath = join(root, '.github/workflows/nx-migrations.yml');
    const workflow = parseYaml(
        readFileSync(
            join(source, '.github/workflows/nx-migrations.yml'),
            'utf8'
        )
    );
    const original = parseYaml(
        readFileSync(join(source, '.github/dependabot.yml'), 'utf8')
    );
    const selectors = JSON.parse(workflow.env.NX_MIGRATION_SELECTORS);
    const rootBun = (value) =>
        value.updates.find(
            (u) => u['package-ecosystem'] === 'bun' && u.directory === '/'
        );
    const withoutDelegation = structuredClone(original);
    rootBun(withoutDelegation).ignore = (rootBun(original).ignore ?? []).filter(
        (entry) => !selectors.includes(entry['dependency-name'])
    );
    const delegate = (sourceConfig) => {
        const next = structuredClone(sourceConfig);
        rootBun(next).ignore = [
            ...(rootBun(next).ignore ?? []).filter(
                (entry) => !selectors.includes(entry['dependency-name'])
            ),
            ...selectors.map((name) => ({ 'dependency-name': name })),
        ];
        return next;
    };
    const config = delegate(original);
    // Both possible real source configurations yield the same fixture.
    assert.deepEqual(delegate(withoutDelegation), config);
    assert.deepEqual(delegate(config), config);
    const prepare = () => {
        writeFileSync(
            join(root, '.github/dependabot.yml'),
            stringifyYaml(config)
        );
        writeFileSync(workflowPath, stringifyYaml(workflow));
    };
    const execute = () =>
        spawnSync(
            process.execPath,
            [join(root, 'tools/check-dependabot-policy.mjs')],
            { cwd: root, encoding: 'utf8' }
        );
    prepare();
    let result = execute();
    assert.equal(
        result.status,
        0,
        `délégation opérationnelle refusée : ${result.stderr}`
    );
    for (const mutate of [
        () => {
            const duplicate = structuredClone(config);
            rootBun(duplicate).ignore.push({ 'dependency-name': selectors[0] });
            writeFileSync(
                join(root, '.github/dependabot.yml'),
                stringifyYaml(duplicate)
            );
        },
        () => rmSync(workflowPath),
        () => {
            const w = structuredClone(workflow);
            w.jobs.calculate.if = false;
            writeFileSync(workflowPath, stringifyYaml(w));
        },
        () => {
            const w = structuredClone(workflow);
            delete w.jobs.calculate;
            writeFileSync(workflowPath, stringifyYaml(w));
        },
        () => {
            const w = structuredClone(workflow);
            w.jobs.plan.steps.find((s) => s.id === 'plan').run =
                'node tools/nx-migration-plan.mjs plan --selectors "autre"';
            writeFileSync(workflowPath, stringifyYaml(w));
        },
        () => {
            const extra = structuredClone(config);
            extra.updates
                .find((u) => u['package-ecosystem'] === 'bun')
                .ignore.push({ 'dependency-name': '@outside/*' });
            writeFileSync(
                join(root, '.github/dependabot.yml'),
                stringifyYaml(extra)
            );
        },
    ]) {
        prepare();
        mutate();
        result = execute();
        assert.equal(result.status, 1, result.stderr);
        assert.match(result.stderr, /Politique Dependabot invalide/);
    }
    // Sans délégation, les exclusions par incompatibilité de pairs gardent
    // exactement le chemin normal du garde.
    prepare();
    writeFileSync(
        join(root, '.github/dependabot.yml'),
        stringifyYaml(withoutDelegation)
    );
    result = execute();
    assert.equal(result.status, 0, result.stderr);
});
