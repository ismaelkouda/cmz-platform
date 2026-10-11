#!/usr/bin/env node
/**
 * Refuse la régression où une configuration Playwright recopie globalement
 * l'environnement du processus dans une surface sérialisable.
 *
 * Le plugin webServer de Playwright 1.63.0 transmet déjà `process.env` au
 * processus qu'il lance. Le recopier dans la configuration n'ajoute donc
 * aucune capacité d'exécution, mais le reporter JSON publie `webServer` et
 * rend cette copie persistante.
 *
 * Le contrôle combine deux preuves :
 * - recherche statique du spread historique ;
 * - chargement de chaque configuration suivie avec le reporter JSON officiel
 *   et une sentinelle synthétique, en mode `--list` (aucun test, serveur ou
 *   navigateur n'est démarré).
 *
 * Les processus enfants reçoivent un environnement fermé. L'environnement
 * réel de l'agent ou de la CI n'est jamais transmis au reporter.
 */

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PLAYWRIGHT_CLI = join(
    ROOT,
    'node_modules',
    '@playwright',
    'test',
    'cli.js'
);
const SENTINEL_VALUE = 'cmz-synthetic-environment-must-not-be-serialized';
const EXPECTED_PRIMARY_CONFIGS = 4;
const EXPECTED_PRIMARY_WEB_SERVERS = 5;
const GIT_TIMEOUT_MS = 10_000;
const CONFIG_PROCESS_TIMEOUT_MS = 30_000;
const MAX_DIAGNOSTIC_LENGTH = 2_000;
const PROCESS_ENV_SPREAD = /\.\.\.\s*process\s*\.\s*env\b/;
const PLAYWRIGHT_CONFIG =
    /(?:^|\/)playwright(?:[.-][^./-]+)*\.config\.(?:[cm]?[jt]s)$/;

function fail(message) {
    throw new Error(`[playwright secret safety] ${message}`);
}

/** Environnement minimal et sans secret pour tous les processus de contrôle. */
function syntheticEnvironment(extra = {}) {
    return {
        CI: '1',
        LANG: 'C',
        CMZ_PLAYWRIGHT_REPORTER_SENTINEL: SENTINEL_VALUE,
        ...extra,
    };
}

function firstReporterError(stdout) {
    try {
        const report = JSON.parse(stdout);
        const message = Array.isArray(report?.errors)
            ? report.errors.find((error) => typeof error?.message === 'string')
                  ?.message
            : undefined;
        return message
            ?.replaceAll(/\s+/g, ' ')
            .trim()
            .slice(0, MAX_DIAGNOSTIC_LENGTH);
    } catch {
        return undefined;
    }
}

function commandFailure(label, result, { reporterJson = false } = {}) {
    const details = [
        result.error?.message,
        reporterJson ? firstReporterError(result.stdout) : undefined,
        result.stderr?.trim(),
    ].filter(Boolean);
    return details.length > 0
        ? details.join(' — ')
        : `${label} terminé avec le statut ${String(result.status)}`;
}

export function isPlaywrightConfigPath(path) {
    return PLAYWRIGHT_CONFIG.test(path);
}

/** Découvre les configurations suivies au lieu de lister des applications. */
export function trackedPlaywrightConfigs(root = ROOT) {
    const result = spawnSync('git', ['ls-files', '-z'], {
        cwd: root,
        encoding: 'utf8',
        env: syntheticEnvironment({
            PATH: '/usr/local/bin:/usr/bin:/bin',
        }),
        killSignal: 'SIGKILL',
        timeout: GIT_TIMEOUT_MS,
    });
    if (result.error || result.status !== 0) {
        fail(
            `impossible de découvrir les configurations Git suivies (${commandFailure('git ls-files', result)})`
        );
    }

    return result.stdout.split('\0').filter(isPlaywrightConfigPath).sort();
}

function isPrimaryConfig(path) {
    return /(?:^|\/)playwright\.config\.[^/]+$/.test(path);
}

function webServersOf(report) {
    const webServer = report?.config?.webServer;
    if (!webServer) return [];
    return Array.isArray(webServer) ? webServer : [webServer];
}

function resolvedWebServers(config, root, processTimeoutMs) {
    const configUrl = pathToFileURL(config).href;
    const source =
        `const loaded = await import(process.argv[1]);\n` +
        `process.stdout.write(JSON.stringify(loaded.default?.webServer ?? null));\n`;
    const result = spawnSync(
        process.execPath,
        ['--input-type=module', '--eval', source, configUrl],
        {
            cwd: root,
            encoding: 'utf8',
            env: syntheticEnvironment(),
            killSignal: 'SIGKILL',
            maxBuffer: 16 * 1024 * 1024,
            timeout: processTimeoutMs,
        }
    );
    if (result.error || result.status !== 0) {
        fail(
            `${config} : impossible de résoudre le module de configuration (${commandFailure('node import()', result)})`
        );
    }

    try {
        const webServer = JSON.parse(result.stdout);
        return {
            serialized: result.stdout,
            webServers: webServer
                ? Array.isArray(webServer)
                    ? webServer
                    : [webServer]
                : [],
        };
    } catch (error) {
        fail(
            `${config} : résolution webServer illisible (${error instanceof Error ? error.message : String(error)})`
        );
    }
}

function assertInsideRoot(root, path) {
    const rel = relative(root, path);
    if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
        fail(`configuration hors dépôt refusée : ${path}`);
    }
}

/**
 * Charge une configuration par la CLI Playwright officielle. `--list` charge
 * les tests et la configuration, mais n'exécute ni test ni plugin webServer.
 */
export function inspectPlaywrightConfig(
    config,
    {
        processTimeoutMs = CONFIG_PROCESS_TIMEOUT_MS,
        root = ROOT,
        playwrightCli = PLAYWRIGHT_CLI,
    } = {}
) {
    if (!Number.isInteger(processTimeoutMs) || processTimeoutMs <= 0) {
        fail('le délai des processus de contrôle doit être un entier positif.');
    }
    const absoluteConfig = resolve(root, config);
    assertInsideRoot(root, absoluteConfig);
    const source = readFileSync(absoluteConfig, 'utf8');
    const resolved = resolvedWebServers(absoluteConfig, root, processTimeoutMs);
    const result = spawnSync(
        process.execPath,
        [
            playwrightCli,
            'test',
            '--list',
            '--reporter=json',
            '--config',
            absoluteConfig,
        ],
        {
            cwd: root,
            encoding: 'utf8',
            env: syntheticEnvironment(),
            killSignal: 'SIGKILL',
            maxBuffer: 64 * 1024 * 1024,
            timeout: processTimeoutMs,
        }
    );
    if (result.error || result.status !== 0) {
        fail(
            `${config} : le reporter JSON officiel n'a pas pu lister les tests (${commandFailure('playwright test --list', result, { reporterJson: true })})`
        );
    }

    let report;
    try {
        report = JSON.parse(result.stdout);
    } catch (error) {
        fail(
            `${config} : sortie JSON Playwright illisible (${error instanceof Error ? error.message : String(error)})`
        );
    }

    const reporterSerialized = JSON.stringify(report);
    return Object.freeze({
        config,
        hasProcessEnvSpread: PROCESS_ENV_SPREAD.test(source),
        reporterSentinelSerialized: reporterSerialized.includes(SENTINEL_VALUE),
        reporterWebServerCount: webServersOf(report).length,
        resolvedSentinelSerialized:
            resolved.serialized.includes(SENTINEL_VALUE),
        webServerCount: resolved.webServers.length,
    });
}

export function inspectionViolations(inspection) {
    const violations = [];
    if (inspection.hasProcessEnvSpread) {
        violations.push(
            `${inspection.config} : copie statique \`...process.env\` dans la configuration.`
        );
    }
    if (inspection.resolvedSentinelSerialized) {
        violations.push(
            `${inspection.config} : l'environnement synthétique atteint un bloc webServer résolu.`
        );
    }
    if (inspection.reporterSentinelSerialized) {
        violations.push(
            `${inspection.config} : l'environnement synthétique atteint la sortie du reporter JSON officiel.`
        );
    }
    if (inspection.webServerCount === 0) {
        violations.push(
            `${inspection.config} : aucun bloc \`webServer\` résolu dans le module de configuration ; contrôle incomplet.`
        );
    }
    return violations;
}

export function verifyPlaywrightSecretSafety(root = ROOT) {
    const configs = trackedPlaywrightConfigs(root);
    if (configs.length === 0) fail('aucune configuration Playwright suivie.');

    const inspections = configs.map((config) =>
        inspectPlaywrightConfig(config, { root })
    );
    const primaryInspections = inspections.filter(({ config }) =>
        isPrimaryConfig(config)
    );
    const primaryWebServers = primaryInspections.reduce(
        (count, inspection) => count + inspection.webServerCount,
        0
    );
    const violations = inspections.flatMap(inspectionViolations);

    if (primaryInspections.length !== EXPECTED_PRIMARY_CONFIGS) {
        violations.push(
            `profils principaux inspectés : ${primaryInspections.length}, attendu : ${EXPECTED_PRIMARY_CONFIGS}. Toute évolution de cette surface exige une revue du garde.`
        );
    }
    if (primaryWebServers !== EXPECTED_PRIMARY_WEB_SERVERS) {
        violations.push(
            `blocs webServer principaux inspectés : ${primaryWebServers}, attendu : ${EXPECTED_PRIMARY_WEB_SERVERS}.`
        );
    }
    if (violations.length > 0) fail(violations.join('\n'));

    return Object.freeze({
        configs: inspections.length,
        primaryConfigs: primaryInspections.length,
        primaryWebServers,
        totalWebServers: inspections.reduce(
            (count, inspection) => count + inspection.webServerCount,
            0
        ),
    });
}

function isMain() {
    return (
        process.argv[1] &&
        resolve(process.argv[1]) === fileURLToPath(import.meta.url)
    );
}

if (isMain()) {
    try {
        const summary = verifyPlaywrightSecretSafety(ROOT);
        console.log(
            `✔ Playwright : ${summary.configs} configurations suivies inspectées, dont ${summary.primaryConfigs} profils principaux / ${summary.primaryWebServers} webservers ; aucune copie globale d'environnement détectée.`
        );
    } catch (error) {
        console.error(
            `✖ ${error instanceof Error ? error.message : String(error)}`
        );
        process.exitCode = 1;
    }
}
