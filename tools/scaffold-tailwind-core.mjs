import { existsSync, lstatSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';

const ANGULAR_REFERENCES = ['backoffice-angular'];
const REACT_TEMPLATE = 'conventions/libraries/react/tailwind.template.css';

function fail(message) {
    throw new Error(`scaffold-tailwind: ${message}`);
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

function writeNew(root, relativePath, content) {
    const path = safePath(root, relativePath);
    if (existsSync(path)) fail(`${relativePath} existe déjà`);
    const parentStats = lstatSync(dirname(path));
    if (parentStats.isSymbolicLink() || !parentStats.isDirectory()) {
        fail(`${relativePath}: parent non régulier`);
    }
    writeFileSync(path, content, { flag: 'wx', mode: 0o644 });
}

function replaceRegular(root, relativePath, content) {
    const path = safePath(root, relativePath);
    const stats = lstatSync(path);
    if (stats.isSymbolicLink() || !stats.isFile()) {
        fail(`${relativePath} n'est pas un fichier régulier`);
    }
    writeFileSync(path, content, { mode: 0o644 });
}

function assertApp(repository, app) {
    if (!/^[a-z][a-z0-9-]*$/.test(app ?? '')) {
        fail('nom d’app kebab-case requis');
    }
    const appRoot = `apps/${app}`;
    const stats = lstatSync(safePath(repository, appRoot));
    if (stats.isSymbolicLink() || !stats.isDirectory()) {
        fail(`${appRoot} n'est pas un répertoire régulier`);
    }
}

function exactVersion(version) {
    if (
        !/^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?$/.test(
            version ?? ''
        )
    ) {
        fail('version Tailwind SemVer exacte requise');
    }
    return version;
}

function replaceOnce(content, search, replacement, label) {
    const occurrences = content.split(search).length - 1;
    if (occurrences !== 1) {
        fail(`${label}: une occurrence attendue, ${occurrences} trouvée(s)`);
    }
    return content.replace(search, replacement);
}

function angularReference(repository) {
    const existing = ANGULAR_REFERENCES.filter((name) =>
        existsSync(safePath(repository, `apps/${name}/.postcssrc.json`))
    );
    if (existing.length === 0) {
        fail('aucune référence Angular Tailwind disponible');
    }
    const candidates = existing.map((name) => ({
        name,
        postcss: readRegular(repository, `apps/${name}/.postcssrc.json`),
    }));
    const [first, ...rest] = candidates;
    if (rest.some(({ postcss }) => postcss !== first.postcss)) {
        fail(`références Angular divergentes : ${existing.join(', ')}`);
    }
    return first;
}

function scaffoldAngular(repository, app, version) {
    const appRoot = `apps/${app}`;
    const reference = angularReference(repository);
    const referenceCss = readRegular(
        repository,
        `apps/${reference.name}/src/tailwind.css`
    );
    const source = `@source '../../../apps/${reference.name}/src';`;
    const generated = replaceOnce(
        referenceCss,
        source,
        `@source '../../../apps/${app}/src';`,
        'source applicative Angular'
    );
    writeNew(repository, `${appRoot}/.postcssrc.json`, reference.postcss);
    writeNew(
        repository,
        `${appRoot}/src/tailwind.css`,
        `/* Adaptateur qualifié CMZ, tailwindcss@${version}. */\n${generated}`
    );

    const projectPath = `${appRoot}/project.json`;
    const project = JSON.parse(readRegular(repository, projectPath));
    const styles = project.targets?.build?.options?.styles;
    if (!Array.isArray(styles)) {
        fail(`${projectPath}: build.options.styles absent`);
    }
    const entry = `${appRoot}/src/tailwind.css`;
    if (styles.includes(entry)) fail(`${entry} est déjà câblé`);
    styles.unshift(entry);
    replaceRegular(
        repository,
        projectPath,
        `${JSON.stringify(project, null, 2)}\n`
    );
    return [
        `${appRoot}/.postcssrc.json`,
        `${appRoot}/src/tailwind.css`,
        projectPath,
    ];
}

function scaffoldReact(repository, app, version) {
    const appRoot = `apps/${app}`;
    const template = readRegular(repository, REACT_TEMPLATE);
    if (
        !template.includes("@import 'tailwindcss' source(none);") ||
        !template.includes("@source './';")
    ) {
        fail(`${REACT_TEMPLATE}: source React bornée absente`);
    }
    const cssPath = `${appRoot}/src/tailwind.css`;
    writeNew(
        repository,
        cssPath,
        `/* Adaptateur qualifié CMZ, tailwindcss@${version}. */\n${template}`
    );

    const mainPath = `${appRoot}/src/main.tsx`;
    const main = readRegular(repository, mainPath);
    if (main.includes("import './tailwind.css'")) {
        fail(`${mainPath}: Tailwind est déjà importé`);
    }
    replaceRegular(
        repository,
        mainPath,
        replaceOnce(
            main,
            "import './styles.scss';",
            "import './tailwind.css';\nimport './styles.scss';",
            `${mainPath}: import global SCSS`
        )
    );

    const vitePath = `${appRoot}/vite.config.mts`;
    let vite = readRegular(repository, vitePath);
    if (vite.includes('@tailwindcss/vite')) {
        fail(`${vitePath}: plugin Tailwind déjà présent`);
    }
    vite = replaceOnce(
        vite,
        "import react from '@vitejs/plugin-react';",
        "import tailwindcss from '@tailwindcss/vite';\nimport react from '@vitejs/plugin-react';",
        `${vitePath}: import React Vite`
    );
    vite = replaceOnce(
        vite,
        'plugins: [react()],',
        'plugins: [tailwindcss(), react()],',
        `${vitePath}: liste de plugins`
    );
    replaceRegular(repository, vitePath, vite);
    return [cssPath, mainPath, vitePath];
}

export function scaffoldTailwind({
    repository,
    app,
    platform,
    tailwindVersion,
}) {
    assertApp(repository, app);
    const version = exactVersion(tailwindVersion);
    if (platform === 'angular') {
        return scaffoldAngular(repository, app, version);
    }
    if (platform === 'react') {
        return scaffoldReact(repository, app, version);
    }
    fail(`plateforme non prise en charge : ${platform}`);
}
