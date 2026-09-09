import { createHash } from 'node:crypto';

import { canonicalizeGeneratedFiles } from '../core/canonicalize-generated.mjs';

function sha256(content) {
    return createHash('sha256').update(content).digest('hex');
}

function json(value) {
    return `${JSON.stringify(value, null, 2)}\n`;
}

function quoted(value) {
    return JSON.stringify(value);
}

function escapedMarkup(value) {
    return Array.from(
        value,
        (character) => `&#${character.codePointAt(0)};`
    ).join('');
}

function routePath(page) {
    return page.path === '/'
        ? ''
        : page.path.replace(/^\//, '').replace(/\/$/, '');
}

function renderRoutes(pages) {
    const guardImport = pages.some((page) => page.access.mode !== 'public')
        ? "\nimport { appAccessGuard } from './access.guard';\n"
        : '';
    const routes = pages
        .map(
            (page) => `    {
        path: ${quoted(routePath(page))},
        data: { access: ${JSON.stringify(page.access)} },
${page.access.mode === 'public' ? '' : '        canActivate: [appAccessGuard],\n'}        loadComponent: () =>
            import('./pages/${page.id}/page.component').then(
                (module) => module.PageComponent
            ),
    },`
        )
        .join('\n');
    return `import { Routes } from '@angular/router';
${guardImport}

export const appRoutes: Routes = [
${routes}
    { path: '**', redirectTo: '' },
];
`;
}

function accessGuard() {
    return `import { inject, InjectionToken } from '@angular/core';
import { CanActivateFn } from '@angular/router';

export interface AppAccessDecisionPort {
    isAuthenticated(): boolean;
    hasPermission(permission: string): boolean;
}

export interface AppAccessPolicy {
    mode: 'public' | 'authenticated' | 'authorized';
    permissions: readonly string[];
}

export const APP_ACCESS_DECISION = new InjectionToken<AppAccessDecisionPort>(
    'APP_ACCESS_DECISION'
);

export function evaluateAppAccess(
    policy: AppAccessPolicy | null | undefined,
    decision: AppAccessDecisionPort | null
): boolean {
    if (!policy || !Array.isArray(policy.permissions)) return false;
    if (policy.mode === 'public') return policy.permissions.length === 0;
    if (!decision?.isAuthenticated()) return false;
    if (policy.mode === 'authenticated') return policy.permissions.length === 0;
    if (policy.mode !== 'authorized') return false;
    if (policy.permissions.length === 0) return false;
    return policy.permissions.every((permission) =>
        permission.length > 0 && decision.hasPermission(permission)
    );
}

export const appAccessGuard: CanActivateFn = (route) =>
    evaluateAppAccess(
        route.data['access'] as AppAccessPolicy,
        inject(APP_ACCESS_DECISION, { optional: true })
    );
`;
}

function accessGuardSpec() {
    return `import { describe, expect, it } from 'vitest';

import { evaluateAppAccess } from './access.guard';
import type { AppAccessDecisionPort } from './access.guard';

function decision(
    authenticated: boolean,
    granted: readonly string[] = []
): AppAccessDecisionPort {
    return {
        isAuthenticated: () => authenticated,
        hasPermission: (permission) => granted.includes(permission),
    };
}

describe('evaluateAppAccess', () => {
    it('autorise une page publique sans port', () => {
        expect(evaluateAppAccess({ mode: 'public', permissions: [] }, null)).toBe(true);
    });

    it('refuse une page connectée sans session', () => {
        expect(evaluateAppAccess({ mode: 'authenticated', permissions: [] }, null)).toBe(false);
        expect(evaluateAppAccess({ mode: 'authenticated', permissions: [] }, decision(false))).toBe(false);
    });

    it('exige toutes les permissions d’une page autorisée', () => {
        const policy = { mode: 'authorized' as const, permissions: ['reports.read', 'reports.write'] };
        expect(evaluateAppAccess({ mode: 'authorized', permissions: [] }, decision(true))).toBe(false);
        expect(evaluateAppAccess(policy, decision(true, ['reports.read']))).toBe(false);
        expect(evaluateAppAccess(policy, decision(true, policy.permissions))).toBe(true);
    });

    it('refuse une politique absente ou incohérente', () => {
        expect(evaluateAppAccess(undefined, decision(true))).toBe(false);
        expect(evaluateAppAccess({ mode: 'public', permissions: ['unexpected'] }, null)).toBe(false);
    });
});
`;
}

function pageContract(design, experience, page, designPath, designSha256) {
    return {
        schema_version: '1.0.0',
        kind: 'page-realization-contract',
        design_ref: { path: designPath, sha256: designSha256 },
        design: {
            id: design.design.id,
            title: design.design.title,
            version: design.design.version,
        },
        experience: {
            id: experience.id,
            channel: experience.channel,
            offline_policy: experience.offline_policy,
            audience_ids: experience.audience_ids,
        },
        backend_contracts: design.backend_contracts,
        page,
    };
}

function placeholderPage(page) {
    return `import { Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
    imports: [TranslocoPipe],
    selector: 'app-page-${page.id.slice(-8)}',
    template: \`
        <main tabindex="-1">
            <h1>{{ '${page.id}.title' | transloco }}</h1>
            <p>{{ '${page.id}.pending' | transloco }}</p>
        </main>
    \`,
})
export class PageComponent {}
`;
}

function translations(pages) {
    return Object.fromEntries(
        pages.map((page) => [
            page.id,
            {
                title: page.title,
                pending:
                    'Cette page doit être réalisée depuis son contrat validé.',
            },
        ])
    );
}

export async function renderAngularPwaShell({
    design,
    experienceId,
    appName,
    designPath,
    designSha256,
}) {
    if (!/^[a-z][a-z0-9-]*$/.test(appName ?? ''))
        throw new Error('application shell: app name must be kebab-case');
    if (design.design?.status !== 'approved')
        throw new Error('application shell: design must be approved');
    const experience = design.experiences.find(
        (entry) => entry.id === experienceId
    );
    if (!experience)
        throw new Error(
            `application shell: unknown experience ${experienceId}`
        );
    if (experience.channel !== 'web')
        throw new Error(
            'application shell: angular-pwa supports only the web channel'
        );
    const pageById = new Map(design.pages.map((page) => [page.id, page]));
    const pages = experience.page_ids.map((id) => pageById.get(id));
    if (pages.some((page) => !page))
        throw new Error(
            'application shell: experience contains an unresolved page'
        );

    const root = `apps/${appName}`;
    const escapedTitle = escapedMarkup(design.design.title);
    const files = {
        '.cmz/libraries.json': json({
            schema_version: '1.0.0',
            kind: 'app-library-manifest',
            platform: 'angular',
            libraries: ['transloco'],
        }),
        'project.json': json({
            name: appName,
            $schema: '../../node_modules/nx/schemas/project-schema.json',
            projectType: 'application',
            prefix: 'app',
            sourceRoot: `${root}/src`,
            tags: ['type:app', `experience:${experience.id}`],
            targets: {
                build: {
                    executor: '@angular/build:application',
                    outputs: ['{options.outputPath}'],
                    defaultConfiguration: 'production',
                    options: {
                        outputPath: `dist/${root}`,
                        browser: `${root}/src/main.ts`,
                        tsConfig: `${root}/tsconfig.app.json`,
                        inlineStyleLanguage: 'scss',
                        assets: [{ glob: '**/*', input: `${root}/public` }],
                        styles: [`${root}/src/styles.scss`],
                    },
                    configurations: {
                        production: {
                            budgets: [
                                {
                                    type: 'initial',
                                    maximumWarning: '500kb',
                                    maximumError: '750kb',
                                },
                                {
                                    type: 'anyComponentStyle',
                                    maximumWarning: '4kb',
                                    maximumError: '8kb',
                                },
                            ],
                            outputHashing: 'all',
                        },
                        development: {
                            optimization: false,
                            extractLicenses: false,
                            sourceMap: true,
                        },
                    },
                },
                serve: {
                    continuous: true,
                    executor: '@angular/build:dev-server',
                    defaultConfiguration: 'development',
                    configurations: {
                        production: {
                            buildTarget: `${appName}:build:production`,
                        },
                        development: {
                            buildTarget: `${appName}:build:development`,
                        },
                    },
                },
                lint: {
                    options: {
                        lintFilePatterns: [
                            `${root}/**/*.ts`,
                            `${root}/**/*.html`,
                        ],
                    },
                },
                test: {
                    executor: '@angular/build:unit-test',
                    options: { watch: false },
                },
                'serve-static': {
                    continuous: true,
                    executor: '@nx/web:file-server',
                    options: {
                        buildTarget: `${appName}:build`,
                        staticFilePath: `dist/${root}/browser`,
                        spa: true,
                    },
                },
            },
        }),
        'tsconfig.json': json({
            extends: '../../tsconfig.base.json',
            compilerOptions: {
                noPropertyAccessFromIndexSignature: true,
                isolatedModules: true,
                emitDecoratorMetadata: false,
            },
            angularCompilerOptions: {
                enableI18nLegacyMessageIdFormat: false,
                strictInjectionParameters: true,
                strictInputAccessModifiers: true,
                strictTemplates: true,
            },
            files: [],
            include: [],
            references: [
                { path: './tsconfig.app.json' },
                { path: './tsconfig.spec.json' },
            ],
        }),
        'tsconfig.app.json': json({
            extends: './tsconfig.json',
            compilerOptions: { outDir: '../../dist/out-tsc', types: [] },
            include: ['src/**/*.ts'],
            exclude: ['src/**/*.spec.ts', 'src/**/*.test.ts'],
        }),
        'tsconfig.spec.json': json({
            extends: './tsconfig.json',
            compilerOptions: {
                outDir: '../../dist/out-tsc',
                types: ['vitest/globals'],
            },
            include: ['src/**/*.spec.ts', 'src/**/*.d.ts'],
        }),
        'eslint.config.mjs': `import nx from '@nx/eslint-plugin';
import baseConfig from '../../eslint.config.mjs';

export default [
    ...nx.configs['flat/angular'],
    ...nx.configs['flat/angular-template'],
    ...baseConfig,
    {
        files: ['**/*.ts'],
        rules: {
            '@angular-eslint/directive-selector': [
                'error',
                { type: 'attribute', prefix: 'app', style: 'camelCase' },
            ],
            '@angular-eslint/component-selector': [
                'error',
                { type: 'element', prefix: 'app', style: 'kebab-case' },
            ],
        },
    },
];
`,
        'src/index.html': `<!doctype html>
<html lang="fr">
    <head>
        <meta charset="utf-8" />
        <title>${escapedTitle}</title>
        <base href="/" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0b5d3b" />
        <link rel="manifest" href="manifest.webmanifest" />
    </head>
    <body>
        <app-root></app-root>
        <noscript>JavaScript est nécessaire pour utiliser cette application.</noscript>
    </body>
</html>
`,
        'src/main.ts': `import { bootstrapApplication } from '@angular/platform-browser';

import { App } from './app/app';
import { appConfig } from './app/app.config';

bootstrapApplication(App, appConfig)
    .then(() => {
        if ('serviceWorker' in navigator) {
            void navigator.serviceWorker.register('/sw.js');
        }
    })
    .catch((error: unknown) => console.error(error));
`,
        'src/app/app.ts': `import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
    imports: [RouterOutlet],
    selector: 'app-root',
    template: '<router-outlet />',
})
export class App {}
`,
        'src/app/app.config.ts': `import { provideHttpClient } from '@angular/common/http';
import {
    ApplicationConfig,
    isDevMode,
    provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideTransloco } from '@jsverse/transloco';

import { appRoutes } from './app.routes';
import { TranslocoHttpLoader } from './transloco-loader';

export const appConfig: ApplicationConfig = {
    providers: [
        provideBrowserGlobalErrorListeners(),
        provideHttpClient(),
        provideRouter(appRoutes),
        provideTransloco({
            config: {
                availableLangs: ['fr'],
                defaultLang: 'fr',
                reRenderOnLangChange: true,
                prodMode: !isDevMode(),
            },
            loader: TranslocoHttpLoader,
        }),
    ],
};
`,
        'src/app/access.guard.ts': accessGuard(),
        'src/app/access.guard.spec.ts': accessGuardSpec(),
        'src/app/app.routes.ts': renderRoutes(pages),
        'src/app/transloco-loader.ts': `import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Translation, TranslocoLoader } from '@jsverse/transloco';

@Injectable({ providedIn: 'root' })
export class TranslocoHttpLoader implements TranslocoLoader {
    private readonly http = inject(HttpClient);

    getTranslation(language: string) {
        return this.http.get<Translation>(\`i18n/\${language}.json\`);
    }
}
`,
        'src/styles.scss': `:root {
    color-scheme: light;
    font-family: system-ui, sans-serif;
}

body {
    margin: 0;
}

:focus-visible {
    outline: 3px solid #005fcc;
    outline-offset: 3px;
}
`,
        'public/i18n/fr.json': json(translations(pages)),
        'public/manifest.webmanifest': json({
            name: design.design.title,
            short_name: design.design.title.slice(0, 24),
            start_url: '/',
            scope: '/',
            display: 'standalone',
            background_color: '#ffffff',
            theme_color: '#0b5d3b',
            icons: [
                {
                    src: 'icon.svg',
                    sizes: 'any',
                    type: 'image/svg+xml',
                    purpose: 'any maskable',
                },
            ],
        }),
        'public/icon.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="${escapedTitle}">
    <rect width="512" height="512" rx="96" fill="#0b5d3b" />
    <path d="M148 270l70 70 150-168" fill="none" stroke="#fff" stroke-width="44" stroke-linecap="round" stroke-linejoin="round" />
</svg>
`,
        'public/sw.js': `const CACHE = 'cmz-shell-v1';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg'];

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    const requestUrl = new URL(event.request.url);
    if (requestUrl.origin !== self.location.origin) return;
    const cacheableDestination = ['document', 'script', 'style', 'image', 'font'].includes(
        event.request.destination
    );
    if (event.request.mode !== 'navigate' && !cacheableDestination) return;
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                if (response.ok && response.type === 'basic') {
                    const copy = response.clone();
                    void caches.open(CACHE).then((cache) => cache.put(event.request, copy));
                }
                return response;
            })
            .catch(() => caches.match(event.request).then((hit) => hit ?? caches.match('/index.html')))
    );
});
`,
    };
    for (const page of pages) {
        files[`src/app/pages/${page.id}/page.component.ts`] =
            placeholderPage(page);
        files[`.cmz/pages/${page.id}.json`] = json(
            pageContract(design, experience, page, designPath, designSha256)
        );
    }
    // Toute app gérée doit déclarer ses bibliothèques (ADR-0041) : sans ce
    // manifeste, `check:library-setup` refuse une app fraîchement créée. Le
    // shell livre Transloco et rien d'autre — Material et Tailwind sont opt-in
    // via `add-library` (ADR-0044). Ce fichier est donc le point de départ que
    // `add-library` fera ensuite évoluer, jamais une copie de leur config.
    files['.cmz/libraries.json'] = json({
        schema_version: '1.0.0',
        kind: 'app-library-manifest',
        platform: 'angular',
        libraries: ['transloco'],
    });
    const canonicalFiles = await canonicalizeGeneratedFiles(
        Object.fromEntries(
            Object.entries(files).map(([path, content]) => [
                `${root}/${path}`,
                content,
            ])
        )
    );
    for (const path of Object.keys(files)) {
        files[path] = canonicalFiles[`${root}/${path}`];
    }
    const artifacts = Object.entries(files)
        .map(([path, content]) => ({
            path,
            bytes: Buffer.byteLength(content),
            sha256: sha256(content),
        }))
        .sort((left, right) => left.path.localeCompare(right.path));
    const manifest = {
        schema_version: '1.0.0',
        kind: 'application-shell-manifest',
        app_name: appName,
        profile: 'angular-pwa',
        design_ref: { path: designPath, sha256: designSha256 },
        experience_id: experience.id,
        generated_files: artifacts,
        tree_sha256: sha256(
            artifacts
                .map((entry) => `${entry.path}\0${entry.sha256}`)
                .join('\0')
        ),
    };
    const canonicalManifest = await canonicalizeGeneratedFiles({
        [`${root}/.cmz/app-manifest.json`]: json(manifest),
    });
    files['.cmz/app-manifest.json'] =
        canonicalManifest[`${root}/.cmz/app-manifest.json`];
    return { files, manifest, experience, pages };
}
