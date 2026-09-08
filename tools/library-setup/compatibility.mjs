import { globSync, lstatSync, readFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';

import semver from 'semver';

import {
    catalogRangeIsBounded,
    parseWithoutDuplicateKeys,
} from '../check-library-setup-deps.mjs';
import { verificationFailures } from './compatibility-promotion.mjs';
import { validateJsonSchema } from '../generator-platform/validate-ir.mjs';

const SCHEMA_PATH = 'conventions/libraries/library-compat.schema.json';
const MATRIX_GLOB = 'conventions/libraries/*/*.compat.json';

function safeRead(root, path) {
    const absolute = resolve(root, path);
    const stats = lstatSync(absolute);
    if (stats.isSymbolicLink() || !stats.isFile()) {
        throw new Error(`${path} n'est pas un fichier régulier`);
    }
    return readFileSync(absolute, 'utf8');
}

export function validateCompatibilityMatrices(rootAbs, recipes) {
    const root = resolve(rootAbs);
    const errors = [];
    let schema;
    try {
        schema = parseWithoutDuplicateKeys(
            safeRead(root, SCHEMA_PATH),
            SCHEMA_PATH
        );
    } catch (error) {
        return { ok: false, matrices: new Map(), errors: [error.message] };
    }
    const matrices = new Map();
    for (const path of globSync(MATRIX_GLOB, { cwd: root }).sort()) {
        let matrix;
        try {
            matrix = parseWithoutDuplicateKeys(safeRead(root, path), path);
        } catch (error) {
            errors.push(error.message);
            continue;
        }
        errors.push(
            ...validateJsonSchema(matrix, schema).map(
                (error) => `${path} ${error}`
            )
        );
        const platform = basename(dirname(path));
        const library = basename(path, '.compat.json');
        if (matrix.platform !== platform || matrix.library !== library) {
            errors.push(`${path}: identité différente du chemin`);
        }
        const key = `${platform}/${library}`;
        if (matrices.has(key))
            errors.push(`${path}: matrice dupliquée pour ${key}`);
        matrices.set(key, matrix);
        const recipe = recipes.get(key);
        if (!recipe) {
            errors.push(`${path}: aucune recette ${key}`);
            continue;
        }
        const trackIds = new Set();
        for (const track of matrix.tracks ?? []) {
            if (trackIds.has(track.id))
                errors.push(`${path}: track dupliquée ${track.id}`);
            trackIds.add(track.id);
            const expectedPackages = [...(recipe.packages ?? [])].sort();
            const actualPackages = Object.keys(track.packages ?? {}).sort();
            if (
                JSON.stringify(expectedPackages) !==
                JSON.stringify(actualPackages)
            ) {
                errors.push(
                    `${path}#${track.id}: packages différents de la recette`
                );
            }
            for (const [name, version] of Object.entries(
                track.packages ?? {}
            )) {
                if (!semver.valid(version))
                    errors.push(`${path}#${track.id}: ${name} non exact`);
            }
            for (const [tool, range] of Object.entries(
                track.requirements ?? {}
            )) {
                if (!catalogRangeIsBounded(range)) {
                    errors.push(
                        `${path}#${track.id}: plage ${tool} invalide ou non bornée`
                    );
                }
            }
            // Une promotion doit être MÉRITÉE, pas déclarée. Le contrôle
            // précédent tenait en deux lignes et acceptait une piste
            // `verified` portant un SHA inexistant, sans qu'aucune preuve
            // n'ait jamais été exécutée — vérifié le 2026-09-08. Il exige
            // désormais un bloc produit par compatibility-promotion.mjs, et
            // il le confronte à l'état COURANT du dépôt : une vérification
            // n'est pas éternelle.
            if (track.status === 'candidate' && track.verification !== null) {
                errors.push(
                    `${path}#${track.id}: candidate avec une vérification`
                );
            }
            if (track.status === 'verified') {
                if (!track.verification) {
                    errors.push(
                        `${path}#${track.id}: verified sans bloc de vérification`
                    );
                } else {
                    for (const failure of verificationFailures(
                        root,
                        recipe,
                        track,
                        track.verification,
                        {
                            recipeRegistry: recipes,
                        }
                    )) {
                        errors.push(`${path}#${track.id}: ${failure}`);
                    }
                }
            }
        }
        const tracks = matrix.tracks ?? [];
        for (let left = 0; left < tracks.length; left += 1) {
            for (let right = left + 1; right < tracks.length; right += 1) {
                const overlaps = Object.keys(tracks[left].requirements).every(
                    (tool) =>
                        semver.intersects(
                            tracks[left].requirements[tool],
                            tracks[right].requirements[tool],
                            { includePrerelease: false }
                        )
                );
                if (overlaps) {
                    errors.push(
                        `${path}: pistes chevauchantes ${tracks[left].id} et ${tracks[right].id}`
                    );
                }
            }
        }
    }
    for (const key of recipes.keys()) {
        if (!matrices.has(key))
            errors.push(`matrice de compatibilité absente pour ${key}`);
    }
    return { ok: errors.length === 0, matrices, errors };
}

export function selectCompatibilityTrack(
    matrix,
    versions,
    { requiredStatus = 'verified' } = {}
) {
    if (!['candidate', 'verified'].includes(requiredStatus)) {
        throw new Error(`statut de sélection interdit : ${requiredStatus}`);
    }
    const matches = (matrix.tracks ?? []).filter(
        (track) =>
            track.status === requiredStatus &&
            Object.entries(track.requirements).every(([tool, range]) => {
                const version = versions[tool];
                return (
                    semver.valid(version) &&
                    semver.satisfies(version, range, {
                        includePrerelease: false,
                    })
                );
            }) &&
            (requiredStatus !== 'verified' ||
                ['node', 'bun', 'nx', 'framework'].every(
                    (tool) =>
                        versions[tool] ===
                        track.verification?.tested_versions?.[tool]
                ))
    );
    if (matches.length !== 1) {
        throw new Error(
            `${matrix.platform}/${matrix.library}: ${matches.length} piste ${requiredStatus} compatible (attendu exactement 1)`
        );
    }
    return matches[0];
}
