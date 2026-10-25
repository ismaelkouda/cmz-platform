import { COHERENT_UPDATE_GROUPS } from '../check-dependabot-policy.mjs';

function angularLock(framework) {
    return {
        packages: {
            '@angular/core': [
                `@angular/core@${framework}`,
                '',
                { peerDependencies: { rxjs: '^7.0.0' } },
            ],
            '@angular/compiler': [`@angular/compiler@${framework}`, '', {}],
            '@angular/compiler-cli': [
                `@angular/compiler-cli@${framework}`,
                '',
                {
                    peerDependencies: {
                        '@angular/compiler': framework,
                        typescript: '>=6.0 <6.1',
                    },
                },
            ],
            '@angular/router': [
                `@angular/router@${framework}`,
                '',
                { peerDependencies: { '@angular/core': framework } },
            ],
            '@angular/build': [
                `@angular/build@${framework}`,
                '',
                {
                    peerDependencies: {
                        '@angular/core': '^22.0.0',
                        '@angular/compiler-cli': '^22.0.0',
                        typescript: '>=6.0 <6.1',
                    },
                },
            ],
            '@angular/cli': [`@angular/cli@${framework}`, '', {}],
            '@angular/material': [
                '@angular/material@22.2.1',
                '',
                {
                    peerDependencies: {
                        '@angular/cdk': '22.2.1',
                        '@angular/core': '^22.0.0',
                    },
                },
            ],
            '@angular/cdk': [
                '@angular/cdk@22.2.1',
                '',
                { peerDependencies: { '@angular/core': '^22.0.0' } },
            ],
            typescript: ['typescript@6.0.3', '', {}],
            rxjs: ['rxjs@7.8.2', '', {}],
        },
    };
}

export function fixture({
    patterns,
    react = '19.3.0',
    reactDom = react,
    framework = '22.2.0',
} = {}) {
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
        lock: angularLock(framework),
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
