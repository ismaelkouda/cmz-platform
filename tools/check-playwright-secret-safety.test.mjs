import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
    existsSync,
    mkdtempSync,
    mkdirSync,
    rmSync,
    unlinkSync,
    writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { afterEach, test } from 'node:test';

import {
    inspectPlaywrightConfig,
    inspectionViolations,
    isPlaywrightConfigPath,
    trackedPlaywrightConfigs,
    verifyPlaywrightSecretSafety,
} from './check-playwright-secret-safety.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PLAYWRIGHT_CLI = join(
    ROOT,
    'node_modules',
    '@playwright',
    'test',
    'cli.js'
);
const TEST_PROCESS_TIMEOUT_MS = 5_000;
const FINITE_BLOCKING_DELAY_MS = 8_000;
const temporaryRoots = [];

afterEach(() => {
    for (const root of temporaryRoots.splice(0)) {
        rmSync(root, { recursive: true, force: true });
    }
});

function shellArgument(value) {
    return `'${value.replaceAll("'", "'\\''")}'`;
}

function fixtureConfig({
    blocksImport = false,
    blocksTestLoad = false,
    copiesEnvironment = false,
    failsDuringLoad = false,
    hasWebServer = true,
    reporterOnlyLeak = false,
} = {}) {
    const root = mkdtempSync(join(tmpdir(), 'cmz-playwright-secret-safety-'));
    temporaryRoots.push(root);
    const testDir = join(root, 'e2e');
    mkdirSync(testDir);
    const playwrightModule = pathToFileURL(
        join(ROOT, 'node_modules', '@playwright', 'test', 'index.mjs')
    ).href;
    const serverMarker = join(root, 'webserver-was-started');
    const serverScript = join(root, 'fake-web-server.mjs');
    const configPath = join(root, 'playwright.config.mjs');
    const spread = copiesEnvironment ? '...process.env,' : '';
    const command = [process.execPath, serverScript, serverMarker]
        .map(shellArgument)
        .join(' ');
    const metadata = reporterOnlyLeak
        ? `metadata: { reporterCanary: process.env.CMZ_PLAYWRIGHT_REPORTER_SENTINEL },`
        : '';
    const finiteBlockingDelay =
        `await new Promise((resolve) => ` +
        `setTimeout(resolve, ${FINITE_BLOCKING_DELAY_MS}));\n`;
    const webServer = hasWebServer
        ? `webServer: {\n` +
          `    command: ${JSON.stringify(command)},\n` +
          `    url: 'http://127.0.0.1:65534/health',\n` +
          `    env: { ${spread} EXPLICIT_VALUE: 'visible' },\n` +
          `  },`
        : '';

    writeFileSync(
        serverScript,
        `import { writeFileSync } from 'node:fs';\n` +
            `writeFileSync(process.argv[2], 'started');\n`
    );

    writeFileSync(
        configPath,
        `import { defineConfig } from ${JSON.stringify(playwrightModule)};\n` +
            `if (process.env.CMZ_REAL_ENVIRONMENT_CANARY) throw new Error('real environment leaked');\n` +
            (blocksImport ? finiteBlockingDelay : '') +
            `export default defineConfig({\n` +
            `  testDir: ${JSON.stringify(testDir)},\n` +
            `  ${metadata}\n` +
            `  ${webServer}\n` +
            `});\n`
    );
    writeFileSync(
        join(testDir, 'fixture.spec.mjs'),
        `import { test } from ${JSON.stringify(playwrightModule)};\n` +
            (blocksTestLoad ? finiteBlockingDelay : '') +
            (failsDuringLoad
                ? `throw new Error('fixture-load-failure');\n`
                : '') +
            `test('listed only', async () => {});\n`
    );
    return { command, configPath, root, serverMarker };
}

function proveServerWitness({ command, root, serverMarker }) {
    const result = spawnSync(command, {
        cwd: root,
        encoding: 'utf8',
        env: {},
        shell: true,
        timeout: 5_000,
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(existsSync(serverMarker), true);
    unlinkSync(serverMarker);
    assert.equal(existsSync(serverMarker), false);
}

test('découvre tous les profils Playwright suivis sans liste applicative', () => {
    assert.deepEqual(trackedPlaywrightConfigs(ROOT), [
        'apps/backoffice-angular/playwright.config.mjs',
        'apps/backoffice-angular/playwright.memory.config.mjs',
        'apps/users-management-proof/playwright.config.mjs',
        'apps/users-management-react-proof/playwright.config.mjs',
        'apps/users-management-react-proof/playwright.memory.config.mjs',
        'apps/workspace-react-proof/playwright.config.mjs',
        'apps/workspace-react-proof/playwright.memory.config.mjs',
    ]);
});

test('reconnaît aussi le nom officiel des configurations component testing', () => {
    for (const path of [
        'playwright.config.ts',
        'app/playwright.memory.config.mjs',
        'app/playwright-ct.config.ts',
        'app/playwright-mobile.config.cts',
    ]) {
        assert.equal(isPlaywrightConfigPath(path), true, path);
    }
    assert.equal(isPlaywrightConfigPath('app/playwright-helper.ts'), false);
});

test('inspecte les profils réels et leurs cinq webservers principaux', () => {
    assert.deepEqual(verifyPlaywrightSecretSafety(ROOT), {
        configs: 7,
        primaryConfigs: 4,
        primaryWebServers: 5,
        totalWebServers: 9,
    });
});

test('le reporter JSON reste borné et --list ne démarre aucun serveur', () => {
    const fixture = fixtureConfig({
        copiesEnvironment: false,
    });
    const { configPath, root, serverMarker } = fixture;
    proveServerWitness(fixture);
    process.env.CMZ_REAL_ENVIRONMENT_CANARY = 'parent-only-value';
    let inspection;
    try {
        inspection = inspectPlaywrightConfig(configPath, {
            root,
            playwrightCli: PLAYWRIGHT_CLI,
        });
    } finally {
        delete process.env.CMZ_REAL_ENVIRONMENT_CANARY;
    }

    assert.equal(inspection.webServerCount, 1);
    assert.equal(inspection.reporterWebServerCount, 1);
    assert.equal(inspection.resolvedSentinelSerialized, false);
    assert.equal(inspection.reporterSentinelSerialized, false);
    assert.deepEqual(inspectionViolations(inspection), []);
    assert.equal(existsSync(serverMarker), false);
});

test('mutation : réintroduire ...process.env échoue par trois signaux', () => {
    const fixture = fixtureConfig({
        copiesEnvironment: true,
    });
    const { configPath, root, serverMarker } = fixture;
    proveServerWitness(fixture);
    const inspection = inspectPlaywrightConfig(configPath, {
        root,
        playwrightCli: PLAYWRIGHT_CLI,
    });
    const violations = inspectionViolations(inspection);

    assert.equal(inspection.hasProcessEnvSpread, true);
    assert.equal(inspection.resolvedSentinelSerialized, true);
    assert.equal(inspection.reporterSentinelSerialized, true);
    assert.equal(violations.length, 3);
    assert.match(violations[0], /copie statique/);
    assert.match(violations[1], /bloc webServer résolu/);
    assert.match(violations[2], /reporter JSON officiel/);
    assert.equal(existsSync(serverMarker), false);
});

test('mutation : le chemin reporter seul est indispensable', () => {
    const fixture = fixtureConfig({
        reporterOnlyLeak: true,
    });
    const { configPath, root, serverMarker } = fixture;
    proveServerWitness(fixture);
    const inspection = inspectPlaywrightConfig(configPath, {
        root,
        playwrightCli: PLAYWRIGHT_CLI,
    });
    const violations = inspectionViolations(inspection);

    assert.equal(inspection.hasProcessEnvSpread, false);
    assert.equal(inspection.resolvedSentinelSerialized, false);
    assert.equal(inspection.reporterSentinelSerialized, true);
    assert.equal(violations.length, 1);
    assert.match(violations[0], /reporter JSON officiel/);
    assert.equal(existsSync(serverMarker), false);
});

test('restitue la première erreur structurée du reporter Playwright', () => {
    const { configPath, root } = fixtureConfig({ failsDuringLoad: true });
    assert.throws(
        () =>
            inspectPlaywrightConfig(configPath, {
                root,
                playwrightCli: PLAYWRIGHT_CLI,
            }),
        /fixture-load-failure/
    );
});

test('une fixture saine passe avec le délai utilisé par les preuves de timeout', () => {
    const { configPath, root } = fixtureConfig();
    const inspection = inspectPlaywrightConfig(configPath, {
        processTimeoutMs: TEST_PROCESS_TIMEOUT_MS,
        root,
        playwrightCli: PLAYWRIGHT_CLI,
    });

    assert.equal(inspection.webServerCount, 1);
    assert.deepEqual(inspectionViolations(inspection), []);
});

test('borne un import de configuration retenu par un minuteur fini', () => {
    const { configPath, root } = fixtureConfig({ blocksImport: true });
    assert.throws(
        () =>
            inspectPlaywrightConfig(configPath, {
                processTimeoutMs: TEST_PROCESS_TIMEOUT_MS,
                root,
                playwrightCli: PLAYWRIGHT_CLI,
            }),
        /impossible de résoudre le module de configuration.*ETIMEDOUT/i
    );
});

test('borne le reporter pendant un chargement de test retenu par un minuteur fini', () => {
    const { configPath, root } = fixtureConfig({ blocksTestLoad: true });
    assert.throws(
        () =>
            inspectPlaywrightConfig(configPath, {
                processTimeoutMs: TEST_PROCESS_TIMEOUT_MS,
                root,
                playwrightCli: PLAYWRIGHT_CLI,
            }),
        /le reporter JSON officiel n'a pas pu lister les tests.*ETIMEDOUT/i
    );
});

test('refuse explicitement une configuration suivie sans webServer', () => {
    const { configPath, root } = fixtureConfig({ hasWebServer: false });
    const inspection = inspectPlaywrightConfig(configPath, {
        root,
        playwrightCli: PLAYWRIGHT_CLI,
    });
    assert.equal(inspection.webServerCount, 0);
    assert.match(
        inspectionViolations(inspection).join('\n'),
        /aucun bloc `webServer` résolu/
    );
});
