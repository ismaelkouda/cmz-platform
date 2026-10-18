#!/usr/bin/env node
import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { provisionBrowser } from '../library-setup/browser-provisioning.mjs';
import {
    planApplicationWorkspace,
    planExternalApplicationShell,
    publishApplicationWorkspace,
    publishExternalApplicationShell,
} from './core/application-workspace.mjs';
import {
    readProductFile,
    verifyGeneratedTree,
} from './core/external-application-paths.mjs';
import { EXTERNAL_WORKSPACE_CMZ as CMZ } from './renderers/application-workspace-renderer.mjs';
import {
    formatProofStop,
    hash,
    snapshotTree,
    TOOLS_ROOT,
    workspaceOptions,
    writeExternalDesign,
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
    const session = await proofSession(options);
    const sourceBefore = await snapshotTree(TOOLS_ROOT);
    try {
        const product = resolve(session.root, 'product');
        const prepareOptions = workspaceOptions(product);
        let workspace;
        for (const profiles of [
            ['angular-pwa'],
            ['react-spa'],
            prepareOptions.profiles,
        ]) {
            const targetRoot =
                profiles.length === 2
                    ? product
                    : resolve(session.root, profiles[0]);
            workspace = await planApplicationWorkspace({
                ...prepareOptions,
                profiles,
                targetRoot,
            });
            assert.equal(
                (
                    await publishApplicationWorkspace({
                        ...prepareOptions,
                        profiles,
                        targetRoot,
                        expectedPlanId: workspace.plan_id,
                    })
                ).status,
                'prepared'
            );
            await installRealPackages(session, workspace);
        }
        const sharedPath =
            'examples/application-conception-proof/project-brief.md';
        const sharedContent = await readProductFile(TOOLS_ROOT, sharedPath);
        const input = await writeExternalDesign(product, {
            path: sharedPath,
            content: sharedContent,
        });
        session.lines.push(
            `fictitious_shared_source=${sharedPath} sha256=${hash(sharedContent)}`
        );
        const plans = [];
        const shellOptions = [];
        const run = (command, args, root) => {
            assert.equal(command, process.execPath);
            assert.equal(root, product);
            const label =
                args[1] === 'run'
                    ? args[2]
                    : args[0].endsWith('check-workspace.mjs')
                      ? 'workspace-contract'
                      : 'native-compiler';
            record(
                session,
                `T9-T12/${label}`,
                confinedNode(session, product, args)
            );
        };
        for (const profile of ['angular-pwa', 'react-spa']) {
            const shell = {
                workspaceRoot: TOOLS_ROOT,
                targetRoot: product,
                appName:
                    profile === 'angular-pwa'
                        ? 'native-angular'
                        : 'native-react',
                profile,
                designPath: input.designPath,
                experienceId: input.experienceId,
            };
            const plan = await planExternalApplicationShell(shell);
            const result = await publishExternalApplicationShell(
                { ...shell, expectedPlanId: plan.plan_id },
                { run }
            );
            assert.equal(result.recovered, false);
            plans.push(result.plan);
            shellOptions.push({ ...shell, expectedPlanId: plan.plan_id });
        }
        for (const shell of shellOptions) {
            assert.equal(
                (await publishExternalApplicationShell(shell, { run }))
                    .recovered,
                true
            );
        }
        await session.save();
        const instrumentation = await instrumentProduct(
            session,
            product,
            input.browserFixture
        );
        // Exactly the same relative source exists in the workshop. It cannot
        // rescue a missing product input while the workshop is inaccessible.
        await displacedEntry(
            session,
            product,
            sharedPath,
            () =>
                confinedNode(session, product, [
                    `${CMZ.support}/check-workspace.mjs`,
                ]),
            /Échec du contrat workspace/
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
        for (const plan of plans)
            await verifyGeneratedTree(plan.outputAbsolute, plan.files);
        assert.deepEqual(
            await snapshotTree(TOOLS_ROOT),
            sourceBefore,
            'L’atelier a changé pendant la preuve'
        );
        session.lines.push(
            'PASS real-native-shells-and-mutants',
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
