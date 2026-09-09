#!/usr/bin/env node
/**
 * Preuve exécutable des overrides de sécurité dont la compatibilité ne peut
 * pas être déduite du seul audit de vulnérabilités.
 *
 * `postcss-svgo@7` réclame SVGO 4 et la version 4.0.x est vulnérable. Le dépôt
 * force donc une version corrigée. Le même override Bun s'applique aussi à
 * `@svgr/plugin-svgo@8`, qui déclare encore SVGO 3 : accepter uniquement le
 * lockfile ne prouverait pas que la chaîne React fonctionne réellement.
 *
 * Cette gate est volontairement auto-invalidante : si les plages amont ou la
 * topologie changent, elle refuse de transformer ce changement en approbation
 * silencieuse et exige une nouvelle revue.
 */

import { createRequire } from 'node:module';
import { existsSync, lstatSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, join, parse, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import semver from 'semver';

import { parseJsonc } from './check-library-setup-deps.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MINIMUM_FIXED_SVGO = '4.1.0';

function fail(message) {
    throw new Error(`[security overrides] ${message}`);
}

function readJson(path, label) {
    try {
        return JSON.parse(readFileSync(path, 'utf8'));
    } catch (error) {
        fail(`${label} illisible ou invalide (${error.message})`);
    }
}

function assertPhysicalFileInside(root, path, label) {
    const rootReal = realpathSync(root);
    const pathReal = realpathSync(path);
    const rel = relative(rootReal, pathReal);
    if (
        rel === '..' ||
        rel.startsWith(`..${sep}`) ||
        resolve(rootReal, rel) !== pathReal
    ) {
        fail(`${label} sort du workspace: ${path}`);
    }
    const stat = lstatSync(pathReal);
    if (!stat.isFile() || stat.isSymbolicLink()) {
        fail(`${label} n'est pas un fichier physique: ${path}`);
    }
    return pathReal;
}

function resolvePackageManifest(requireFromConsumer, packageName) {
    try {
        return requireFromConsumer.resolve(`${packageName}/package.json`);
    } catch (error) {
        if (error?.code !== 'ERR_PACKAGE_PATH_NOT_EXPORTED') throw error;
    }

    let current = dirname(requireFromConsumer.resolve(packageName));
    const filesystemRoot = parse(current).root;
    while (current !== filesystemRoot) {
        const manifestPath = join(current, 'package.json');
        if (existsSync(manifestPath)) {
            const manifest = readJson(
                manifestPath,
                `${packageName}/package.json`
            );
            if (manifest.name === packageName) return manifestPath;
        }
        current = dirname(current);
    }
    fail(`manifest ${packageName} introuvable depuis son consommateur`);
}

export function validateSvgoOverrideContract({
    rootManifest,
    lockfile,
    svgrManifest,
    postcssSvgoManifest,
    svgrResolvedVersion,
    postcssResolvedVersion,
}) {
    const override = rootManifest?.overrides?.svgo;
    if (!semver.valid(override)) {
        fail(
            `overrides.svgo doit être une version exacte, reçu ${String(override)}`
        );
    }
    if (semver.lt(override, MINIMUM_FIXED_SVGO)) {
        fail(
            `overrides.svgo=${override} reste sous la première version corrigée ${MINIMUM_FIXED_SVGO}`
        );
    }
    if (lockfile?.overrides?.svgo !== override) {
        fail('bun.lock ne matérialise pas exactement overrides.svgo');
    }
    const locked = lockfile?.packages?.svgo?.[0];
    if (locked !== `svgo@${override}`) {
        fail(
            `bun.lock verrouille ${String(locked)} au lieu de svgo@${override}`
        );
    }

    const postcssRange = postcssSvgoManifest?.dependencies?.svgo;
    if (!semver.satisfies(override, postcssRange ?? '')) {
        fail(
            `postcss-svgo déclare ${String(postcssRange)}, incompatible avec l'override ${override}`
        );
    }

    const svgrRange = svgrManifest?.dependencies?.svgo;
    if (semver.satisfies(override, svgrRange ?? '')) {
        fail(
            `@svgr/plugin-svgo accepte désormais ${override}; la preuve exceptionnelle est périmée et doit être revue`
        );
    }
    if (!semver.validRange(svgrRange)) {
        fail(`plage SVGO de @svgr/plugin-svgo invalide: ${String(svgrRange)}`);
    }

    for (const [consumer, version] of [
        ['postcss-svgo', postcssResolvedVersion],
        ['@svgr/plugin-svgo', svgrResolvedVersion],
    ]) {
        if (version !== override) {
            fail(
                `${consumer} résout svgo@${String(version)}, attendu ${override}`
            );
        }
    }

    return Object.freeze({ override, postcssRange, svgrRange });
}

function resolveRuntime(root) {
    const rootRequire = createRequire(join(root, 'package.json'));
    const nxReactManifest = assertPhysicalFileInside(
        root,
        rootRequire.resolve('@nx/react/package.json'),
        'manifest @nx/react'
    );
    const nxRequire = createRequire(nxReactManifest);

    const coreManifestPath = assertPhysicalFileInside(
        root,
        nxRequire.resolve('@svgr/core/package.json'),
        'manifest @svgr/core'
    );
    const svgrManifestPath = assertPhysicalFileInside(
        root,
        nxRequire.resolve('@svgr/plugin-svgo/package.json'),
        'manifest @svgr/plugin-svgo'
    );
    const postcssManifestPath = assertPhysicalFileInside(
        root,
        nxRequire.resolve('postcss/package.json'),
        'manifest postcss'
    );
    const postcssSvgoManifestPath = assertPhysicalFileInside(
        root,
        nxRequire.resolve('postcss-svgo/package.json'),
        'manifest postcss-svgo'
    );

    const coreRequire = createRequire(coreManifestPath);
    const svgrRequire = createRequire(svgrManifestPath);
    const postcssRequire = createRequire(postcssManifestPath);
    const postcssSvgoRequire = createRequire(postcssSvgoManifestPath);

    const svgrResolvedManifestPath = assertPhysicalFileInside(
        root,
        resolvePackageManifest(svgrRequire, 'svgo'),
        'SVGO résolu par @svgr/plugin-svgo'
    );
    const postcssResolvedManifestPath = assertPhysicalFileInside(
        root,
        resolvePackageManifest(postcssSvgoRequire, 'svgo'),
        'SVGO résolu par postcss-svgo'
    );

    return {
        transform: coreRequire('@svgr/core').transform,
        svgrPlugin: svgrRequire('@svgr/plugin-svgo'),
        postcss: postcssRequire('postcss'),
        postcssSvgoPlugin: postcssSvgoRequire('postcss-svgo'),
        svgrManifest: readJson(
            svgrManifestPath,
            '@svgr/plugin-svgo/package.json'
        ),
        postcssSvgoManifest: readJson(
            postcssSvgoManifestPath,
            'postcss-svgo/package.json'
        ),
        svgrResolvedVersion: readJson(
            svgrResolvedManifestPath,
            'SVGO résolu par @svgr/plugin-svgo'
        ).version,
        postcssResolvedVersion: readJson(
            postcssResolvedManifestPath,
            'SVGO résolu par postcss-svgo'
        ).version,
    };
}

export async function verifySecurityOverrides(root = ROOT) {
    const rootManifest = readJson(join(root, 'package.json'), 'package.json');
    const lockfile = parseJsonc(
        readFileSync(join(root, 'bun.lock'), 'utf8'),
        'bun.lock'
    );
    const runtime = resolveRuntime(root);
    const contract = validateSvgoOverrideContract({
        rootManifest,
        lockfile,
        svgrManifest: runtime.svgrManifest,
        postcssSvgoManifest: runtime.postcssSvgoManifest,
        svgrResolvedVersion: runtime.svgrResolvedVersion,
        postcssResolvedVersion: runtime.postcssResolvedVersion,
    });

    const sourceSvg =
        '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="#ff0000"/></svg>';
    const svgrOutput = await runtime.transform(
        sourceSvg,
        { plugins: [runtime.svgrPlugin], runtimeConfig: false },
        { componentName: 'SecurityOverrideProbe' }
    );
    if (typeof svgrOutput !== 'string' || !svgrOutput.includes('<path')) {
        fail(
            "la transformation SVGR+SVGO n'a pas produit le SVG optimisé attendu"
        );
    }

    const encodedSvg = encodeURIComponent(sourceSvg).replace(/%20/g, ' ');
    const css = `.probe{background-image:url("data:image/svg+xml,${encodedSvg}")}`;
    const postcssOutput = await runtime
        .postcss([runtime.postcssSvgoPlugin()])
        .process(css, { from: undefined });
    if (
        postcssOutput.css === css ||
        !postcssOutput.css.includes('%3Cpath') ||
        postcssOutput.css.includes('%3Crect')
    ) {
        fail(
            "la transformation postcss-svgo n'a pas produit le SVG optimisé attendu"
        );
    }

    return contract;
}

function isMain() {
    return (
        process.argv[1] &&
        resolve(process.argv[1]) === fileURLToPath(import.meta.url)
    );
}

if (isMain()) {
    try {
        const proof = await verifySecurityOverrides(ROOT);
        console.log(
            `✔ Override SVGO ${proof.override} prouvé sur les deux consommateurs réels : postcss-svgo (${proof.postcssRange}) et @svgr/plugin-svgo (${proof.svgrRange}).`
        );
    } catch (error) {
        console.error(
            `✖ ${error instanceof Error ? error.message : String(error)}`
        );
        process.exitCode = 1;
    }
}
