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

function componentName(page) {
    return `Page${page.id.replace(/[^a-zA-Z0-9]/g, '')}`;
}

function renderRoutes(pages, entryPage) {
    const imports = pages
        .map(
            (page) =>
                `import { ${componentName(page)} } from './pages/${page.id}/page';`
        )
        .join('\n');
    const routes = pages
        .map((page) => {
            const element = `<${componentName(page)} />`;
            const guarded =
                page.access.mode === 'public'
                    ? element
                    : `<AppAccessGate policy={${JSON.stringify(page.access)}}>${element}</AppAccessGate>`;
            return `            <Route path=${quoted(page.path)} element={${guarded}} />`;
        })
        .join('\n');

    return `import { Navigate, Route, Routes } from 'react-router';

import { AppAccessGate } from './access-policy';
${imports}

export function AppRoutes() {
    return (
        <Routes>
${routes}
            <Route path="*" element={<Navigate replace to=${quoted(entryPage.path)} />} />
        </Routes>
    );
}
`;
}

function accessPolicy() {
    return `import type { ReactNode } from 'react';

export interface AppAccessDecisionPort {
    isAuthenticated(): boolean;
    hasPermission(permission: string): boolean;
}

export interface AppAccessPolicy {
    mode: 'public' | 'authenticated' | 'authorized';
    permissions: readonly string[];
}

declare global {
    interface Window {
        /** Contexte public injecté par le host avant le bootstrap React. */
        __cmzAppAccessContext?: unknown;
    }
}

function denyAll(): AppAccessDecisionPort {
    return Object.freeze({
        isAuthenticated: () => false,
        hasPermission: () => false,
    });
}

export function createBrowserAccessDecision(
    raw: unknown
): AppAccessDecisionPort {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return denyAll();
    }

    const context = raw as Record<string, unknown>;
    const keys = Object.keys(context).sort();
    if (
        keys.length !== 2 ||
        keys[0] !== 'authenticated' ||
        keys[1] !== 'permissions' ||
        context['authenticated'] !== true ||
        !Array.isArray(context['permissions']) ||
        !context['permissions'].every(
            (permission) =>
                typeof permission === 'string' && permission.length > 0
        )
    ) {
        return denyAll();
    }

    const permissions = new Set(context['permissions'] as readonly string[]);
    return Object.freeze({
        isAuthenticated: () => true,
        hasPermission: (permission: string) => permissions.has(permission),
    });
}

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
    return policy.permissions.every(
        (permission) =>
            permission.length > 0 && decision.hasPermission(permission)
    );
}

export function AppAccessGate({
    policy,
    children,
}: {
    policy: AppAccessPolicy;
    children: ReactNode;
}) {
    const decision = createBrowserAccessDecision(
        window.__cmzAppAccessContext
    );
    if (evaluateAppAccess(policy, decision)) return children;

    return (
        <main tabIndex={-1}>
            <h1>Accès refusé</h1>
            <p>Vous ne disposez pas des droits nécessaires pour consulter cette page.</p>
        </main>
    );
}
`;
}

function accessPolicySpec() {
    return `import { describe, expect, it } from 'vitest';

import {
    createBrowserAccessDecision,
    evaluateAppAccess,
} from './access-policy';
import type { AppAccessDecisionPort } from './access-policy';

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

describe('createBrowserAccessDecision', () => {
    it.each([
        undefined,
        null,
        true,
        {},
        { authenticated: false, permissions: [] },
        { authenticated: true, permissions: 'users.create' },
        { authenticated: true, permissions: [''] },
        { authenticated: true, permissions: [1] },
        {
            authenticated: true,
            permissions: ['users.create'],
            unexpected: true,
        },
    ])('échoue fermé pour un contexte absent ou invalide', (raw) => {
        const access = createBrowserAccessDecision(raw);

        expect(access.isAuthenticated()).toBe(false);
        expect(access.hasPermission('users.create')).toBe(false);
    });

    it('expose uniquement les permissions explicites du host', () => {
        const access = createBrowserAccessDecision({
            authenticated: true,
            permissions: ['users.create'],
        });

        expect(access.isAuthenticated()).toBe(true);
        expect(access.hasPermission('users.create')).toBe(true);
        expect(access.hasPermission('users.delete')).toBe(false);
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
    return `export function ${componentName(page)}() {
    return (
        <main tabIndex={-1}>
            <h1>${escapedMarkup(page.title)}</h1>
            <p>Cette page doit être réalisée depuis son contrat validé.</p>
        </main>
    );
}
`;
}

export async function renderReactSpaShell({
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
            'application shell: react-spa supports only the web channel'
        );
    if (experience.offline_policy !== 'none')
        throw new Error(
            'application shell: react-spa does not claim an offline policy'
        );
    const pageById = new Map(design.pages.map((page) => [page.id, page]));
    const pages = experience.page_ids.map((id) => pageById.get(id));
    if (pages.some((page) => !page))
        throw new Error(
            'application shell: experience contains an unresolved page'
        );
    const entryPage = pageById.get(experience.entry_page_id);
    if (!entryPage || !experience.page_ids.includes(entryPage.id))
        throw new Error(
            'application shell: experience entry page is unresolved'
        );

    const root = `apps/${appName}`;
    const escapedTitle = escapedMarkup(design.design.title);
    const files = {
        '.cmz/libraries.json': json({
            schema_version: '1.0.0',
            kind: 'app-library-manifest',
            platform: 'react',
            libraries: [],
        }),
        'project.json': json({
            name: appName,
            $schema: '../../node_modules/nx/schemas/project-schema.json',
            sourceRoot: `${root}/src`,
            projectType: 'application',
            tags: ['type:app', `experience:${experience.id}`],
        }),
        'vite.config.mts': `/// <reference types="vitest" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig(() => ({
    root: import.meta.dirname,
    cacheDir: '../../node_modules/.vite/${root}',
    server: {
        port: 4200,
        host: 'localhost',
    },
    preview: {
        port: 4300,
        host: 'localhost',
    },
    plugins: [react()],
    build: {
        outDir: '../../dist/${root}',
        emptyOutDir: true,
        reportCompressedSize: true,
        commonjsOptions: { transformMixedEsModules: true },
    },
    test: {
        name: ${quoted(appName)},
        watch: false,
        globals: true,
        environment: 'jsdom',
        include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
        reporters: ['default'],
        coverage: {
            reportsDirectory: '../../coverage/${root}',
            provider: 'v8' as const,
        },
    },
}));
`,
        'tsconfig.json': json({
            extends: '../../tsconfig.base.json',
            compilerOptions: {
                jsx: 'react-jsx',
                allowJs: false,
                allowSyntheticDefaultImports: true,
                strict: true,
                types: ['vite/client', 'vitest'],
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
            compilerOptions: {
                outDir: '../../dist/out-tsc',
                types: [
                    'node',
                    '@nx/react/typings/cssmodule.d.ts',
                    '@nx/react/typings/image.d.ts',
                    'vite/client',
                ],
            },
            exclude: [
                'src/**/*.spec.ts',
                'src/**/*.test.ts',
                'src/**/*.spec.tsx',
                'src/**/*.test.tsx',
                'vite.config.mts',
            ],
            include: ['src/**/*.ts', 'src/**/*.tsx'],
        }),
        'tsconfig.spec.json': json({
            extends: './tsconfig.json',
            compilerOptions: {
                outDir: '../../dist/out-tsc',
                types: [
                    'vitest/globals',
                    'vitest/importMeta',
                    'vite/client',
                    'node',
                    'vitest',
                    '@nx/react/typings/cssmodule.d.ts',
                    '@nx/react/typings/image.d.ts',
                ],
            },
            include: [
                'vite.config.mts',
                'src/**/*.test.ts',
                'src/**/*.spec.ts',
                'src/**/*.test.tsx',
                'src/**/*.spec.tsx',
                'src/**/*.d.ts',
            ],
        }),
        'eslint.config.mjs': `import reactHooks from 'eslint-plugin-react-hooks';
import baseConfig from '../../eslint.config.mjs';

export default [
    ...baseConfig,
    {
        files: ['**/*.ts', '**/*.tsx'],
        plugins: reactHooks.configs.flat.recommended.plugins,
        rules: reactHooks.configs.flat.recommended.rules,
    },
];
`,
        'index.html': `<!doctype html>
<html lang="fr">
    <head>
        <meta charset="utf-8" />
        <title>${escapedTitle}</title>
        <base href="/" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
    </head>
    <body>
        <div id="root"></div>
        <noscript>JavaScript est nécessaire pour utiliser cette application.</noscript>
        <script type="module" src="/src/main.tsx"></script>
    </body>
</html>
`,
        'public/icon.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="${escapedTitle}">
    <rect width="512" height="512" rx="96" fill="#0b5d3b" />
    <path d="M148 270l70 70 150-168" fill="none" stroke="#fff" stroke-width="44" stroke-linecap="round" stroke-linejoin="round" />
</svg>
`,
        'src/main.tsx': `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';

import { App } from './app/app';
import './styles.scss';

const container = document.getElementById('root');
if (!container) throw new Error("L'élément racine #root est absent.");

createRoot(container).render(
    <StrictMode>
        <BrowserRouter>
            <App />
        </BrowserRouter>
    </StrictMode>
);
`,
        'src/app/app.tsx': `import { AppRoutes } from './app.routes';

export function App() {
    return <AppRoutes />;
}
`,
        'src/app/app.routes.tsx': renderRoutes(pages, entryPage),
        'src/app/access-policy.tsx': accessPolicy(),
        'src/app/access-policy.spec.ts': accessPolicySpec(),
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
    };
    for (const page of pages) {
        files[`src/app/pages/${page.id}/page.tsx`] = placeholderPage(page);
        files[`.cmz/pages/${page.id}.json`] = json(
            pageContract(design, experience, page, designPath, designSha256)
        );
    }
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
        profile: 'react-spa',
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
