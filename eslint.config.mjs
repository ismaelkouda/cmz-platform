import nx from '@nx/eslint-plugin';

export default [
    ...nx.configs['flat/base'],
    ...nx.configs['flat/typescript'],
    ...nx.configs['flat/javascript'],
    {
        ignores: ['**/dist', '**/out-tsc'],
    },
    {
        files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
        rules: {
            '@nx/enforce-module-boundaries': [
                'error',
                {
                    enforceBuildableLibDependency: true,
                    allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
                    depConstraints: [
                        // ---- Contraintes par COUCHE (type:*) ----
                        // `constants` = feuille : dépendable par toutes les couches.
                        {
                            sourceTag: 'type:constants',
                            onlyDependOnLibsWithTags: ['type:constants'],
                        },
                        {
                            sourceTag: 'type:domain',
                            onlyDependOnLibsWithTags: [
                                'type:domain',
                                'type:constants',
                            ],
                        },
                        // `core` = config runtime + interceptors (feuille kernel).
                        {
                            sourceTag: 'type:core',
                            onlyDependOnLibsWithTags: [
                                'type:core',
                                'type:domain',
                                'type:constants',
                            ],
                        },
                        {
                            sourceTag: 'type:browser',
                            onlyDependOnLibsWithTags: [
                                'type:domain',
                                'type:browser',
                                'type:constants',
                            ],
                        },
                        {
                            sourceTag: 'type:data',
                            onlyDependOnLibsWithTags: [
                                'type:domain',
                                'type:data',
                                'type:core',
                                'type:constants',
                            ],
                        },
                        {
                            sourceTag: 'type:application',
                            onlyDependOnLibsWithTags: [
                                'type:domain',
                                'type:application',
                                'type:constants',
                            ],
                        },
                        {
                            sourceTag: 'type:ui',
                            onlyDependOnLibsWithTags: [
                                'type:domain',
                                'type:application',
                                'type:ui',
                                'type:constants',
                            ],
                        },
                        // `app` = composition root : peut tout brancher.
                        {
                            sourceTag: 'type:app',
                            onlyDependOnLibsWithTags: ['*'],
                        },
                        // ---- Contraintes par SCOPE (isolation des modules) ----
                        // Le kernel ne dépend que de lui-même.
                        {
                            sourceTag: 'scope:shared',
                            onlyDependOnLibsWithTags: ['scope:shared'],
                        },
                        // Un module ne voit que ses propres libs + le kernel.
                        {
                            sourceTag: 'scope:administrative-infrastructure',
                            onlyDependOnLibsWithTags: [
                                'scope:administrative-infrastructure',
                                'scope:shared',
                            ],
                        },
                        {
                            sourceTag: 'scope:administrative-boundary',
                            onlyDependOnLibsWithTags: [
                                'scope:administrative-boundary',
                                'scope:shared',
                            ],
                        },
                        {
                            sourceTag: 'scope:authentication',
                            onlyDependOnLibsWithTags: [
                                'scope:authentication',
                                'scope:shared',
                            ],
                        },
                        {
                            sourceTag: 'scope:coverage-areas',
                            onlyDependOnLibsWithTags: [
                                'scope:coverage-areas',
                                'scope:shared',
                            ],
                        },
                        {
                            sourceTag: 'scope:team-organization',
                            onlyDependOnLibsWithTags: [
                                'scope:team-organization',
                                'scope:shared',
                            ],
                        },
                        {
                            sourceTag: 'scope:app',
                            onlyDependOnLibsWithTags: ['*'],
                        },
                    ],
                },
            ],
        },
    },
    {
        files: [
            '**/*.ts',
            '**/*.tsx',
            '**/*.cts',
            '**/*.mts',
            '**/*.js',
            '**/*.jsx',
            '**/*.cjs',
            '**/*.mjs',
        ],
        rules: {},
    },
];
