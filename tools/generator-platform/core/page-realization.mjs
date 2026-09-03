import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { lstatSync, readFileSync, readlinkSync, readdirSync } from 'node:fs';
import { lstat, mkdir, open, rename } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';

import { validateJsonSchema } from '../validate-ir.mjs';
import {
    loadArchetypeSystem,
    selectArchetype,
} from './archetype-selection.mjs';
import { producePageRoleNode } from './role-production.mjs';

const STATE_ROOT = '.cmz/page-realization-work-orders';
const ALLOWED_FILES = [
    'page.component.html',
    'page.component.scss',
    'page.component.spec.ts',
    'page.component.ts',
    'realization-evidence.json',
];
const FORBIDDEN_NETWORK = [
    /\bHttpClient\b/,
    /\bXMLHttpRequest\b/,
    /\bfetch\s*\(/,
    /\baxios\b/,
    /https?:\/\//,
];

function fail(message) {
    throw new Error(`page realization: ${message}`);
}

function sha256(content) {
    return createHash('sha256').update(content).digest('hex');
}

function appPaths(root, appName, pageId) {
    const app = resolve(root, `apps/${appName}`);
    return {
        app,
        manifest: resolve(app, '.cmz/app-manifest.json'),
        pageContract: resolve(app, `.cmz/pages/${pageId}.json`),
        writeRoot: resolve(app, `src/app/pages/${pageId}`),
    };
}

function statePaths(root, appName, pageId, workOrderId) {
    const directory = resolve(root, STATE_ROOT, appName, pageId, workOrderId);
    return {
        directory,
        workOrder: resolve(directory, 'work-order.json'),
        baseline: resolve(directory, 'baseline.json'),
    };
}

function readJsonFile(path, label) {
    const metadata = lstatSync(path);
    if (!metadata.isFile() || metadata.isSymbolicLink())
        fail(`${label} must be a regular file`);
    try {
        return JSON.parse(readFileSync(path, 'utf8'));
    } catch (error) {
        fail(`${label} is invalid JSON (${error.message})`);
    }
}

function gitInventory(root, excludedPrefix) {
    let output;
    let deleted;
    try {
        output = execFileSync(
            'git',
            ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
            { cwd: root, encoding: 'utf8' }
        );
        deleted = new Set(
            execFileSync('git', ['ls-files', '-z', '--deleted'], {
                cwd: root,
                encoding: 'utf8',
            })
                .split('\0')
                .filter(Boolean)
        );
    } catch {
        fail('Git inventory is required to bound LLM writes');
    }
    return output
        .split('\0')
        .filter(
            (path) =>
                path &&
                !deleted.has(path) &&
                path !== excludedPrefix &&
                !path.startsWith(`${excludedPrefix}/`)
        )
        .sort()
        .map((path) => {
            const absolute = resolve(root, path);
            const metadata = lstatSync(absolute);
            let content;
            let kind;
            if (metadata.isSymbolicLink()) {
                // Le texte de la cible est l'identité Git du lien. Le lire via
                // readlink ne suit jamais la cible, y compris hors workspace.
                content = readlinkSync(absolute, { encoding: 'buffer' });
                kind = 'symlink';
            } else if (metadata.isFile()) {
                content = readFileSync(absolute);
                kind = 'file';
            } else {
                fail(`Git-visible entry has unsupported type: ${path}`);
            }
            return {
                path,
                kind,
                mode: metadata.mode & 0o777,
                bytes: content.byteLength,
                sha256: sha256(content),
            };
        });
}

function baselineHash(entries) {
    return sha256(
        entries
            .map(
                (entry) =>
                    `${entry.path}\0${entry.kind}\0${entry.mode}\0${entry.bytes}\0${entry.sha256}`
            )
            .join('\0')
    );
}

function expectedMappings(page) {
    return {
        states: page.states.map((entry) => entry.id).sort(),
        controls: page.controls.map((entry) => entry.id).sort(),
        actions: page.actions.map((entry) => entry.id).sort(),
        data_bindings: page.data_bindings.map((entry) => entry.id).sort(),
        regions: page.regions.map((entry) => entry.id).sort(),
        elements: page.regions
            .flatMap((region) => region.elements.map((entry) => entry.id))
            .sort(),
    };
}

function publicWorkOrder({
    workOrderId,
    appName,
    pageId,
    pageContractPath,
    pageContractHash,
    writeRoot,
    baselineSha256,
    realizationContract,
}) {
    return {
        schema_version: '1.0.0',
        kind: 'page-realization-work-order',
        work_order_id: workOrderId,
        app_name: appName,
        page_id: pageId,
        page_contract: {
            path: pageContractPath,
            sha256: pageContractHash,
        },
        allowed_write_root: writeRoot,
        allowed_files: ALLOWED_FILES,
        protected_workspace_sha256: baselineSha256,
        realization_contract: realizationContract,
        rules: [
            'Implement only the validated page contract.',
            'Do not call HTTP, fetch, Axios or XMLHttpRequest from presentation code.',
            'Map every contract id to one exact data-cmz-id selector.',
            'Keep keyboard, screen-reader, loading, error and offline behavior explicit.',
            'Do not write outside allowed_write_root.',
        ],
        oracle_commands: [
            `bunx ngc -p apps/${appName}/tsconfig.app.json --noEmit`,
            `bunx nx run ${appName}:build:production --skipNxCache`,
            `bunx nx run ${appName}:lint`,
            `bunx nx run ${appName}:test`,
        ],
    };
}

function resolveRealizationContract(root, pageContract, pageContractHash) {
    const roleNodeSchema = readJsonFile(
        resolve(root, 'tools/generator-platform/schemas/role-node.schema.json'),
        'role node schema'
    );
    const roleNode = producePageRoleNode(
        pageContract,
        pageContractHash,
        roleNodeSchema
    );
    const selection = selectArchetype(
        loadArchetypeSystem(root, 'angular'),
        roleNode
    );
    return { role_node: roleNode, selection };
}

async function writeAtomic(path, document) {
    await mkdir(dirname(path), { recursive: true, mode: 0o700 });
    const temporary = resolve(
        dirname(path),
        `.tmp-${process.pid}-${randomUUID()}`
    );
    const handle = await open(temporary, 'wx', 0o600);
    try {
        await handle.writeFile(`${JSON.stringify(document, null, 2)}\n`);
        await handle.sync();
    } finally {
        await handle.close();
    }
    await rename(temporary, path);
    const directory = await open(dirname(path), 'r');
    try {
        await directory.sync();
    } finally {
        await directory.close();
    }
}

export function planPageRealization({ workspaceRoot, appName, pageId }) {
    if (!/^[a-z][a-z0-9-]*$/.test(appName ?? ''))
        fail('app name must be kebab-case');
    if (!/^page_[a-f0-9]{16}$/.test(pageId ?? ''))
        fail('invalid stable page id');
    const root = resolve(workspaceRoot);
    const paths = appPaths(root, appName, pageId);
    const manifest = readJsonFile(paths.manifest, 'app manifest');
    const pageContract = readJsonFile(paths.pageContract, 'page contract');
    if (
        manifest.kind !== 'application-shell-manifest' ||
        manifest.app_name !== appName ||
        pageContract.kind !== 'page-realization-contract' ||
        pageContract.page?.id !== pageId
    ) {
        fail('app/page ownership identity mismatch');
    }
    const designAbsolute = resolve(root, manifest.design_ref.path);
    const designContent = readFileSync(designAbsolute);
    if (sha256(designContent) !== manifest.design_ref.sha256)
        fail('published design drifted since app creation');
    const pageContractContent = readFileSync(paths.pageContract);
    const pageContractHash = sha256(pageContractContent);
    const realizationContract = resolveRealizationContract(
        root,
        pageContract,
        pageContractHash
    );
    const relativeWriteRoot = relative(root, paths.writeRoot)
        .split(sep)
        .join('/');
    const baseline = gitInventory(root, relativeWriteRoot);
    const protectedHash = baselineHash(baseline);
    const pageContractPath = relative(root, paths.pageContract)
        .split(sep)
        .join('/');
    const workOrderId = sha256(
        JSON.stringify({
            app_name: appName,
            page_id: pageId,
            page_contract_sha256: pageContractHash,
            protected_workspace_sha256: protectedHash,
            allowed_files: ALLOWED_FILES,
            realization_contract: realizationContract,
        })
    );
    const state = statePaths(root, appName, pageId, workOrderId);
    const workOrder = publicWorkOrder({
        workOrderId,
        appName,
        pageId,
        pageContractPath,
        pageContractHash,
        writeRoot: relativeWriteRoot,
        baselineSha256: protectedHash,
        realizationContract,
    });
    return {
        work_order_id: workOrderId,
        work_order_path: relative(root, state.workOrder).split(sep).join('/'),
        baseline_sha256: protectedHash,
        workOrder,
        baseline,
        paths,
        state,
        pageContract,
        pageContractHash,
        root,
    };
}

export async function publishPageRealizationWorkOrder(options) {
    const plan = planPageRealization(options);
    if (options.workOrderId !== plan.work_order_id)
        fail('reviewed work order id is stale or invalid');
    let stateExists = false;
    try {
        const metadata = await lstat(plan.state.directory);
        if (!metadata.isDirectory() || metadata.isSymbolicLink())
            fail('work order state root must be a real directory');
        stateExists = true;
    } catch (error) {
        if (error.code !== 'ENOENT') throw error;
    }
    if (stateExists) {
        try {
            const existingWorkOrder = readJsonFile(
                plan.state.workOrder,
                'existing work order'
            );
            const existingBaseline = readJsonFile(
                plan.state.baseline,
                'existing baseline'
            );
            if (
                sha256(`${JSON.stringify(existingWorkOrder, null, 2)}\n`) !==
                    sha256(`${JSON.stringify(plan.workOrder, null, 2)}\n`) ||
                baselineHash(existingBaseline.entries) !== plan.baseline_sha256
            ) {
                fail('existing work order state drifted');
            }
            return { plan, already_published: true };
        } catch (error) {
            fail(
                `existing work order is incomplete or invalid (${error.message})`
            );
        }
    }
    await mkdir(plan.state.directory, { recursive: true, mode: 0o700 });
    await writeAtomic(plan.state.workOrder, plan.workOrder);
    await writeAtomic(plan.state.baseline, {
        schema_version: '1.0.0',
        work_order_id: plan.work_order_id,
        entries: plan.baseline,
    });
    return { plan, already_published: false };
}

function directoryFiles(root) {
    const files = [];
    for (const entry of readdirSync(root, { withFileTypes: true })) {
        if (entry.isSymbolicLink() || !entry.isFile())
            fail(`page output contains a non-regular entry: ${entry.name}`);
        files.push(entry.name);
    }
    return files.sort();
}

function validateEvidence(
    evidence,
    schema,
    pageContract,
    contractHash,
    markup
) {
    const violations = [...validateJsonSchema(evidence, schema)];
    if (evidence.page_id !== pageContract.page.id)
        violations.push('$.page_id: does not match page contract');
    if (evidence.page_contract_sha256 !== contractHash)
        violations.push('$.page_contract_sha256: stale page contract');
    const expected = expectedMappings(pageContract.page);
    for (const [category, ids] of Object.entries(expected)) {
        const mappings = evidence[category] ?? [];
        const actual = mappings.map((entry) => entry.id).sort();
        if (JSON.stringify(actual) !== JSON.stringify(ids))
            violations.push(
                `$.${category}: ids must match the page contract exactly`
            );
        const selectors = new Set();
        for (const mapping of mappings) {
            const expectedSelector = `[data-cmz-id="${mapping.id}"]`;
            if (mapping.selector !== expectedSelector)
                violations.push(
                    `$.${category}.${mapping.id}: selector must be ${expectedSelector}`
                );
            if (selectors.has(mapping.selector))
                violations.push(
                    `$.${category}: duplicate selector ${mapping.selector}`
                );
            selectors.add(mapping.selector);
            if (!markup.includes(`data-cmz-id="${mapping.id}"`))
                violations.push(
                    `$.${category}.${mapping.id}: selector absent from page markup`
                );
        }
    }
    return violations;
}

function defaultRun(command, args, root) {
    return execFileSync(command, args, {
        cwd: root,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
            ...process.env,
            CI: 'true',
            NX_DAEMON: 'false',
            NX_TASKS_RUNNER_DYNAMIC_OUTPUT: 'false',
            ...(!process.env.NX_CLOUD_ACCESS_TOKEN
                ? { NX_NO_CLOUD: 'true' }
                : {}),
        },
    });
}

export function verifyPageRealization(
    { workspaceRoot, appName, pageId, workOrderId, evidenceSchema },
    dependencies = {}
) {
    const root = resolve(workspaceRoot);
    const state = statePaths(root, appName, pageId, workOrderId);
    const workOrder = readJsonFile(state.workOrder, 'work order');
    const baseline = readJsonFile(state.baseline, 'work order baseline');
    if (
        workOrder.work_order_id !== workOrderId ||
        baseline.work_order_id !== workOrderId ||
        baselineHash(baseline.entries) !== workOrder.protected_workspace_sha256
    ) {
        fail('work order state integrity failure');
    }
    const paths = appPaths(root, appName, pageId);
    const pageContractContent = readFileSync(paths.pageContract);
    const pageContractHash = sha256(pageContractContent);
    const pageContract = JSON.parse(pageContractContent.toString('utf8'));
    const expectedRealizationContract = resolveRealizationContract(
        root,
        pageContract,
        pageContractHash
    );
    const currentBaseline = (dependencies.inventory ?? gitInventory)(
        root,
        workOrder.allowed_write_root
    );
    const violations = [];
    if (
        JSON.stringify(workOrder.realization_contract) !==
        JSON.stringify(expectedRealizationContract)
    ) {
        violations.push('role node or archetype selection drifted');
    }
    if (baselineHash(currentBaseline) !== workOrder.protected_workspace_sha256)
        violations.push('workspace changed outside the allowed page root');
    let actualFiles = [];
    try {
        actualFiles = directoryFiles(paths.writeRoot);
    } catch (error) {
        violations.push(error.message);
    }
    if (JSON.stringify(actualFiles) !== JSON.stringify(ALLOWED_FILES))
        violations.push(
            `page files must be exactly: ${ALLOWED_FILES.join(', ')}`
        );
    let source = '';
    for (const path of actualFiles.filter((entry) =>
        /\.(?:ts|html)$/.test(entry)
    ))
        source += readFileSync(resolve(paths.writeRoot, path), 'utf8');
    for (const pattern of FORBIDDEN_NETWORK) {
        if (pattern.test(source))
            violations.push(`direct network access forbidden by ${pattern}`);
    }
    for (const contract of pageContract.backend_contracts ?? []) {
        const backend = JSON.parse(
            readFileSync(resolve(root, contract.snapshot_uri), 'utf8')
        );
        for (const operation of backend.operations ?? []) {
            if (source.includes(operation.path))
                violations.push(
                    `endpoint literal forbidden in page code: ${operation.path}`
                );
        }
    }
    if (actualFiles.includes('realization-evidence.json')) {
        try {
            violations.push(
                ...validateEvidence(
                    readJsonFile(
                        resolve(paths.writeRoot, 'realization-evidence.json'),
                        'realization evidence'
                    ),
                    evidenceSchema,
                    pageContract,
                    pageContractHash,
                    source
                )
            );
        } catch (error) {
            violations.push(error.message);
        }
    }
    const oracleResults = [];
    if (violations.length === 0) {
        const run = dependencies.run ?? defaultRun;
        for (const [name, command, args] of [
            [
                'compile',
                'bunx',
                ['ngc', '-p', `apps/${appName}/tsconfig.app.json`, '--noEmit'],
            ],
            [
                'build',
                'bunx',
                ['nx', 'run', `${appName}:build:production`, '--skipNxCache'],
            ],
            ['lint', 'bunx', ['nx', 'run', `${appName}:lint`]],
            ['test', 'bunx', ['nx', 'run', `${appName}:test`]],
        ]) {
            try {
                run(command, args, root);
                oracleResults.push({ name, ok: true });
            } catch (error) {
                oracleResults.push({ name, ok: false });
                violations.push(
                    `${name} failed: ${[
                        error.stdout,
                        error.stderr,
                        error.message,
                    ]
                        .filter(Boolean)
                        .join('\n')}`
                );
            }
        }
    }
    return {
        ok: violations.length === 0,
        work_order_id: workOrderId,
        page_id: pageId,
        violations,
        oracle_results: oracleResults,
    };
}

export function publicPageRealizationPlan(plan) {
    return {
        work_order_id: plan.work_order_id,
        work_order_path: plan.work_order_path,
        app_name: plan.workOrder.app_name,
        page_id: plan.workOrder.page_id,
        page_contract: plan.workOrder.page_contract,
        realization_contract: plan.workOrder.realization_contract,
        allowed_write_root: plan.workOrder.allowed_write_root,
        allowed_files: plan.workOrder.allowed_files,
        protected_workspace_sha256: plan.workOrder.protected_workspace_sha256,
    };
}
