import { createHash } from 'node:crypto';
import {
    existsSync,
    lstatSync,
    mkdirSync,
    readFileSync,
    writeFileSync,
} from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';

const ADAPTER_VERSION = '1.0.0';
const MATERIAL_THEME = `// Include theming for Angular Material with \`mat.theme()\`.
// This Sass mixin defines the Material 3 design tokens used by components.
@use '@angular/material' as mat;

html {
    height: 100%;
    @include mat.theme(
        (
            color: (
                primary: mat.$azure-palette,
                tertiary: mat.$blue-palette,
            ),
            typography: (
                plain-family: system-ui,
                brand-family: system-ui,
            ),
            density: 0,
        )
    );
}

body {
    color-scheme: light;
    background-color: var(--mat-sys-surface);
    color: var(--mat-sys-on-surface);
    font: var(--mat-sys-body-medium);
    margin: 0;
    height: 100%;
}

`;

function fail(message) {
    throw new Error(`qualified library adapter: ${message}`);
}

function sha256(content) {
    return createHash('sha256').update(content).digest('hex');
}

function stable(value) {
    if (Array.isArray(value)) return value.map(stable);
    if (value !== null && typeof value === 'object') {
        return Object.fromEntries(
            Object.keys(value)
                .sort()
                .map((key) => [key, stable(value[key])])
        );
    }
    return value;
}

function safePath(root, relativePath) {
    if (
        typeof relativePath !== 'string' ||
        relativePath === '' ||
        relativePath.startsWith('/') ||
        relativePath.split('/').some((part) => !part || part === '..')
    ) {
        fail(`chemin relatif invalide : ${relativePath}`);
    }
    const absolute = resolve(root, ...relativePath.split('/'));
    const within = relative(resolve(root), absolute);
    if (within === '..' || within.startsWith(`..${sep}`)) {
        fail(`chemin hors workspace : ${relativePath}`);
    }
    return absolute;
}

function readRegular(root, relativePath) {
    const path = safePath(root, relativePath);
    const stats = lstatSync(path);
    if (stats.isSymbolicLink() || !stats.isFile()) {
        fail(`${relativePath} n'est pas un fichier régulier`);
    }
    return readFileSync(path, 'utf8');
}

function writeOwned(root, relativePath, content, { createOnly = false } = {}) {
    const path = safePath(root, relativePath);
    if (existsSync(path)) {
        const stats = lstatSync(path);
        if (stats.isSymbolicLink() || !stats.isFile()) {
            fail(`${relativePath} existe sans être un fichier régulier`);
        }
        if (createOnly) fail(`${relativePath} existe déjà`);
    } else {
        mkdirSync(dirname(path), { recursive: true });
    }
    writeFileSync(path, content, { mode: 0o644 });
}

function readJson(root, path) {
    try {
        return JSON.parse(readRegular(root, path));
    } catch (error) {
        fail(`${path} illisible (${error.message})`);
    }
}

function appContext(workspace, app, platform) {
    if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(app ?? '')) {
        fail('nom d’app invalide');
    }
    const appRoot = `apps/${app}`;
    const project = readJson(workspace, `${appRoot}/project.json`);
    if (
        project.name !== app ||
        project.projectType !== 'application' ||
        typeof project.sourceRoot !== 'string' ||
        !project.sourceRoot.startsWith(`${appRoot}/`)
    ) {
        fail(`${appRoot}/project.json ne décrit pas l’application attendue`);
    }
    if (
        platform !== 'angular' ||
        project.targets?.build?.executor !== '@angular/build:application'
    ) {
        fail(`adaptateur ${platform} non pris en charge pour ${app}`);
    }
    return { appRoot, project, sourceRoot: project.sourceRoot };
}

function updateManifest(workspace, appRoot, platform, library) {
    const path = `${appRoot}/.cmz/libraries.json`;
    const manifest = readJson(workspace, path);
    if (
        manifest.schema_version !== '1.0.0' ||
        manifest.kind !== 'app-library-manifest' ||
        manifest.platform !== platform ||
        !Array.isArray(manifest.libraries) ||
        manifest.libraries.some((entry) => typeof entry !== 'string')
    ) {
        fail(`${path} invalide`);
    }
    if (manifest.libraries.includes(library)) {
        fail(`${library} est déjà déclarée dans ${path}`);
    }
    manifest.libraries.push(library);
    manifest.libraries.sort();
    writeOwned(workspace, path, `${JSON.stringify(manifest, null, 2)}\n`);
}

function applyMaterial(workspace, context) {
    const styles = context.project.targets.build.options.styles;
    if (!Array.isArray(styles)) fail('tableau build.options.styles absent');
    const candidates = styles.filter(
        (entry) =>
            typeof entry === 'string' &&
            entry.startsWith(`${context.sourceRoot}/`) &&
            entry.endsWith('.scss')
    );
    if (candidates.length !== 1) {
        fail(
            `une seule feuille SCSS globale attendue, trouvé ${candidates.length}`
        );
    }
    const current = readRegular(workspace, candidates[0]);
    if (
        current.includes("@use '@angular/material'") ||
        current.includes('mat.theme(')
    ) {
        fail('un thème Angular Material existe déjà hors manifeste');
    }
    writeOwned(workspace, candidates[0], `${MATERIAL_THEME}${current}`);
}

function applyTailwind(workspace, context, track) {
    const version = track.packages?.tailwindcss;
    if (
        !/^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)/.test(version ?? '')
    ) {
        fail('version Tailwind exacte absente de la piste qualifiée');
    }
    const reference = 'apps/backoffice-angular';
    const postcss = readRegular(workspace, `${reference}/.postcssrc.json`);
    const referenceCss = readRegular(
        workspace,
        `${reference}/src/tailwind.css`
    );
    const source = `@source '../../../apps/backoffice-angular/src';`;
    if (referenceCss.split(source).length !== 2) {
        fail(
            'la source applicative Tailwind de référence est absente ou ambiguë'
        );
    }
    const generated = referenceCss.replace(
        source,
        `@source '../../../apps/${context.project.name}/src';`
    );
    writeOwned(workspace, `${context.appRoot}/.postcssrc.json`, postcss, {
        createOnly: true,
    });
    writeOwned(
        workspace,
        `${context.sourceRoot}/tailwind.css`,
        `/* Adaptateur qualifié CMZ, tailwindcss@${version}. */\n${generated}`,
        { createOnly: true }
    );
    const styles = context.project.targets?.build?.options?.styles;
    if (!Array.isArray(styles)) fail('tableau build.options.styles absent');
    const entry = `${context.sourceRoot}/tailwind.css`;
    if (styles.includes(entry)) fail(`${entry} est déjà câblé`);
    styles.unshift(entry);
    writeOwned(
        workspace,
        `${context.appRoot}/project.json`,
        `${JSON.stringify(context.project, null, 2)}\n`
    );
}

function applyTransloco(workspace, context) {
    const configPath = `${context.sourceRoot}/app/app.config.ts`;
    let config = readRegular(workspace, configPath);
    const alreadyWired =
        config.includes('provideTransloco(') &&
        existsSync(
            safePath(workspace, `${context.sourceRoot}/app/transloco-loader.ts`)
        );
    if (!alreadyWired) {
        const exportAnchor = 'export const appConfig: ApplicationConfig = {';
        const providersAnchor = 'providers: [';
        if (
            !config.includes(exportAnchor) ||
            config.split(providersAnchor).length !== 2
        ) {
            fail('forme app.config.ts non reconnue pour Transloco');
        }
        const imports = `import { provideHttpClient } from '@angular/common/http';\nimport { isDevMode } from '@angular/core';\nimport { provideTransloco } from '@jsverse/transloco';\nimport { TranslocoHttpLoader } from './transloco-loader';\n`;
        const providers = `providers: [\n        provideHttpClient(),\n        provideTransloco({\n            config: {\n                availableLangs: ['en', 'es'],\n                defaultLang: 'en',\n                reRenderOnLangChange: true,\n                prodMode: !isDevMode(),\n            },\n            loader: TranslocoHttpLoader,\n        }),\n        `;
        config = `${imports}${config.replace(providersAnchor, providers)}`;
        writeOwned(workspace, configPath, config);
        writeOwned(
            workspace,
            `${context.sourceRoot}/app/transloco-loader.ts`,
            `import { HttpClient } from '@angular/common/http';\nimport { inject, Injectable } from '@angular/core';\nimport { Translation, TranslocoLoader } from '@jsverse/transloco';\n\n@Injectable({ providedIn: 'root' })\nexport class TranslocoHttpLoader implements TranslocoLoader {\n    private readonly http = inject(HttpClient);\n\n    getTranslation(language: string) {\n        return this.http.get<Translation>(\`i18n/\${language}.json\`);\n    }\n}\n`,
            { createOnly: true }
        );
        for (const language of ['en', 'es']) {
            writeOwned(
                workspace,
                `${context.appRoot}/public/i18n/${language}.json`,
                '{}\n',
                { createOnly: true }
            );
        }
    }
}

function descriptorInputs(repository, platform, library) {
    const paths = ['tools/library-setup/qualified-adapters.mjs'];
    if (platform === 'angular' && library === 'tailwind') {
        paths.push(
            'apps/backoffice-angular/.postcssrc.json',
            'apps/backoffice-angular/src/tailwind.css'
        );
    }
    return Object.fromEntries(
        paths
            .sort()
            .map((path) => [path, sha256(readRegular(repository, path))])
    );
}

export function qualifiedAdapterDescriptor(repository, platform, library) {
    const supported = new Set([
        'angular/angular-material',
        'angular/tailwind',
        'angular/transloco',
    ]);
    const key = `${platform}/${library}`;
    if (!supported.has(key)) fail(`adaptateur absent : ${key}`);
    const payload = {
        schema_version: ADAPTER_VERSION,
        id: `${key}@1`,
        inputs_sha256: descriptorInputs(repository, platform, library),
    };
    return {
        ...payload,
        digest_sha256: sha256(JSON.stringify(stable(payload))),
    };
}

/**
 * Transformations possédées par la plateforme. Cette fonction ne charge ni
 * schematic, ni paquet cible, ni navigateur. Ses seules entrées sont le tree
 * applicatif et la piste exacte déjà qualifiée.
 */
export function applyQualifiedAdapter({
    workspace,
    app,
    platform,
    library,
    track,
}) {
    const context = appContext(workspace, app, platform);
    if (library === 'angular-material') applyMaterial(workspace, context);
    else if (library === 'tailwind') applyTailwind(workspace, context, track);
    else if (library === 'transloco') applyTransloco(workspace, context);
    else fail(`adaptateur absent : ${platform}/${library}`);
    updateManifest(workspace, context.appRoot, platform, library);
    return qualifiedAdapterDescriptor(workspace, platform, library);
}
