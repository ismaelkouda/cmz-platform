#!/usr/bin/env node
import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';

import { provisionBrowser } from '../library-setup/browser-provisioning.mjs';
import {
    planApplicationWorkspace,
    planExternalApplicationShell,
    publishApplicationWorkspace,
    publishExternalApplicationShell,
} from './core/application-workspace.mjs';
import { verifyGeneratedTree } from './core/external-application-paths.mjs';
import { EXTERNAL_WORKSPACE_CMZ as CMZ } from './renderers/application-workspace-renderer.mjs';
import {
    formatProofStop,
    snapshotTree,
    TOOLS_ROOT,
    workspaceOptions,
} from './test-support/external-application-fixture.mjs';
import {
    confinedNode,
    installRealPackages,
    proofSession,
    record,
} from './proof-support/external-application-runtime.mjs';
import {
    displacedEntry,
    instrumentProduct,
    qualifyBrowser,
    qualifyMutations,
    qualifyWeights,
} from './proof-support/external-application-checks.mjs';

import {
    nativeDocumentFixture,
    runNativeDocumentCell,
    SHARED_DOCUMENT_SOURCE,
} from './proof-support/external-document-native.mjs';

export { qualifyNodeVersion } from './proof-support/external-application-runtime.mjs';
export { qualifyBrowser, qualifyWeights };

export function parseArgs(argv) {
    const options = {};
    const names = new Map([
        ['--proof-root', 'proofRoot'],
        ['--backend', 'backend'],
        ['--bun-executable', 'bunExecutable'],
    ]);
    for (let index = 0; index < argv.length; index += 1) {
        const key = names.get(argv[index]);
        const value = argv[++index];
        if (!key || options[key] || !value || value.startsWith('--'))
            throw new Error(
                'Arguments de preuve absents, inconnus ou répétés.'
            );
        options[key] = value;
    }
    if (!options.proofRoot || options.proofRoot !== resolve(options.proofRoot))
        throw new Error('--proof-root absolu canonique requis.');
    if (options.backend && !['macos', 'docker'].includes(options.backend))
        throw new Error('Backend non qualifié.');
    return options;
}

export async function main(argv = process.argv.slice(2)) {
    const options = parseArgs(argv);
    const proofStarted = performance.now();
    const session = await proofSession(options);
    const sourceBefore = await snapshotTree(TOOLS_ROOT);
    try {
        // Keep the two single-profile installation oracles, then install A and B
        // independently. No copied node_modules or synthetic certificate.
        for (const profile of ['angular-pwa', 'react-spa']) {
            const installStarted = performance.now();
            const options = workspaceOptions(resolve(session.root, profile), [
                profile,
            ]);
            const plan = await planApplicationWorkspace(options);
            assert.equal(
                (
                    await publishApplicationWorkspace({
                        ...options,
                        expectedPlanId: plan.plan_id,
                    })
                ).status,
                'prepared'
            );
            await installRealPackages(session, plan);
            session.lines.push(
                `installation/${profile} elapsed_ms=${Math.round(performance.now() - installStarted)}`
            );
        }
        const allPlans = [];
        let product;
        let input;
        let plans;
        for (const kind of ['A', 'B']) {
            const installStarted = performance.now();
            const root = resolve(session.root, `product-${kind.toLowerCase()}`);
            const options = workspaceOptions(root);
            const workspace = await planApplicationWorkspace(options);
            assert.equal(
                (
                    await publishApplicationWorkspace({
                        ...options,
                        expectedPlanId: workspace.plan_id,
                    })
                ).status,
                'prepared'
            );
            await installRealPackages(session, workspace);
            session.lines.push(
                `installation/${kind} elapsed_ms=${Math.round(performance.now() - installStarted)}`
            );
            const fixture = await nativeDocumentFixture(root, kind);
            const currentPlans = [];
            const shells = [];
            for (const profile of ['angular-pwa', 'react-spa']) {
                await runNativeDocumentCell(session, fixture, profile);
                const shell = {
                    workspaceRoot: TOOLS_ROOT,
                    targetRoot: root,
                    appName: `ext03a-${kind.toLowerCase()}-${profile}`,
                    profile,
                    designPath: fixture.designPath,
                    experienceId: fixture.design.experiences[0].id,
                };
                const plan = await planExternalApplicationShell(shell);
                await verifyGeneratedTree(plan.outputAbsolute, plan.files);
                currentPlans.push(plan);
                allPlans.push(plan);
                shells.push({ ...shell, expectedPlanId: plan.plan_id });
            }
            if (kind === 'A') {
                await displacedEntry(
                    session,
                    root,
                    SHARED_DOCUMENT_SOURCE,
                    () =>
                        confinedNode(session, root, [
                            `${CMZ.support}/check-workspace.mjs`,
                        ]),
                    /Échec du contrat workspace/
                );
            } else {
                // Preserve recovery, mutation, confinement and browser T9–T18.
                const run = (command, args, cwd) => {
                    assert.equal(command, process.execPath);
                    assert.equal(cwd, root);
                    record(
                        session,
                        `T9-T12/recovery/${args[2] ?? 'compiler'}`,
                        confinedNode(session, root, args)
                    );
                };
                for (const shell of shells)
                    assert.equal(
                        (await publishExternalApplicationShell(shell, { run }))
                            .recovered,
                        true
                    );
                product = root;
                plans = currentPlans;
                const publicPage = fixture.design.pages.find(
                    (page) => page.access.mode === 'public'
                );
                const protectedPage = fixture.design.pages.find(
                    (page) => page.access.mode === 'authenticated'
                );
                assert.ok(publicPage && protectedPage);
                input = {
                    browserFixture: {
                        title: fixture.design.design.title,
                        publicPath: publicPage.path,
                        publicTitle: publicPage.title,
                        protectedPath: protectedPage.path,
                        protectedTitle: protectedPage.title,
                    },
                };
            }
        }
        await session.save();
        const instrumentation = await instrumentProduct(
            session,
            product,
            input.browserFixture
        );
        for (const plan of plans)
            await qualifyMutations(session, product, plan);
        await qualifyWeights(session, product);
        const browser = await provisionBrowser({
            policy: session.policy,
            backend: session.backend,
            cacheRoot: resolve(session.root, 'browser-cache'),
            extractionRoot: resolve(session.root, 'browser'),
        });
        session.lines.push(
            `browser=${session.policy.browser.distribution}/${session.policy.browser.version}`
        );
        await qualifyBrowser(session, product, plans, browser);
        await verifyGeneratedTree(instrumentation.proof, instrumentation.files);
        await rm(instrumentation.proof, { recursive: true });
        for (const plan of allPlans)
            await verifyGeneratedTree(plan.outputAbsolute, plan.files);
        assert.deepEqual(
            await snapshotTree(TOOLS_ROOT),
            sourceBefore,
            'L’atelier a changé pendant la preuve'
        );
        session.lines.push(
            `native-proof elapsed_ms=${Math.round(performance.now() - proofStarted)}`,
            'PASS real-native-shells-and-mutants',
            'PASS EXT03a four document/native cells A+B Angular+React; no PWA or backend claim',
            'T19–T28 restent non qualifiés.'
        );
        await session.save();
        process.stdout.write(
            `Preuve shells terminée : ${session.root}/report.txt\n`
        );
    } catch (error) {
        session.lines.push(formatProofStop(error));
        await session.save();
        throw error;
    }
}

if (
    process.argv[1] &&
    pathToFileURL(process.argv[1]).href === import.meta.url
) {
    main().catch((error) => {
        process.stderr.write(`${formatProofStop(error)}\n`);
        process.exitCode = 1;
    });
}
