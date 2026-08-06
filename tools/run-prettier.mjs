#!/usr/bin/env node
/**
 * Périmètre Prettier produit (B5) — source unique pour format / format:check.
 * Lint-staged doit lister le même sous-ensemble (chemins + extensions).
 *
 * Inclus : apps, libs, tools, deploy + configs monorepo listées.
 * Exclu : docs/**, patterns SEOS vendored, artefacts E-5, *.in — via .prettierignore.
 *
 * Usage :
 *   node tools/run-prettier.mjs --write
 *   node tools/run-prettier.mjs --check
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Chemins passés à Prettier (répertoires ou fichiers racine). */
export const PRETTIER_PATHS = [
    'apps',
    'libs',
    'tools',
    'deploy',
    'package.json',
    'nx.json',
    'tsconfig.base.json',
    'eslint.config.mjs',
    'commitlint.config.mjs',
    'knip.json',
    '.prettierrc.json',
    '.lintstagedrc.json',
];

const mode = process.argv[2];
if (mode !== '--write' && mode !== '--check') {
    console.error('Usage: node tools/run-prettier.mjs --write|--check');
    process.exit(2);
}

const require = createRequire(import.meta.url);
const prettierBin = require.resolve('prettier/bin/prettier.cjs');

const result = spawnSync(
    process.execPath,
    [prettierBin, mode, ...PRETTIER_PATHS],
    { cwd: ROOT, stdio: 'inherit' }
);

process.exit(result.status ?? 1);
