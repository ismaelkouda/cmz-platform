import nx from '@nx/eslint-plugin';

export default [
    ...nx.configs['flat/base'],
    ...nx.configs['flat/typescript'],
    ...nx.configs['flat/javascript'],
    {
        ignores: [
            '**/dist',
            '**/out-tsc',
            '**/build',
            '**/.react-router',
            '**/vite.config.*.timestamp*',
            '**/vitest.config.*.timestamp*',
        ],
    },
    // Fichiers d'outillage de test — exclus de enforce-module-boundaries.
    // Configs Vitest locales (s'il en reste) et tools/vitest-lib.config.ts :
    // hors code applicatif, frontières de couche non applicables.
    {
        ignores: [
            '**/vite.config.ts',
            '**/vite.config.js',
            '**/vitest.config.ts',
            '**/vitest.config.js',
        ],
    },
    {
        files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
        rules: {
            '@nx/enforce-module-boundaries': [
                'error',
                {
                    // false : les libs cmz-platform sont applicatives (non publiées npm).
                    // `enforceBuildableLibDependency: true` est réservé aux monorepos
                    // publicateurs (ng-packagr, changesets). Ici il produirait des
                    // faux-positifs dès qu'un target `build: tsc --noEmit` est déclaré
                    // pour le pipeline Oracle de vérification.
                    enforceBuildableLibDependency: false,
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
                        // `app` = composition root — liste explicite (pas de joker `*`).
                        // `type:browser` (@cmz/shared-browser) n'est autorisé QUE depuis
                        // type:app : adaptateurs navigateur réservés au wiring root
                        // (audit D-5 / P2-18). Aucune couche lib (ui/application/data/…)
                        // ne liste type:browser → import interdit ailleurs.
                        {
                            sourceTag: 'type:app',
                            onlyDependOnLibsWithTags: [
                                'type:constants',
                                'type:domain',
                                'type:core',
                                'type:browser',
                                'type:data',
                                'type:application',
                                'type:ui',
                                'type:app',
                            ],
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
                            sourceTag: 'scope:content-management',
                            onlyDependOnLibsWithTags: [
                                'scope:content-management',
                                'scope:shared',
                            ],
                        },
                        {
                            sourceTag: 'scope:settings-security',
                            onlyDependOnLibsWithTags: [
                                'scope:settings-security',
                                'scope:shared',
                            ],
                        },
                        // Exception délibérée (décision utilisateur,
                        // 2026-07-28) : le formulaire `messaging` réutilise
                        // le cascade région→département→commune déjà
                        // construit dans `administrative-boundary`
                        // (`RegionSelectFacade`) plutôt que de dupliquer une
                        // hiérarchie géographique entière — même dépendance
                        // que le source réel (`MessagingFormStore` y importe
                        // `RegionsSelectFacade` directement). Premier
                        // couplage inter-domaines du monorepo (les 17 autres
                        // scopes restent isolés à eux-mêmes + `scope:shared`).
                        {
                            sourceTag: 'scope:communication',
                            onlyDependOnLibsWithTags: [
                                'scope:communication',
                                'scope:administrative-boundary',
                                'scope:shared',
                            ],
                        },
                        {
                            sourceTag: 'scope:dashboard',
                            onlyDependOnLibsWithTags: [
                                'scope:dashboard',
                                'scope:shared',
                            ],
                        },
                        {
                            sourceTag: 'scope:monitoring',
                            onlyDependOnLibsWithTags: [
                                'scope:monitoring',
                                'scope:shared',
                            ],
                        },
                        {
                            sourceTag: 'scope:reporting',
                            onlyDependOnLibsWithTags: [
                                'scope:reporting',
                                'scope:shared',
                            ],
                        },
                        {
                            sourceTag: 'scope:interactive-map',
                            onlyDependOnLibsWithTags: [
                                'scope:interactive-map',
                                'scope:shared',
                            ],
                        },
                        {
                            sourceTag: 'scope:report-states',
                            onlyDependOnLibsWithTags: [
                                'scope:report-states',
                                'scope:workflow-details',
                                'scope:shared',
                            ],
                        },
                        // processing, requests, finalization — famille
                        // workflow-action (ADR-0003 §Règle de tenue à jour).
                        {
                            sourceTag: 'scope:processing',
                            onlyDependOnLibsWithTags: [
                                'scope:processing',
                                'scope:shared',
                            ],
                        },
                        {
                            sourceTag: 'scope:requests',
                            onlyDependOnLibsWithTags: [
                                'scope:requests',
                                'scope:workflow-details',
                                'scope:shared',
                            ],
                        },
                        {
                            sourceTag: 'scope:finalization',
                            onlyDependOnLibsWithTags: [
                                'scope:finalization',
                                'scope:shared',
                            ],
                        },
                        // ADR-0020 (Option B, POC 2026-08-11) — bibliothèque
                        // transverse dédiée à la fonctionnalité « details »
                        // partagée par `report-states`/`requests` (99 groupes
                        // quasi-identiques modulo nom de module, cf. mémo
                        // `docs/architecture/factorisation-details-workflow.md`).
                        // Scope dédié plutôt que `scope:shared` pour ne pas
                        // mélanger un concept spécifique au workflow de
                        // traitement de signalement avec le kernel générique
                        // (`ActorEntity`, etc.). Ne dépend que de `scope:shared`
                        // — ne referme aucun cycle, `processing`/`finalization`
                        // ne l'importent pas (non migrés dans ce POC).
                        {
                            sourceTag: 'scope:workflow-details',
                            onlyDependOnLibsWithTags: [
                                'scope:workflow-details',
                                'scope:shared',
                            ],
                        },
                        {
                            sourceTag: 'scope:app',
                            onlyDependOnLibsWithTags: ['*'],
                        },
                        {
                            sourceTag: 'scope:cmz-client-landing',
                            onlyDependOnLibsWithTags: [
                                'scope:cmz-client-landing',
                                'scope:shared',
                            ],
                        },
                        {
                            sourceTag: 'scope:cmz-client-landing-home',
                            onlyDependOnLibsWithTags: [
                                'scope:cmz-client-landing-home',
                                'scope:shared',
                            ],
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
        rules: {
            // Un paramètre préfixé `_` est délibérément non utilisé — cas
            // légitime quand la signature est imposée par un contrat de
            // type (ex. extension point humain AfterSuccessExtension,
            // callback avec position fixe) et que l'implémentation
            // n'exploite pas (encore) cet argument, sans que la règle par
            // défaut du preset Nx le reconnaisse — rendu explicite ici
            // plutôt que contourné au cas par cas.
            '@typescript-eslint/no-unused-vars': [
                'error',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
            ],
        },
    },
];
