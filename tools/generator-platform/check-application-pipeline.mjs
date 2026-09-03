#!/usr/bin/env node
import { createHash } from 'node:crypto';
import {
    access,
    mkdir,
    readFile,
    readdir,
    rm,
    writeFile,
} from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { planApplicationDesignPublication } from './core/application-design-publication.mjs';
import {
    planApplicationShell,
    publishApplicationShell,
} from './core/application-shell-publication.mjs';
import {
    planPageRealization,
    publishPageRealizationWorkOrder,
    verifyPageRealization,
} from './core/page-realization.mjs';
import { planStructuredBackendPublication } from './core/structured-backend-publication.mjs';

const workspaceRoot = fileURLToPath(new URL('../..', import.meta.url));
const exampleRoot = resolve(
    workspaceRoot,
    'examples/application-conception-proof'
);
const designPath =
    'designs/application-conception-proof.application-design.json';
const appName = 'application-conception-proof';
const experienceId = 'visitor-web';
const pageId = 'page_a11ca71000000001';
const appRoot = resolve(workspaceRoot, `apps/${appName}`);
const outputRoot = resolve(workspaceRoot, `dist/apps/${appName}`);
const workOrderRoot = resolve(
    workspaceRoot,
    `.cmz/page-realization-work-orders/${appName}`
);
const realizationRoot = resolve(exampleRoot, 'page-realization');
const realizationFiles = [
    'page.component.html',
    'page.component.scss',
    'page.component.spec.ts',
    'page.component.ts',
    'realization-evidence.json',
];

function sha256(content) {
    return createHash('sha256').update(content).digest('hex');
}

async function exists(path) {
    try {
        await access(path);
        return true;
    } catch (error) {
        if (error.code === 'ENOENT') return false;
        throw error;
    }
}

async function schema(name) {
    return JSON.parse(
        await readFile(new URL(`./schemas/${name}`, import.meta.url), 'utf8')
    );
}

async function assertCanonicalOutput(plan, label) {
    const published = await readFile(resolve(workspaceRoot, plan.output));
    if (!published.equals(plan.content)) {
        throw new Error(
            `${label}: la sortie versionnée ne correspond pas à la compilation canonique (attendu ${plan.output_sha256}, obtenu ${sha256(published)})`
        );
    }
}

async function assertRealizationFixture() {
    const entries = await readdir(realizationRoot, { withFileTypes: true });
    const actual = entries.map((entry) => entry.name).sort();
    if (
        entries.some((entry) => !entry.isFile()) ||
        JSON.stringify(actual) !== JSON.stringify(realizationFiles)
    ) {
        throw new Error(
            `page realization fixture must contain exactly: ${realizationFiles.join(', ')}`
        );
    }
}

async function installRealization(pageRoot) {
    await assertRealizationFixture();
    await rm(pageRoot, { recursive: true, force: true });
    await mkdir(pageRoot, { recursive: true });
    for (const file of realizationFiles) {
        await writeFile(
            resolve(pageRoot, file),
            await readFile(resolve(realizationRoot, file)),
            { flag: 'wx' }
        );
    }
}

async function main() {
    if (
        (await exists(appRoot)) ||
        (await exists(outputRoot)) ||
        (await exists(workOrderRoot))
    ) {
        throw new Error(
            'application pipeline: proof paths already exist; refusing to overwrite'
        );
    }

    const [backendContractSchema, applicationDesignSchema, evidenceSchema] =
        await Promise.all([
            schema('backend-contract.schema.json'),
            schema('application-design.schema.json'),
            schema('page-realization-evidence.schema.json'),
        ]);
    let shellPlan;
    try {
        const backendPlans = [];
        for (const proof of [
            {
                label: 'Postman reference contract',
                adapter: 'postman',
                definitionPath:
                    'examples/application-conception-proof/reference-api.postman.json',
                outputPath:
                    'examples/application-conception-proof/reference-api.backend-contract.json',
            },
            {
                label: 'planned target contract',
                adapter: 'structured',
                definitionPath:
                    'examples/application-conception-proof/target-api.definition.json',
                outputPath:
                    'examples/application-conception-proof/target-api.backend-contract.json',
            },
        ]) {
            const plan = await planStructuredBackendPublication({
                workspaceRoot,
                definitionPath: proof.definitionPath,
                outputPath: proof.outputPath,
                adapter: proof.adapter,
                backendContractSchema,
            });
            await assertCanonicalOutput(plan, proof.label);
            backendPlans.push(plan);
        }
        if (
            backendPlans[0].contract.contract.status !== 'reference' ||
            backendPlans[1].contract.contract.status !== 'planned'
        ) {
            throw new Error(
                'proof contracts must remain reference and planned respectively'
            );
        }

        const designPlan = await planApplicationDesignPublication({
            workspaceRoot,
            sourcePath:
                'examples/application-conception-proof/application-design.source.json',
            outputPath: designPath,
            applicationDesignSchema,
            backendContractSchema,
        });
        await assertCanonicalOutput(designPlan, 'application design');
        const contractRoles = Object.fromEntries(
            designPlan.design.backend_contracts.map((contract) => [
                contract.id,
                contract.role,
            ])
        );
        const boundContracts = new Set(
            designPlan.design.pages.flatMap((page) => [
                ...page.actions
                    .filter((action) => action.kind === 'backend')
                    .map((action) => action.operation_ref.contract_id),
                ...page.loads.map((load) => load.operation_ref.contract_id),
            ])
        );
        if (
            contractRoles['reference-note-api'] !== 'reference' ||
            contractRoles['planned-note-api'] !== 'target' ||
            boundContracts.has('reference-note-api') ||
            !boundContracts.has('planned-note-api')
        ) {
            throw new Error(
                'application design must retain the analogue as reference and bind only the planned target'
            );
        }

        const shellOptions = {
            workspaceRoot,
            designPath,
            experienceId,
            appName,
            profile: 'angular-pwa',
            applicationDesignSchema,
            backendContractSchema,
        };
        shellPlan = await planApplicationShell(shellOptions);
        await publishApplicationShell({
            ...shellOptions,
            planId: shellPlan.plan_id,
        });

        const pageOptions = { workspaceRoot, appName, pageId };
        const pagePlan = planPageRealization(pageOptions);
        await publishPageRealizationWorkOrder({
            ...pageOptions,
            workOrderId: pagePlan.work_order_id,
        });
        await installRealization(pagePlan.paths.writeRoot);

        const report = verifyPageRealization({
            ...pageOptions,
            workOrderId: pagePlan.work_order_id,
            evidenceSchema,
        });
        if (!report.ok)
            throw new Error(
                `page realization rejected:\n${report.violations.join('\n')}`
            );
        const expectedOracles = ['compile', 'build', 'lint', 'test'];
        if (
            JSON.stringify(report.oracle_results) !==
            JSON.stringify(expectedOracles.map((name) => ({ name, ok: true })))
        ) {
            throw new Error('page realization did not run every real oracle');
        }

        console.log(
            '✅  Preuve versionnée complète : Postman reference → planned target → application design → Angular/PWA shell → bounded page → ngc/build/lint/test.'
        );
    } finally {
        await rm(appRoot, { recursive: true, force: true });
        if (shellPlan)
            await rm(shellPlan.candidate, { recursive: true, force: true });
        await rm(outputRoot, { recursive: true, force: true });
        await rm(workOrderRoot, { recursive: true, force: true });
    }
}

main().catch((error) => {
    console.error(`❌  ${error.message}`);
    process.exitCode = 1;
});
