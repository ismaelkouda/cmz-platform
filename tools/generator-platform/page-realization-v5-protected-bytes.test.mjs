// Régression F1 (revue croisée de 6b71f65a) : en v5, le workspace protégé
// doit être observé sur le disque. `git diff` répond « Git considère-t-il ce
// fichier comme modifié ? » ; cette réponse dépend de l'index, de la
// configuration locale et des filtres. Chaque test laisse sur le disque un
// fichier protégé dont les octets diffèrent de la base, dans un état où Git
// le déclare inchangé.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cp, mkdtemp, readFile, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
    planPageRealization,
    publishPageRealizationWorkOrder,
    verifyPageRealization,
} from './core/page-realization.mjs';
import {
    evidenceSchema,
    layoutBindingSchema,
    layoutExampleSetSchema,
    pageRealizationFixture,
    realizeAngularPage,
    writeLayoutBindingAndCommit,
} from './page-realization.fixture.mjs';

const PROTECTED = 'apps/clean-street/oracle-setup.ts';
const ORIGINAL = 'export const strict = true;\n';
const TAMPERED = 'export const strict = false;\n';
const REFUSED =
    /protected worktree differs from base_commit_sha: apps\/clean-street\/oracle-setup\.ts \(content\)/;

function git(root, ...args) {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

async function committedFixture(t, { gitattributes } = {}) {
    const data = await pageRealizationFixture('angular-pwa');
    t.after(() => rm(data.root, { recursive: true, force: true }));
    await writeFile(join(data.root, PROTECTED), ORIGINAL);
    if (gitattributes)
        await writeFile(join(data.root, '.gitattributes'), gitattributes);
    const layout = await writeLayoutBindingAndCommit(data);
    return {
        data,
        common: {
            workspaceRoot: data.root,
            appName: 'clean-street',
            pageId: data.pageId,
            layoutBindingPath: layout.bindingPath,
            layoutBindingSchema,
            layoutExampleSetSchema,
            authorityCommitSha: layout.baseCommitSha,
            baseCommitSha: layout.baseCommitSha,
        },
    };
}

async function realized(t, options) {
    const { data, common } = await committedFixture(t, options);
    const plan = planPageRealization(common);
    await publishPageRealizationWorkOrder({
        ...common,
        workOrderId: plan.work_order_id,
    });
    await realizeAngularPage(data, plan.pageContractHash);
    return { data, workOrderId: plan.work_order_id };
}

// `oracleCalls` appartient à l'appelant : il reste observable quand la
// vérification lève, ce qui permet de prouver qu'aucun oracle n'a été lancé.
function verify({ data, workOrderId }, oracleCalls) {
    return verifyPageRealization(
        {
            workspaceRoot: data.root,
            appName: 'clean-street',
            pageId: data.pageId,
            workOrderId,
            evidenceSchema,
            layoutBindingSchema,
            layoutExampleSetSchema,
        },
        { run: (command) => oracleCalls.push(command) }
    );
}

function assertRefusedBeforeOracles(context) {
    const oracleCalls = [];
    assert.throws(() => verify(context, oracleCalls), REFUSED);
    assert.deepEqual(
        oracleCalls,
        [],
        'no oracle may run on a refused workspace'
    );
}

// Altère le fichier protégé, l'indexe, puis remet dans l'index l'OID de la
// base en conservant les métadonnées stat du fichier altéré. Aucun drapeau,
// aucune configuration : `git diff` ne voit rien.
async function tamperBehindIndexStatCache(root) {
    const file = join(root, PROTECTED);
    const originalOid = git(root, 'rev-parse', `HEAD:${PROTECTED}`);
    await writeFile(file, TAMPERED);
    const past = new Date(Date.now() - 60_000);
    await utimes(file, past, past);
    git(root, 'add', PROTECTED);
    const tamperedOid = git(root, 'rev-parse', `:${PROTECTED}`);
    const indexPath = join(root, '.git/index');
    const index = await readFile(indexPath);
    const body = index.subarray(0, index.length - 20);
    const at = body.indexOf(Buffer.from(tamperedOid, 'hex'));
    assert.notEqual(at, -1, 'the staged blob must be present in the index');
    Buffer.from(originalOid, 'hex').copy(body, at);
    await writeFile(
        indexPath,
        Buffer.concat([body, createHash('sha1').update(body).digest()])
    );
    assert.equal(
        git(root, 'diff', '--name-only', 'HEAD', '--', PROTECTED),
        '',
        'git diff must report the tampered file as unchanged'
    );
}

const MASKED_STATES = {
    'cache stat de l’index réécrit': async ({ data }) => {
        await tamperBehindIndexStatCache(data.root);
    },
    'core.worktree local redirigé vers une copie propre': async (
        { data },
        t
    ) => {
        const clean = await mkdtemp(join(tmpdir(), 'page-realization-clean-'));
        t.after(() => rm(clean, { recursive: true, force: true }));
        const gitDirectory = join(data.root, '.git');
        await cp(data.root, clean, {
            recursive: true,
            filter: (source) =>
                source !== gitDirectory &&
                !source.startsWith(`${gitDirectory}/`),
        });
        git(data.root, '--work-tree', clean, 'status', '--short');
        git(data.root, 'config', 'core.worktree', clean);
        await writeFile(join(data.root, PROTECTED), TAMPERED);
    },
    'filtre clean local': async ({ data }) => {
        const originalOid = git(data.root, 'rev-parse', `HEAD:${PROTECTED}`);
        await writeFile(
            join(data.root, '.git/info/attributes'),
            `${PROTECTED} filter=mask\n`
        );
        git(
            data.root,
            'config',
            'filter.mask.clean',
            `git cat-file blob ${originalOid}`
        );
        await writeFile(join(data.root, PROTECTED), TAMPERED);
    },
};

test(
    'accepte un workspace protégé dont les octets sont ceux de la base',
    { timeout: 15_000 },
    async (t) => {
        const oracleCalls = [];
        const report = verify(await realized(t), oracleCalls);
        assert.equal(report.ok, true, report.violations.join('\n'));
        assert.equal(oracleCalls.length, 4);
    }
);

for (const [name, mask] of Object.entries(MASKED_STATES)) {
    test(
        `refuse avant les oracles un fichier protégé altéré : ${name}`,
        { timeout: 15_000 },
        async (t) => {
            const context = await realized(t);
            await mask(context, t);
            assert.equal(
                await readFile(join(context.data.root, PROTECTED), 'utf8'),
                TAMPERED
            );
            assertRefusedBeforeOracles(context);
        }
    );
}

test(
    'refuse avant les oracles des fins de ligne converties sous un attribut text versionné',
    { timeout: 15_000 },
    async (t) => {
        const context = await realized(t, {
            gitattributes: '* text=auto eol=lf\n',
        });
        await writeFile(
            join(context.data.root, PROTECTED),
            ORIGINAL.replace('\n', '\r\n')
        );
        assert.equal(
            git(
                context.data.root,
                'diff',
                '--name-only',
                'HEAD',
                '--',
                PROTECTED
            ),
            '',
            'git diff must report the converted file as unchanged'
        );
        assertRefusedBeforeOracles(context);
    }
);

test(
    'refuse de préparer un work order sur un workspace protégé déjà altéré',
    { timeout: 15_000 },
    async (t) => {
        const { data, common } = await committedFixture(t);
        await tamperBehindIndexStatCache(data.root);
        assert.throws(() => planPageRealization(common), REFUSED);
    }
);
