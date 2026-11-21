import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';

import {
    UNIVERSAL_GROUP_EXCLUSIONS,
    universalGroupPolicyErrors,
} from './check-dependabot-policy.mjs';
import { NGINX_RELAY_DIRECTORY } from './dependabot-nginx-relay-policy.mjs';
import { RUNTIME_IMAGES } from './runtime-version-policy.mjs';

const ECOSYSTEMS = ['bun', 'github-actions', 'docker'];

function universalFixture() {
    const universal = (ecosystem) => ({
        patterns: ['*'],
        ...(Object.hasOwn(UNIVERSAL_GROUP_EXCLUSIONS, ecosystem)
            ? { 'exclude-patterns': [...UNIVERSAL_GROUP_EXCLUSIONS[ecosystem]] }
            : {}),
        'update-types': ['minor', 'patch'],
    });
    return {
        updates: ECOSYSTEMS.map((ecosystem) => ({
            'package-ecosystem': ecosystem,
            directory: '/',
            groups: {
                ...(ecosystem === 'bun'
                    ? {
                          react: { patterns: ['react', 'react-dom'] },
                          'unit-testing': {
                              patterns: ['vitest'],
                              'update-types': ['minor', 'patch'],
                          },
                      }
                    : {}),
                'minor-and-patch': universal(ecosystem),
            },
        })),
    };
}
const universalErrors = (config) =>
    universalGroupPolicyErrors(config).join('\n');

test('GROUPES : la configuration réelle regroupe les trois écosystèmes et le relais nginx', () => {
    const config = parseYaml(
        readFileSync(
            new URL('../.github/dependabot.yml', import.meta.url),
            'utf8'
        )
    );
    // Une entrée par écosystème à la racine, plus l'entrée docker dédiée au
    // relais nginx (X4-config), qui porte aussi son groupe universel.
    assert.deepEqual(
        config.updates
            .map(
                (update) => `${update['package-ecosystem']} ${update.directory}`
            )
            .sort(),
        [
            ...ECOSYSTEMS.map((ecosystem) => `${ecosystem} /`),
            `docker ${NGINX_RELAY_DIRECTORY}`,
        ].sort()
    );
    assert.deepEqual(universalGroupPolicyErrors(config), []);
});

test('GROUPES : accepte un groupe universel par écosystème, sans muter la configuration', () => {
    const config = universalFixture();
    const before = structuredClone(config);
    assert.deepEqual(universalGroupPolicyErrors(config), []);
    assert.deepEqual(config, before);
});

test('GROUPES : exige le regroupement dans chaque écosystème', () => {
    ECOSYSTEMS.forEach((ecosystem, index) => {
        const withoutGroup = universalFixture();
        delete withoutGroup.updates[index].groups['minor-and-patch'];
        assert.match(
            universalErrors(withoutGroup),
            new RegExp(
                `Dependabot ${ecosystem} / : un seul groupe universel .*trouvé 0`
            )
        );
        const withoutGroups = universalFixture();
        delete withoutGroups.updates[index].groups;
        assert.match(
            universalErrors(withoutGroups),
            new RegExp(`Dependabot ${ecosystem} / : groupes absents`)
        );
    });
    for (const config of [{}, { updates: [] }, { updates: {} }]) {
        assert.match(universalErrors(config), /updates doit être une liste/);
    }
    const malformed = universalFixture();
    malformed.updates[0].groups.react = null;
    assert.match(universalErrors(malformed), /groupes mal formés : react/);
});

test('GROUPES : refuse un fourre-tout qui avalerait les majeures', () => {
    const mutations = [
        (groups) => groups['minor-and-patch']['update-types'].push('major'),
        (groups) => delete groups['minor-and-patch']['update-types'],
        (groups) => {
            groups['minor-and-patch']['update-types'] = ['major'];
        },
        (groups) => {
            groups['minor-and-patch']['update-types'] = ['minor'];
        },
        // Même longueur, un membre remplacé : la majeure entre quand même.
        (groups) => {
            groups['minor-and-patch']['update-types'] = ['patch', 'major'];
        },
        (groups) => {
            groups['minor-and-patch']['update-types'] = [
                'minor',
                'patch',
                'patch',
            ];
        },
    ];
    for (const index of ECOSYSTEMS.keys()) {
        for (const mutate of mutations) {
            const config = universalFixture();
            mutate(config.updates[index].groups);
            assert.match(
                universalErrors(config),
                /groupe universel 'minor-and-patch' doit limiter update-types à minor et patch/
            );
        }
    }
    // Un second groupe universel, même déclaré avant, est refusé pour sa
    // forme : sans patterns ou avec un motif tout-étoile il vise tout.
    for (const extra of [
        { 'dependency-type': 'development' },
        { patterns: '**' },
        { patterns: ['@scope/*', '*'], 'update-types': ['minor', 'patch'] },
    ]) {
        const config = universalFixture();
        config.updates[0].groups = { all: extra, ...config.updates[0].groups };
        const errors = universalErrors(config);
        assert.match(errors, /un seul groupe universel .*trouvé 2/);
        if (!extra['update-types']) {
            assert.match(errors, /groupe universel 'all' doit limiter/);
        }
    }
});

test('GROUPES : le groupe universel reste déclaré après les groupes existants', () => {
    const config = universalFixture();
    const { react, 'minor-and-patch': universal } = config.updates[0].groups;
    config.updates[0].groups = { 'minor-and-patch': universal, react };
    assert.match(
        universalErrors(config),
        /Dependabot bun \/ : le groupe 'minor-and-patch' doit être déclaré en dernier/
    );
});

test('GROUPES : forme exacte du groupe universel, sans restriction cachée', () => {
    const cases = [
        [
            (group) => group.patterns.push('react'),
            /doit viser exactement patterns \['\*'\]/,
        ],
        [
            (group) => {
                group.patterns = '*';
            },
            /doit viser exactement patterns \['\*'\]/,
        ],
        [
            (group) => {
                group['dependency-type'] = 'production';
            },
            /ne doit pas se restreindre par dependency-type/,
        ],
        [
            (group) => {
                group['applies-to'] = 'security-updates';
            },
            /ne doit pas se restreindre par applies-to/,
        ],
        [
            (group) => {
                group['group-by'] = 'dependency-name';
            },
            /ne doit pas se restreindre par group-by/,
        ],
    ];
    for (const [mutate, expected] of cases) {
        const config = universalFixture();
        mutate(config.updates[1].groups['minor-and-patch']);
        assert.match(universalErrors(config), expected);
    }
});

test('GROUPES : les images de runtime restent hors du groupe Docker, rien d’autre', () => {
    const runtimeNames = Object.values(RUNTIME_IMAGES).map(
        (image) => image.name
    );
    assert.ok(runtimeNames.length > 0);
    assert.deepEqual([...UNIVERSAL_GROUP_EXCLUSIONS.docker], runtimeNames);
    const docker = ECOSYSTEMS.indexOf('docker');
    for (const name of runtimeNames) {
        const config = universalFixture();
        const group = config.updates[docker].groups['minor-and-patch'];
        group['exclude-patterns'] = group['exclude-patterns'].filter(
            (pattern) => pattern !== name
        );
        assert.match(
            universalErrors(config),
            /Dependabot docker \/ : exclude-patterns du groupe 'minor-and-patch' doit valoir/
        );
    }
    const withoutExclusions = universalFixture();
    delete withoutExclusions.updates[docker].groups['minor-and-patch'][
        'exclude-patterns'
    ];
    assert.match(universalErrors(withoutExclusions), /trouvé \[\]/);
    const widened = universalFixture();
    widened.updates[docker].groups['minor-and-patch']['exclude-patterns'].push(
        'nginx'
    );
    assert.match(universalErrors(widened), /"nginx"/);
    // Même longueur, une image de runtime remplacée : elle rejoindrait le
    // groupe.
    const replaced = universalFixture();
    replaced.updates[docker].groups['minor-and-patch']['exclude-patterns'] = [
        ...runtimeNames.slice(0, -1),
        'nginx',
    ];
    assert.match(universalErrors(replaced), /trouvé \[.*"nginx"\]/);
    const bunExclusion = universalFixture();
    bunExclusion.updates[0].groups['minor-and-patch']['exclude-patterns'] = [
        'react-router',
    ];
    assert.match(
        universalErrors(bunExclusion),
        /Dependabot bun \/ : exclude-patterns du groupe 'minor-and-patch' doit valoir \[\]/
    );
});
