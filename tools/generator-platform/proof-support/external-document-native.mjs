import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';

import { isWithin } from '../core/external-application-paths.mjs';
import {
    hash,
    TOOLS_ROOT,
} from '../test-support/external-application-fixture.mjs';
import {
    NATIVE_CELLS,
    proveNativeDocumentCell,
    writeDocumentInputs,
} from '../test-support/external-document-fixture.mjs';
import { confinedNode, record } from './external-application-runtime.mjs';

const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
export const SHARED_DOCUMENT_SOURCE =
    'examples/application-conception-proof/project-brief.md';

// Preserve the existing same-relative-path counterexample with A's exact brief.
// B keeps its original independent inputs and supplies the authenticated route.
export async function nativeDocumentFixture(root, kind) {
    const fixture = await writeDocumentInputs(root, kind, { shell: true });
    if (kind === 'A') {
        const source = fixture.design.sources.find((item) =>
            item.snapshot_uri.endsWith('/project-brief.md')
        );
        assert.ok(source);
        const bytes = await readFile(join(TOOLS_ROOT, SHARED_DOCUMENT_SOURCE));
        assert.equal(hash(bytes), source.sha256);
        await mkdir(dirname(join(root, SHARED_DOCUMENT_SOURCE)), {
            recursive: true,
        });
        await writeFile(join(root, SHARED_DOCUMENT_SOURCE), bytes, {
            flag: 'wx',
        });
        fixture.variant.changes.push({
            path: `sources[${fixture.design.sources.indexOf(source)}].snapshot_uri`,
            before: source.snapshot_uri,
            after: SHARED_DOCUMENT_SOURCE,
            reason: 'same bytes at the same relative path as the workshop; T11 closure counterexample',
        });
        source.snapshot_uri = SHARED_DOCUMENT_SOURCE;
        const sourceBytes = json(fixture.design);
        await writeFile(join(root, fixture.sourcePath), sourceBytes);
        fixture.variant.compiled_source_sha256 = hash(sourceBytes);
    }
    return fixture;
}

export function nativeCellEnvironment(node, root, cell, contextPath) {
    assert.ok(NATIVE_CELLS.includes(cell));
    for (const path of [node, root, contextPath])
        assert.equal(resolve(path), path);
    return {
        PATH: `${dirname(node)}:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin`,
        LANG: 'C',
        NO_COLOR: '1',
        CI: '1',
        NX_DAEMON: 'false',
        NX_NO_CLOUD: 'true',
        CMZ_EXT03A_NATIVE_CELL: cell,
        CMZ_EXT03A_NATIVE_ROOT: root,
        CMZ_EXT03A_NATIVE_CONTEXT: contextPath,
    };
}

export function nativeCellContext(context, root, cell, contextPath) {
    assert.ok(NATIVE_CELLS.includes(cell));
    assert.equal(context.schema_version, 1);
    assert.equal(context.cell, cell);
    assert.equal(context.fixture.root, root);
    assert.equal(context.fixture.kind, cell.split('/')[0]);
    assert.ok(['macos', 'docker'].includes(context.session.backend));
    for (const path of [root, contextPath, context.session.root])
        assert.equal(resolve(path), path);
    assert.ok(isWithin(context.session.root, root));
    assert.ok(isWithin(context.session.root, contextPath));
    assert.equal(dirname(contextPath), context.session.root);
    assert.equal(context.session.hostNode, process.execPath);
    return {
        fixture: context.fixture,
        session: { ...context.session, lines: [] },
        receiptPath: `${contextPath}.receipt.json`,
    };
}

// The test runner stays in the trusted workshop; every compiler/Nx child is
// executed by the existing native sandbox with no workshop mount and no network.
export async function provePreparedDocumentCell(root, cell, contextPath) {
    const context = JSON.parse(await readFile(contextPath, 'utf8'));
    const { fixture, session, receiptPath } = nativeCellContext(
        context,
        root,
        cell,
        contextPath
    );
    const labels = [];
    const run = (command, args, cwd) => {
        assert.equal(command, process.execPath);
        assert.equal(cwd, root);
        const label =
            args[1] === 'run'
                ? args[2]
                : args[0].endsWith('check-workspace.mjs')
                  ? 'workspace-contract'
                  : 'native-compiler';
        record(
            session,
            `EXT03a/${cell}/${label}`,
            confinedNode(session, root, args)
        );
        labels.push(label);
    };
    const receipt = await proveNativeDocumentCell(root, cell, { fixture, run });
    const [kind, profile] = cell.split('/');
    const app = `ext03a-${kind.toLowerCase()}-${profile}`;
    assert.deepEqual(labels, [
        'native-compiler',
        `${app}:build:production`,
        `${app}:lint`,
        `${app}:test`,
        'workspace-contract',
    ]);
    receipt.native = {
        backend: session.backend,
        labels,
        report: session.lines,
    };
    await writeFile(receiptPath, json(receipt), { flag: 'wx' });
    return receipt;
}

export async function runNativeDocumentCell(session, fixture, profile) {
    const cell = `${fixture.kind}/${profile}`;
    assert.ok(NATIVE_CELLS.includes(cell));
    const contextPath = join(
        session.root,
        `cell-${fixture.kind}-${profile}.json`
    );
    const context = {
        schema_version: 1,
        cell,
        fixture,
        session: {
            root: session.root,
            backend: session.backend,
            policy: session.policy,
            hostNode: session.hostNode,
            cache: session.cache,
            home: session.home,
        },
    };
    await writeFile(contextPath, json(context), { flag: 'wx' });
    const start = performance.now();
    const child = spawnSync(
        session.hostNode,
        [
            '--test',
            '--test-concurrency=1',
            join(
                TOOLS_ROOT,
                'tools/generator-platform/external-document-compilation.test.mjs'
            ),
        ],
        {
            cwd: TOOLS_ROOT,
            env: nativeCellEnvironment(
                session.hostNode,
                fixture.root,
                cell,
                contextPath
            ),
            // Per-command limits remain in runDocumentCli/runConfined. The CI job
            // supplies the 45-minute aggregate bound; do not kill a coordinator
            // mid-command with a second watchdog that cannot reap its children.
            encoding: 'utf8',
            maxBuffer: 8 * 1024 * 1024,
        }
    );
    record(session, `EXT03a/${cell}/native-cell`, child);
    const receiptBytes = await readFile(`${contextPath}.receipt.json`);
    const receipt = JSON.parse(receiptBytes.toString('utf8'));
    assert.equal(receipt.cell, cell);
    assert.equal(receipt.native.backend, session.backend);
    assert.equal(receipt.native.labels.length, 5);
    session.lines.push(
        ...receipt.native.report,
        `EXT03a/${cell} receipt_sha256=${hash(receiptBytes)} elapsed_ms=${Math.round(performance.now() - start)}`,
        `EXT03a/${cell} variant=${JSON.stringify(receipt.variant)}; no PWA claim`,
        `EXT03a/${cell} routes=${JSON.stringify(receipt.shell.routes)}`
    );
    await session.save();
    return receipt;
}
