// Produit fictif avec une coque Angular avec session, pour les publications
// extérieures sous plan (ADR-0103). Le runner injecté ne compile rien.
import assert from 'node:assert/strict';
import { cp, readFile, rename, rm } from 'node:fs/promises';
import { join, posix } from 'node:path';

import {
    planExternalApplicationShell,
    publishExternalApplicationShell,
} from '../core/application-workspace.mjs';
import {
    planApplicationPublication,
    publishApplicationPublication,
} from '../core/application-publication.mjs';
import {
    installMetadataOnly,
    prepareFixture,
    TOOLS_ROOT,
} from './external-application-fixture.mjs';
import {
    CMZ_MODULE_SPECIFIER,
    sessionShellOptions,
    writeExternalSessionDesign,
} from './external-session-fixture.mjs';

export const MANIFEST = '.cmz/app-manifest.json';
export const NOTICE = 'src/app/generated/x1-proof/notice.ts';

export async function sessionApp(t, domain) {
    const fixture = await prepareFixture(t);
    const input = await writeExternalSessionDesign(fixture.root, domain);
    await installMetadataOnly(fixture.plan);
    const shell = sessionShellOptions(input);
    const plan = await planExternalApplicationShell(shell);
    await publishExternalApplicationShell(
        { ...shell, expectedPlanId: plan.plan_id },
        { run: () => undefined }
    );
    const app = join(fixture.root, 'apps', shell.appName);
    const page = `src/app/pages/${input.entryPage.id}/page.component.ts`;
    return {
        ...fixture,
        input,
        shell,
        app,
        page,
        workspaceId: plan.workspace.manifest.workspace_id,
        base: {
            workspaceRoot: TOOLS_ROOT,
            targetRoot: fixture.root,
            appName: shell.appName,
        },
    };
}

export const readManifest = async (app) =>
    JSON.parse(await readFile(join(app, MANIFEST), 'utf8'));

export function publication(product, files, tool = 'generate:action-request') {
    return { ...product.base, tool, files };
}

export async function publish(options, dependencies = {}) {
    const plan = await planApplicationPublication(options);
    const labels = [];
    const result = await publishApplicationPublication(
        { ...options, expectedPlanId: plan.plan_id },
        {
            run: (command, args, cwd) => {
                assert.equal(command, process.execPath);
                assert.equal(cwd, options.targetRoot);
                assert.ok(args[0].startsWith(options.targetRoot + '/'));
                labels.push(
                    args[0].endsWith('check-workspace.mjs')
                        ? 'workspace-contract'
                        : args[1] === 'run'
                          ? args[2]
                          : 'native-compiler'
                );
            },
            ...dependencies,
        }
    );
    return { plan, result, labels };
}

// Arrêt brutal après l'échange : arbre neuf en place, ancien mis de côté.
export async function interruptAfterSwap(product, options) {
    const plan = await planApplicationPublication(options);
    const copies = ['interrupted-new', 'interrupted-old'].map((name) =>
        join(product.root, name)
    );
    await assert.rejects(
        publishApplicationPublication(
            { ...options, expectedPlanId: plan.plan_id },
            {
                run: () => undefined,
                phase: async (name) => {
                    if (name !== 'published') return;
                    await cp(product.app, copies[0], { recursive: true });
                    await cp(plan.previous, copies[1], { recursive: true });
                    throw new Error('stop');
                },
            }
        ),
        /stop/
    );
    await rename(product.app, join(product.root, 'apps', '.discard'));
    await rm(join(product.root, 'apps', '.discard'), { recursive: true });
    await rename(copies[0], product.app);
    await rename(copies[1], plan.previous);
    return plan;
}

// T11 : la sortie n'importe que les paquets installés du produit et ses propres
// fichiers possédés ; aucun module cmz ni chemin de l'atelier.
export function assertProductOnlyImports(files, owned) {
    for (const [path, content] of Object.entries(files)) {
        assert.doesNotMatch(content, CMZ_MODULE_SPECIFIER, path);
        assert.equal(content.includes(TOOLS_ROOT), false, path);
        assert.doesNotMatch(content, /\/Users\/|\/private\/|https?:\/\//, path);
        if (!path.endsWith('.ts')) continue;
        for (const [, specifier] of content.matchAll(
            /(?:from|import)\s*\(?\s*'([^']+)'/g
        )) {
            if (!specifier.startsWith('.')) {
                assert.match(
                    specifier,
                    /^(?:@angular\/[a-z-]+(?:\/[a-z-]+)?|rxjs)$/,
                    path
                );
                continue;
            }
            const target = posix.join(posix.dirname(path), specifier);
            assert.ok(
                owned.has(`${target}.ts`) || owned.has(`${target}/index.ts`),
                `${path} importe ${specifier} hors de l’application`
            );
        }
    }
}
