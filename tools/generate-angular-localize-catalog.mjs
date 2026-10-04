#!/usr/bin/env node

import {
    existsSync,
    globSync,
    mkdirSync,
    readFileSync,
    unlinkSync,
    writeFileSync,
} from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');
const MAX_MESSAGES_PER_PACK = 500;

const APPLICATIONS = [
    {
        name: 'backoffice-angular',
        source: 'apps/backoffice-angular/src/locale/messages.fr.source.json',
        target: 'apps/backoffice-angular/src/app/i18n/messages.fr.generated.ts',
    },
];

function flatten(node, prefix = '', target = new Map()) {
    if (!node || typeof node !== 'object' || Array.isArray(node)) {
        throw new Error(`Le catalogue racine doit être un objet JSON.`);
    }
    for (const [segment, value] of Object.entries(node)) {
        const key = prefix ? `${prefix}.${segment}` : segment;
        if (typeof value === 'string') {
            target.set(key, value);
        } else if (
            value &&
            typeof value === 'object' &&
            !Array.isArray(value)
        ) {
            flatten(value, key, target);
        } else {
            throw new Error(`${key}: seule une feuille string est autorisée.`);
        }
    }
    return target;
}

function quoteKey(value) {
    return `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;
}

function escapeTemplate(value) {
    return value
        .replaceAll('\\', '\\\\')
        .replaceAll('`', '\\`')
        .replaceAll('${', '\\${');
}

function renderPack(sourcePath, packName, messages) {
    const entries = messages
        .map(
            ([key, message]) =>
                `        ${quoteKey(key)}: $localize\`:@@${key}:${escapeTemplate(message)}\`,`
        )
        .join('\n');

    return `/*
 * AUTO-GÉNÉRÉ par tools/generate-angular-localize-catalog.mjs.
 * Source : ${sourcePath}
 *
 * Ne pas modifier ce fichier directement. Chaque valeur est un tagged
 * template $localize statique : Angular peut l'extraire et la remplacer à la
 * compilation, tandis que les clés historiques restent résolubles au runtime.
 */
export const ${packName}: Readonly<Record<string, string>> =
    Object.freeze({
${entries}
    });
`;
}

function renderIndex(sourcePath, packs) {
    const imports = packs
        .map(
            ({ exportName, fileStem }) =>
                `import { ${exportName} } from './${fileStem}';`
        )
        .join('\n');
    const spreads = packs
        .map(({ exportName }) => `        ...${exportName},`)
        .join('\n');

    return `/*
 * AUTO-GÉNÉRÉ par tools/generate-angular-localize-catalog.mjs.
 * Source : ${sourcePath}
 *
 * Index borné : les tagged templates $localize vivent dans des packs générés
 * de moins de 800 lignes afin de respecter le budget de maintenabilité.
 */
${imports}

export const FR_LOCALIZED_MESSAGES: Readonly<Record<string, string>> =
    Object.freeze({
${spreads}
    });
`;
}

function expectedFiles(application, messages) {
    const targetPath = join(ROOT, application.target);
    const targetDirectory = dirname(targetPath);
    const entries = [...messages.entries()];
    const packs = [];
    const files = new Map();

    for (
        let offset = 0, packIndex = 1;
        offset < entries.length;
        offset += MAX_MESSAGES_PER_PACK, packIndex += 1
    ) {
        const suffix = String(packIndex).padStart(3, '0');
        const fileStem = `messages.fr.pack-${suffix}.generated`;
        const exportName = `FR_LOCALIZED_MESSAGES_PACK_${suffix}`;
        packs.push({ exportName, fileStem });
        files.set(
            join(targetDirectory, `${fileStem}.ts`),
            renderPack(
                application.source,
                exportName,
                entries.slice(offset, offset + MAX_MESSAGES_PER_PACK)
            )
        );
    }

    files.set(targetPath, renderIndex(application.source, packs));
    return files;
}

let stale = false;
for (const application of APPLICATIONS) {
    const sourcePath = join(ROOT, application.source);
    const targetPath = join(ROOT, application.target);
    const source = JSON.parse(readFileSync(sourcePath, 'utf8'));
    const messages = flatten(source);
    const expected = expectedFiles(application, messages);
    const generatedDirectory = dirname(targetPath);
    const actualPackPaths = new Set(
        globSync('messages.fr.pack-*.generated.ts', {
            cwd: generatedDirectory,
        }).map((path) => join(generatedDirectory, path))
    );
    const expectedPackPaths = new Set(
        [...expected.keys()].filter((path) => path !== targetPath)
    );
    const stalePacks = [...actualPackPaths].filter(
        (path) => !expectedPackPaths.has(path)
    );
    const staleFiles = [...expected].filter(
        ([path, content]) =>
            !existsSync(path) || readFileSync(path, 'utf8') !== content
    );

    if (staleFiles.length === 0 && stalePacks.length === 0) {
        console.log(
            `[angular-localize] ${application.name}: ${messages.size} messages à jour dans ${expectedPackPaths.size} packs.`
        );
        continue;
    }

    if (CHECK) {
        console.error(
            `[angular-localize] ${application.name}: catalogue généré absent ou périmé (${staleFiles.length} fichier(s), ${stalePacks.length} pack(s) obsolète(s)). Exécuter bun run i18n:generate:angular.`
        );
        stale = true;
        continue;
    }

    mkdirSync(dirname(targetPath), { recursive: true });
    for (const stalePack of stalePacks) unlinkSync(stalePack);
    for (const [path, content] of expected) writeFileSync(path, content);
    console.log(
        `[angular-localize] ${application.name}: ${messages.size} messages générés dans ${expectedPackPaths.size} packs (${[...expectedPackPaths].map((path) => basename(path)).join(', ')}).`
    );
}

if (stale) process.exitCode = 1;
