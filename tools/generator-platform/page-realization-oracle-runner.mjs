#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, lstatSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

function fail(message) {
    throw new Error(`page realization oracle: ${message}`);
}

function parseArgs(argv) {
    if (
        argv.length !== 6 ||
        argv[0] !== '--oracle' ||
        argv[2] !== '--app' ||
        argv[4] !== '--profile'
    ) {
        fail(
            'arguments attendus : --oracle <id> --app <nom> --profile <profil>'
        );
    }
    const oracle = argv[1];
    const app = argv[3];
    const profile = argv[5];
    if (!/^[a-z][a-z0-9-]*$/.test(app)) fail("nom d'application invalide");
    if (!['angular-pwa', 'react-spa'].includes(profile))
        fail("profil d'application invalide");
    return { oracle, app, profile };
}

function regularFile(path, label) {
    if (!existsSync(path)) fail(`${label} absent`);
    const metadata = lstatSync(path);
    if (!metadata.isFile() || metadata.isSymbolicLink()) {
        fail(`${label} doit être un fichier régulier`);
    }
    return path;
}

export function invocation(oracle, app, profile) {
    if (!['angular-pwa', 'react-spa'].includes(profile))
        fail("profil d'application invalide");
    if (oracle === 'compile') {
        const compiler =
            profile === 'angular-pwa'
                ? {
                      path: 'node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js',
                      label: 'binaire ngc',
                  }
                : {
                      path: 'node_modules/typescript/bin/tsc',
                      label: 'binaire tsc',
                  };
        return {
            script: regularFile(compiler.path, compiler.label),
            argv: ['-p', `apps/${app}/tsconfig.app.json`, '--noEmit'],
        };
    }
    const script = regularFile('node_modules/nx/dist/bin/nx.js', 'binaire Nx');
    if (oracle === 'build') {
        return {
            script,
            argv: ['run', `${app}:build:production`, '--skipNxCache'],
        };
    }
    if (oracle === 'lint') {
        return { script, argv: ['run', `${app}:lint`, '--skipNxCache'] };
    }
    if (oracle === 'test') {
        return {
            script,
            argv: [
                'run',
                `${app}:test`,
                '--skipNxCache',
                '--runnerConfig=tools/generator-platform/page-realization-vitest.config.mjs',
            ],
        };
    }
    fail(`oracle non autorisé : ${oracle}`);
}

export function main(argv = process.argv.slice(2)) {
    const { oracle, app, profile } = parseArgs(argv);
    const command = invocation(oracle, app, profile);
    const result = spawnSync(
        process.execPath,
        [command.script, ...command.argv],
        {
            cwd: process.cwd(),
            env: process.env,
            shell: false,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe'],
            maxBuffer: 64 * 1024 * 1024,
        }
    );
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    if (result.error) fail(result.error.message);
    if (result.signal) fail(`terminé par le signal ${result.signal}`);
    if (result.status !== 0) process.exitCode = result.status ?? 1;
}

if (
    process.argv[1] &&
    import.meta.url === pathToFileURL(process.argv[1]).href
) {
    try {
        main();
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
}
