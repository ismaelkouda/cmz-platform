import assert from 'node:assert/strict';
import test from 'node:test';

import { dependabotPolicyErrors } from './check-dependabot-policy.mjs';

function fixture({ patterns, react = '19.3.0', reactDom = react } = {}) {
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
                    },
                },
            ],
        },
        pkg: {
            devDependencies: {
                react,
                'react-dom': reactDom,
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
