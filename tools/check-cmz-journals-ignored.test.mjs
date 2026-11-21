// check:cmz-journals-ignored : un fichier sous `.cmz/` n'est pas un
// répertoire de journal (CI de la PR #389 : `.cmz/escape.txt` lu comme
// `.cmz/escape/`) ; un vrai répertoire reste détecté ; un scan vide échoue.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
    cmzDirectoryNames,
    verifyCmzJournalsIgnored,
} from './check-cmz-journals-ignored.mjs';

test('un fichier sous .cmz/ n’est pas pris pour un répertoire', () => {
    assert.deepEqual(
        cmzDirectoryNames("writeFileSync('.cmz/escape.txt', 'x')"),
        []
    );
    assert.deepEqual(cmzDirectoryNames('`.cmz/escape.tar.gz`'), []);
    assert.deepEqual(cmzDirectoryNames("'.cmz/escape_x'"), []);
    assert.deepEqual(cmzDirectoryNames("'.cmz/escapeX'"), []);
});

test('un vrai répertoire sous .cmz/ reste détecté', () => {
    assert.deepEqual(cmzDirectoryNames("'.cmz/escape'"), ['escape']);
    assert.deepEqual(cmzDirectoryNames('`.cmz/escape/${id}.json`'), ['escape']);
    assert.deepEqual(cmzDirectoryNames("join(root, '.cmz/a-b', x); '.cmz/c'"), [
        'a-b',
        'c',
    ]);
});

async function repository(t, files) {
    const root = await mkdtemp(join(tmpdir(), 'cmz-journals-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    execFileSync('git', ['init', '-q', root]);
    for (const [path, content] of Object.entries(files)) {
        await mkdir(join(root, path, '..'), { recursive: true });
        await writeFile(join(root, path), content);
    }
    return root;
}

test('journal non ignoré signalé, ignoré accepté, scan vide signalé', async (t) => {
    const tool = { 'tools/x.mjs': "export const p = '.cmz/journal-x/';\n" };
    const bare = await repository(t, tool);
    assert.deepEqual(verifyCmzJournalsIgnored(bare).errors, [
        ".cmz/journal-x/ n'est pas ignoré par Git : ce journal salirait le dépôt et ferait échouer la publication",
    ]);
    const ignored = await repository(t, {
        ...tool,
        '.gitignore': '/.cmz/journal-x/\n',
    });
    assert.deepEqual(verifyCmzJournalsIgnored(ignored), {
        ok: true,
        names: ['journal-x'],
        errors: [],
    });
    const fileOnly = await repository(t, {
        'tools/x.mjs': "export const p = '.cmz/escape.txt';\n",
    });
    assert.deepEqual(verifyCmzJournalsIgnored(fileOnly).errors, [
        'aucun journal .cmz détecté — scan cassé',
    ]);
});
