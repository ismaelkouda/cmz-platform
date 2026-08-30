import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';

const TRACKED = [
    'STATUS.md',
    'README.md',
    'LLM_CONTEXT.md',
    'docs/architecture/etat-du-socle.md',
    'docs/adr/README.md',
    'docs/README.md',
];

async function write(path, content) {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content);
}

test('la fraîcheur compare avant/après et non le worktree à HEAD', async (t) => {
    const root = await mkdtemp(join(tmpdir(), 'cmz-docs-freshness-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    await mkdir(join(root, 'tools'), { recursive: true });
    await write(
        join(root, 'tools/check-docs-freshness.mjs'),
        await readFile(new URL('check-docs-freshness.mjs', import.meta.url))
    );
    for (const file of TRACKED)
        await write(
            join(root, file),
            file === 'STATUS.md'
                ? 'État du socle le 2026-08-30.\n'
                : `contenu déjà généré de ${file}\n`
        );

    await write(
        join(root, 'tools/generate-status.mjs'),
        '// Les octets sont déjà à jour, même sans commit.\n'
    );
    const current = spawnSync(
        process.execPath,
        [join(root, 'tools/check-docs-freshness.mjs')],
        { cwd: root, encoding: 'utf8' }
    );
    assert.equal(current.status, 0, current.stderr);

    await write(
        join(root, 'tools/generate-status.mjs'),
        "import { appendFileSync } from 'node:fs';\nappendFileSync(new URL('../README.md', import.meta.url), 'périmé\\n');\n"
    );
    const stale = spawnSync(
        process.execPath,
        [join(root, 'tools/check-docs-freshness.mjs')],
        { cwd: root, encoding: 'utf8' }
    );
    assert.equal(stale.status, 1);
    assert.match(stale.stderr, /modifiés par la régénération : README\.md/);
});
