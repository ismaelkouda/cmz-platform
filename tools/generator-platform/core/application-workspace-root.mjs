// Vérification de la racine d'un produit extérieur : marqueur, fichiers
// possédés, applications scellées (ADR-0103) et fermeture des entrées.
// Extrait de application-workspace.mjs sans changement de comportement.
import { lstat, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

import { EXTERNAL_WORKSPACE_CMZ } from '../renderers/application-workspace-renderer.mjs';
import { verifyApplicationOwnership } from './application-ownership.mjs';
import {
    assertPhysicalPath,
    externalFailure,
    pathExists,
    readProductFile,
    safeRelativePath,
    verifyGeneratedTree,
} from './external-application-paths.mjs';
import { sha256 } from './generation-manifest.mjs';

const MANIFEST = EXTERNAL_WORKSPACE_CMZ.manifest;

export async function verifyWorkspaceRoot(plan, documentSources = false) {
    const { productRoot } = plan;
    if (!(await pathExists(resolve(productRoot, MANIFEST))))
        externalFailure('workspace ownership marker missing');
    if (
        sha256(await readProductFile(productRoot, MANIFEST)) !==
        sha256(plan.files[MANIFEST])
    )
        externalFailure('workspace ownership drift');
    for (const path of plan.manifest.directories) {
        const absolute = await assertPhysicalPath(resolve(productRoot, path));
        if (!(await lstat(absolute)).isDirectory())
            externalFailure('workspace directory missing');
    }
    for (const [path, expected] of Object.entries(plan.files)) {
        if (path === 'bun.lock') continue;
        const content = await readProductFile(productRoot, path);
        if (sha256(content) !== sha256(expected))
            externalFailure('workspace ownership drift');
    }
    const expected = new Set(Object.keys(plan.files));
    const inputs = new Set(plan.inputPaths ?? []);
    const ownedRoots = new Set([...expected].map((path) => path.split('/')[0]));
    for (const entry of await readdir(resolve(productRoot, 'apps'), {
        withFileTypes: true,
    })) {
        const working =
            /^\.([a-z][a-z0-9-]*)\.(?:(external|publication|previous)-candidate-[a-f0-9]{64}|generation-lock(?:\..*)?)$/.exec(
                entry.name
            );
        if (working) {
            if (!entry.isDirectory() || entry.isSymbolicLink())
                externalFailure('invalid working directory');
            // ADR-0103 : une publication interrompue bloque toute autre
            // commande ; seule la reprise de cette application passe.
            if (
                ['publication', 'previous'].includes(working[2]) &&
                working[1] !== plan.recoveringApp
            )
                externalFailure(
                    `interrupted publication pending for app ${working[1]}; recover it first`
                );
            continue;
        }
        if (!entry.isDirectory() || entry.isSymbolicLink())
            externalFailure('unowned app entry');
        const appRoot = resolve(productRoot, 'apps', entry.name);
        const app = JSON.parse(
            (await readProductFile(appRoot, '.cmz/app-manifest.json')).toString(
                'utf8'
            )
        );
        if (app.app_name !== entry.name || !plan.profiles.includes(app.profile))
            externalFailure('unowned app manifest');
        // ADR-0103 : inventaire scellé, expliqué par ses publications.
        verifyApplicationOwnership(app, plan.manifest.workspace_id);
        const designBytes = await readProductFile(
            productRoot,
            app.design_ref.path
        );
        if (sha256(designBytes) !== app.design_ref.sha256)
            externalFailure('workspace app input drift');
        const design = JSON.parse(designBytes.toString('utf8'));
        for (const input of await productInputClosure(
            productRoot,
            app.design_ref.path,
            design
        ))
            inputs.add(input.path);
        const files = await ownedFiles(appRoot, app.generated_files);
        files['.cmz/app-manifest.json'] = await readProductFile(
            appRoot,
            '.cmz/app-manifest.json'
        );
        await verifyGeneratedTree(appRoot, files);
    }
    const runtimeRoots = new Set([
        'node_modules',
        '.git',
        '.nx',
        '.angular',
        'dist',
        'coverage',
        'tmp',
    ]);
    async function reserved(directory, prefix = '') {
        for (const entry of await readdir(directory, { withFileTypes: true })) {
            const path = prefix + entry.name;
            if (!prefix && runtimeRoots.has(entry.name)) {
                if (entry.isSymbolicLink())
                    externalFailure('symbolic runtime root');
                continue;
            }
            if (path === 'descriptions' || path === 'apps') {
                if (!entry.isDirectory() || entry.isSymbolicLink())
                    externalFailure('invalid product namespace');
                if (path === 'apps' || !documentSources) continue;
            }
            if (entry.isSymbolicLink())
                externalFailure('symbolic workspace entry');
            const documentSource =
                documentSources && !ownedRoots.has(path.split('/')[0]);
            if (documentSource && !entry.isDirectory() && !entry.isFile())
                externalFailure('special document source entry');
            if (entry.isDirectory()) {
                if (
                    !documentSource &&
                    ![...expected, ...inputs].some((name) =>
                        name.startsWith(path + '/')
                    )
                )
                    externalFailure('unowned workspace directory');
                await reserved(resolve(directory, entry.name), path + '/');
            } else if (
                !documentSource &&
                !expected.has(path) &&
                !inputs.has(path) &&
                path !== 'bun.lock'
            ) {
                externalFailure('unowned workspace file');
            }
        }
    }
    await reserved(productRoot);
}

export async function ownedFiles(root, artifacts) {
    const files = {};
    for (const artifact of artifacts) {
        if (Object.hasOwn(files, artifact.path))
            externalFailure('duplicate owned path');
        const content = await readProductFile(root, artifact.path);
        if (
            sha256(content) !== artifact.sha256 ||
            content.length !== artifact.bytes
        )
            externalFailure('workspace ownership drift');
        files[artifact.path] = content.toString('utf8');
    }
    return files;
}

export function inputFilePath(path) {
    safeRelativePath(path);
    const reserved = new Set([
        'package.json',
        'bun.lock',
        'nx.json',
        'tsconfig.base.json',
        'eslint.config.mjs',
        '.prettierrc.json',
        '.prettierignore',
        '.gitignore',
        'README.md',
        'AGENTS.md',
    ]);
    if (
        reserved.has(path) ||
        /^(?:apps|node_modules|\.cmz|\.git|\.nx|\.angular|dist|coverage|tmp)\//.test(
            path
        )
    )
        externalFailure('input collides with reserved workspace namespace');
    return path;
}

export async function productInputClosure(root, designPath, design) {
    const paths = new Set([inputFilePath(designPath)]);
    const expectedHashes = new Map();
    for (const source of [
        ...(design.sources ?? []),
        ...(design.backend_contracts ?? []),
    ]) {
        paths.add(inputFilePath(source.snapshot_uri));
        expectedHashes.set(source.snapshot_uri, source.sha256);
    }
    for (const reference of design.backend_contracts ?? []) {
        const contract = JSON.parse(
            (await readProductFile(root, reference.snapshot_uri)).toString(
                'utf8'
            )
        );
        for (const source of contract.sources ?? []) {
            if (source.snapshot_uri) {
                paths.add(inputFilePath(source.snapshot_uri));
                expectedHashes.set(source.snapshot_uri, source.sha256);
            }
        }
    }
    const artifacts = [];
    for (const path of [...paths].sort()) {
        // Inputs stay at their declared relative paths; descriptions/ is a
        // convention, not a fallback or an additional business schema.
        const content = await readProductFile(root, path);
        if (
            expectedHashes.has(path) &&
            sha256(content) !== expectedHashes.get(path)
        )
            externalFailure(
                'product application-design rejected: workspace app input drift'
            );
        artifacts.push({
            path,
            sha256: sha256(content),
            bytes: content.length,
        });
    }
    return artifacts;
}
