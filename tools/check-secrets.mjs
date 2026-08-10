#!/usr/bin/env node
/**
 * T4-5 — scan de secrets (gitleaks).
 *
 * Reproduit localement ce que la CI exécute (ADR-0006) : un `--no-verify`
 * local ne passe pas la forge.
 *
 * Binaire piné, mis en cache sous `tools/.cache/gitleaks/` (gitignoré).
 *
 * Usage :
 *   bun run check:secrets              # historique + tree (mode CI)
 *   bun run check:secrets -- --no-git  # tree fichiers uniquement
 *   bun run check:secrets -- --protect # index / staged (option pre-commit)
 *   bun run check:secrets -- --pre-push # commits origin/main..HEAD
 *
 * Env :
 *   GITLEAKS_VERSION  override du pin (défaut ci-dessous)
 *   GITLEAKS_BIN      chemin d'un binaire local (skip download)
 */

import {
    createWriteStream,
    existsSync,
    mkdirSync,
    chmodSync,
    mkdtempSync,
    rmSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';
import { pipeline } from 'node:stream/promises';
import { tmpdir } from 'node:os';
import { get } from 'node:https';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const VERSION = process.env.GITLEAKS_VERSION ?? '8.24.3';
const CONFIG = join(ROOT, '.gitleaks.toml');
const CACHE_DIR = join(ROOT, 'tools', '.cache', 'gitleaks', VERSION);

function platformAsset() {
    const p = process.platform;
    const a = process.arch;
    const table = {
        'darwin-arm64': `gitleaks_${VERSION}_darwin_arm64.tar.gz`,
        'darwin-x64': `gitleaks_${VERSION}_darwin_x64.tar.gz`,
        'linux-arm64': `gitleaks_${VERSION}_linux_arm64.tar.gz`,
        'linux-x64': `gitleaks_${VERSION}_linux_x64.tar.gz`,
    };
    const key = `${p}-${a === 'x86_64' ? 'x64' : a}`;
    const asset = table[key];
    if (!asset) {
        console.error(
            `[check:secrets] plateforme non supportée: ${p}/${a}. ` +
                `Installez gitleaks v${VERSION} et exportez GITLEAKS_BIN.`
        );
        process.exit(2);
    }
    return asset;
}

function httpsGet(url) {
    return new Promise((resolve, reject) => {
        get(url, (res) => {
            if (
                res.statusCode &&
                res.statusCode >= 300 &&
                res.statusCode < 400 &&
                res.headers.location
            ) {
                httpsGet(res.headers.location).then(resolve, reject);
                return;
            }
            if (res.statusCode !== 200) {
                reject(new Error(`HTTP ${res.statusCode} pour ${url}`));
                return;
            }
            resolve(res);
        }).on('error', reject);
    });
}

async function downloadBinary() {
    if (process.env.GITLEAKS_BIN) {
        if (!existsSync(process.env.GITLEAKS_BIN)) {
            console.error(
                `[check:secrets] GITLEAKS_BIN introuvable: ${process.env.GITLEAKS_BIN}`
            );
            process.exit(2);
        }
        return process.env.GITLEAKS_BIN;
    }

    const binName = process.platform === 'win32' ? 'gitleaks.exe' : 'gitleaks';
    const binPath = join(CACHE_DIR, binName);
    if (existsSync(binPath)) {
        return binPath;
    }

    const asset = platformAsset();
    const url = `https://github.com/gitleaks/gitleaks/releases/download/v${VERSION}/${asset}`;
    console.error(`[check:secrets] téléchargement gitleaks v${VERSION}…`);
    console.error(`  ${url}`);

    mkdirSync(CACHE_DIR, { recursive: true });
    const tmp = mkdtempSync(join(tmpdir(), 'gitleaks-'));
    try {
        const res = await httpsGet(url);
        const archivePath = join(tmp, asset);
        await pipeline(res, createWriteStream(archivePath));

        execFileSync('tar', ['-xzf', archivePath, '-C', CACHE_DIR, binName], {
            stdio: 'inherit',
        });
        if (!existsSync(binPath)) {
            execFileSync('tar', ['-xzf', archivePath, '-C', CACHE_DIR], {
                stdio: 'inherit',
            });
        }
        if (!existsSync(binPath)) {
            throw new Error(
                `binaire ${binName} absent après extract de ${asset}`
            );
        }
        chmodSync(binPath, 0o755);
        return binPath;
    } finally {
        rmSync(tmp, { recursive: true, force: true });
    }
}

function parseArgs(argv) {
    const flags = new Set(argv);
    return {
        noGit: flags.has('--no-git'),
        protect: flags.has('--protect'),
        prePush: flags.has('--pre-push'),
        verbose: flags.has('--verbose') || flags.has('-v'),
    };
}

function ensureConfig() {
    if (!existsSync(CONFIG)) {
        console.error(`[check:secrets] config absente: ${CONFIG}`);
        process.exit(2);
    }
}

function run(bin, args, verbose) {
    if (verbose) {
        console.error(`[check:secrets] ${bin} ${args.join(' ')}`);
    }
    const r = spawnSync(bin, args, {
        cwd: ROOT,
        stdio: 'inherit',
        env: process.env,
    });
    if (r.error) {
        console.error(`[check:secrets] échec spawn: ${r.error.message}`);
        process.exit(2);
    }
    process.exit(r.status ?? 1);
}

async function main() {
    ensureConfig();
    const opts = parseArgs(process.argv.slice(2));
    const bin = await downloadBinary();
    const common = ['--config', CONFIG, '--redact', '--exit-code', '1'];

    if (opts.protect) {
        run(
            bin,
            ['protect', '--source', ROOT, '--staged', ...common],
            opts.verbose
        );
        return;
    }

    if (opts.prePush) {
        let logOpts = 'origin/main..HEAD';
        const probe = spawnSync(
            'git',
            ['rev-parse', '--verify', 'origin/main'],
            { cwd: ROOT, stdio: 'pipe' }
        );
        if (probe.status !== 0) {
            logOpts = 'HEAD~50..HEAD';
            console.error(
                `[check:secrets] origin/main absent — scan ${logOpts}`
            );
        }
        run(
            bin,
            [
                'detect',
                '--source',
                ROOT,
                '--log-opts',
                logOpts,
                ...common,
            ],
            opts.verbose
        );
        return;
    }

    const args = ['detect', '--source', ROOT, ...common];
    if (opts.noGit) {
        args.push('--no-git');
    }
    run(bin, args, opts.verbose);
}

main().catch((err) => {
    console.error(`[check:secrets] ${err?.stack ?? err}`);
    process.exit(2);
});
