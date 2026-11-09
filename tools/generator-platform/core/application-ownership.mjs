// ADR-0103 : inventaire d'application extérieure scellé et mis à jour sous plan.
// Le sceau ne dépend d'aucun secret : il empêche l'adoption par erreur ou en
// silence, pas une forge délibérée (calcul public, `tool` et `plan_id`
// déclaratifs) : voir les limites de l'ADR.
import {
    externalFailure,
    safeRelativePath,
} from './external-application-paths.mjs';
import { sha256, stableStringify } from './generation-manifest.mjs';

export const OWNERSHIP_SCHEMA_VERSION = '1.0.0';
export const PUBLICATION_TOOLS = Object.freeze([
    'generate:action-request',
    'generate:list-query',
    'generate:page-composition',
    'page-realization',
]);

const HEX = /^[a-f0-9]{64}$/;
const exactKeys = (value, keys) =>
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).sort().join('\0') === [...keys].sort().join('\0');
const digest = (entry) =>
    exactKeys(entry, ['sha256', 'bytes']) &&
    HEX.test(entry.sha256) &&
    Number.isSafeInteger(entry.bytes) &&
    entry.bytes >= 0;

export function inventoryTreeSha(entries) {
    return sha256(
        [...entries]
            .sort((left, right) => left.path.localeCompare(right.path))
            .map((entry) => `${entry.path}\0${entry.sha256}`)
            .join('\0')
    );
}

export function computeOwnershipSeal(manifest) {
    const { seal_sha256: _seal, ...ownership } = manifest.ownership ?? {};
    void _seal;
    return sha256(stableStringify({ ...manifest, ownership }));
}

function inventoryMap(entries) {
    const inventory = new Map();
    for (const entry of entries ?? []) {
        if (
            !exactKeys(entry, ['path', 'bytes', 'sha256']) ||
            inventory.has(entry.path)
        )
            externalFailure('app inventory is invalid');
        inventory.set(entry.path, { sha256: entry.sha256, bytes: entry.bytes });
    }
    return inventory;
}

const inventoryEntries = (inventory) =>
    [...inventory]
        .map(([path, { sha256: hash, bytes }]) => ({
            path,
            bytes,
            sha256: hash,
        }))
        .sort((left, right) => left.path.localeCompare(right.path));

function pageZone(path, inventory) {
    const match = /^src\/app\/pages\/([^/]+)\/[^/].*$/.exec(path);
    return Boolean(match && inventory.has(`.cmz/pages/${match[1]}.json`));
}

// Zones fermées : ajout sous generated/ ou dans une page déclarée ; remplacement
// d'un fichier de page de la coque ou d'un fichier ajouté par une publication.
export function assertPublicationZone(path, change, inventory, published) {
    safeRelativePath(path);
    if (
        path.startsWith('.cmz/') ||
        path.split('/').some((part) => part.startsWith('.'))
    )
        externalFailure('publication outside declared zones');
    const generated = /^src\/app\/generated\/[^/].*$/.test(path);
    if (change === 'added') {
        if (inventory.has(path))
            externalFailure('publication adds an owned file');
        if (!generated && !pageZone(path, inventory))
            externalFailure('publication outside declared zones');
    } else if (change === 'replaced') {
        if (!inventory.has(path))
            externalFailure('publication replaces an unowned file');
        if (!published.has(path) && !pageZone(path, inventory))
            externalFailure('publication outside declared zones');
    } else externalFailure('publication change is invalid');
}

function validRecord(record) {
    if (
        !exactKeys(record, ['plan_id', 'tool', 'files']) ||
        !HEX.test(record.plan_id) ||
        !PUBLICATION_TOOLS.includes(record.tool) ||
        !Array.isArray(record.files) ||
        record.files.length === 0
    )
        externalFailure('publication record is invalid');
    const paths = record.files.map((file) => file.path);
    if (paths.some((path, index) => index > 0 && paths[index - 1] >= path))
        externalFailure('publication record is invalid');
    for (const file of record.files) {
        const keys = ['path', 'change', 'sha256', 'bytes'];
        const shape =
            file?.change === 'replaced'
                ? exactKeys(file, [...keys, 'before']) && digest(file.before)
                : exactKeys(file, keys);
        if (
            !shape ||
            !digest({ sha256: file.sha256, bytes: file.bytes }) ||
            (file.change === 'replaced' && file.before.sha256 === file.sha256)
        )
            externalFailure('publication record is invalid');
    }
}

// Applique une publication à un inventaire, en contrôlant ses zones.
export function applyPublication(inventory, record, published) {
    validRecord(record);
    const next = new Map(inventory);
    for (const file of record.files) {
        assertPublicationZone(file.path, file.change, inventory, published);
        if (file.change === 'replaced') {
            const current = inventory.get(file.path);
            if (
                current.sha256 !== file.before.sha256 ||
                current.bytes !== file.before.bytes
            )
                externalFailure('publication replaces a changed file');
        }
        next.set(file.path, { sha256: file.sha256, bytes: file.bytes });
    }
    const nextPublished = new Set(published);
    for (const file of record.files)
        if (file.change === 'added') nextPublished.add(file.path);
    return { inventory: next, published: nextPublished };
}

export function sealShellManifest(manifest, workspaceId) {
    if (!HEX.test(workspaceId ?? ''))
        externalFailure('workspace identity is invalid');
    if (manifest.ownership !== undefined)
        externalFailure('shell manifest is already sealed');
    if (inventoryTreeSha(manifest.generated_files) !== manifest.tree_sha256)
        externalFailure('app inventory digest mismatch');
    const sealed = {
        ...manifest,
        ownership: {
            schema_version: OWNERSHIP_SCHEMA_VERSION,
            workspace_id: workspaceId,
            shell_tree_sha256: manifest.tree_sha256,
            publications: [],
        },
    };
    sealed.ownership.seal_sha256 = computeOwnershipSeal(sealed);
    return sealed;
}

function publishedPaths(publications) {
    const published = new Set();
    for (const record of publications)
        for (const file of record.files)
            if (file.change === 'added') published.add(file.path);
    return published;
}

export function verifyApplicationOwnership(manifest, workspaceId) {
    const ownership = manifest?.ownership;
    if (ownership === undefined) externalFailure('app ownership seal missing');
    if (
        !exactKeys(ownership, [
            'schema_version',
            'workspace_id',
            'shell_tree_sha256',
            'publications',
            'seal_sha256',
        ]) ||
        ownership.schema_version !== OWNERSHIP_SCHEMA_VERSION ||
        !HEX.test(ownership.shell_tree_sha256) ||
        !HEX.test(ownership.seal_sha256) ||
        !Array.isArray(ownership.publications)
    )
        externalFailure('app ownership seal is invalid');
    if (ownership.workspace_id !== workspaceId)
        externalFailure('app ownership bound to another workspace');
    if (computeOwnershipSeal(manifest) !== ownership.seal_sha256)
        externalFailure('app ownership seal mismatch');
    const current = inventoryMap(manifest.generated_files);
    if (inventoryTreeSha(manifest.generated_files) !== manifest.tree_sha256)
        externalFailure('app inventory digest mismatch');
    // Annulation de la dernière publication à la première : on doit retrouver
    // exactement l'inventaire créé par create-app.
    const shell = new Map(current);
    for (const record of [...ownership.publications].reverse()) {
        validRecord(record);
        for (const file of record.files) {
            const entry = shell.get(file.path);
            if (
                !entry ||
                entry.sha256 !== file.sha256 ||
                entry.bytes !== file.bytes
            )
                externalFailure(
                    'app inventory not explained by sealed publications'
                );
            if (file.change === 'added') shell.delete(file.path);
            else shell.set(file.path, { ...file.before });
        }
    }
    if (
        inventoryTreeSha(inventoryEntries(shell)) !==
        ownership.shell_tree_sha256
    )
        externalFailure('app inventory not explained by sealed publications');
    // Rejeu dans l'ordre : chaque publication respecte ses zones.
    let state = { inventory: shell, published: new Set() };
    for (const record of ownership.publications)
        state = applyPublication(state.inventory, record, state.published);
    return {
        inventory: current,
        published: publishedPaths(ownership.publications),
    };
}

// Nouveau manifeste après une publication relue, scellé à nouveau.
export function publishedManifest(manifest, record, workspaceId) {
    const { published } = verifyApplicationOwnership(manifest, workspaceId);
    const { inventory } = applyPublication(
        inventoryMap(manifest.generated_files),
        record,
        published
    );
    const generated = inventoryEntries(inventory);
    const next = {
        ...manifest,
        generated_files: generated,
        tree_sha256: inventoryTreeSha(generated),
        ownership: {
            ...manifest.ownership,
            publications: [...manifest.ownership.publications, record],
        },
    };
    next.ownership.seal_sha256 = computeOwnershipSeal(next);
    verifyApplicationOwnership(next, workspaceId);
    return next;
}
