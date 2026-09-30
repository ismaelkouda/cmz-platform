#!/usr/bin/env node
/**
 * Répare les vulnérabilités high/critical des dépendances transitives déjà
 * gouvernées par un override racine.
 *
 * Bun 1.3.14 n'expose pas encore `bun audit fix`. Le chemin volontairement
 * étroit est donc le même que celui du résolveur Bun de Dependabot :
 * `bun update <nom> --lockfile-only --ignore-scripts`, puis restauration
 * octet-par-octet de package.json. Seul bun.lock peut sortir modifié.
 *
 * Une vulnérabilité hors de la liste des overrides, une réparation incomplète
 * ou un changement de manifeste fait échouer le job : l'automate ne prend
 * jamais une décision d'architecture à la place d'une review humaine.
 */

import { spawnSync } from 'node:child_process';
import {
    appendFileSync,
    lstatSync,
    readFileSync,
    realpathSync,
    writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ACTIONABLE_SEVERITIES = new Set(['high', 'critical']);
const PACKAGE_NAME_PATTERN =
    /^(?:@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*$/;
export const AUDIT_IGNORES = Object.freeze([
    'GHSA-w3rx-r6r6-pgpr',
    'GHSA-5p2g-fcmc-qvqq',
]);

function advisoryId(advisory) {
    const match = String(advisory?.url ?? '').match(/(GHSA-[\w-]+)$/i);
    return match?.[1]?.toUpperCase();
}

export function parseAuditReport(stdout) {
    let report;
    try {
        report = JSON.parse(stdout);
    } catch (error) {
        throw new Error(`sortie JSON de bun audit invalide: ${error.message}`, {
            cause: error,
        });
    }
    if (!report || Array.isArray(report) || typeof report !== 'object') {
        throw new Error('bun audit doit retourner un objet JSON');
    }
    return report;
}

export function securityRepairPlan(
    report,
    overrides,
    {
        actionableSeverities = ACTIONABLE_SEVERITIES,
        ignoredAdvisories = AUDIT_IGNORES,
    } = {}
) {
    const ignored = new Set(ignoredAdvisories.map((id) => id.toUpperCase()));
    const findings = [];

    for (const [packageName, advisories] of Object.entries(report)) {
        if (!PACKAGE_NAME_PATTERN.test(packageName)) {
            throw new Error(`nom de paquet audit non sûr: ${packageName}`);
        }
        if (!Array.isArray(advisories)) {
            throw new Error(`avis ${packageName} invalide: tableau attendu`);
        }
        for (const advisory of advisories) {
            const severity = String(advisory?.severity ?? '').toLowerCase();
            const id = advisoryId(advisory);
            if (
                actionableSeverities.has(severity) &&
                (!id || !ignored.has(id))
            ) {
                findings.push({ packageName, id, severity });
            }
        }
    }

    findings.sort((left, right) =>
        `${left.packageName}:${left.id}`.localeCompare(
            `${right.packageName}:${right.id}`
        )
    );
    const packages = [...new Set(findings.map((item) => item.packageName))];
    const repairable = packages.filter((name) =>
        Object.hasOwn(overrides ?? {}, name)
    );
    const unsupported = packages.filter(
        (name) => !Object.hasOwn(overrides ?? {}, name)
    );

    return { findings, repairable, unsupported };
}

function run(command, args, { allowAuditFindings = false, cwd = ROOT } = {}) {
    const result = spawnSync(command, args, {
        cwd,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
    });
    if (result.error) throw result.error;
    if (
        result.signal ||
        (result.status !== 0 && !(allowAuditFindings && result.status === 1))
    ) {
        const detail = result.stderr.trim() || result.stdout.trim();
        throw new Error(
            `${command} ${args.join(' ')} a échoué (${result.signal ?? result.status})${detail ? `: ${detail}` : ''}`
        );
    }
    return result.stdout;
}

function audit(root, runCommand) {
    const args = ['audit', '--json'];
    for (const advisory of AUDIT_IGNORES) {
        args.push('--ignore', advisory);
    }
    return parseAuditReport(
        runCommand('bun', args, {
            allowAuditFindings: true,
            cwd: root,
        }).trim()
    );
}

function writeOutput(name, value) {
    const output = process.env.GITHUB_OUTPUT;
    if (output) appendFileSync(output, `${name}=${value}\n`, 'utf8');
}

function assertRegularRootFile(root, path, label) {
    const stat = lstatSync(path);
    if (!stat.isFile() || stat.isSymbolicLink()) {
        throw new Error(`${label} doit être un fichier physique régulier`);
    }
    const resolvedRoot = realpathSync(root);
    const resolvedPath = realpathSync(path);
    if (dirname(resolvedPath) !== resolvedRoot) {
        throw new Error(`${label} doit rester un fichier racine régulier`);
    }
}

export function repairSecurityOverrides(
    root = ROOT,
    { runCommand = run } = {}
) {
    const packagePath = join(root, 'package.json');
    const lockPath = join(root, 'bun.lock');
    assertRegularRootFile(root, packagePath, 'package.json');
    assertRegularRootFile(root, lockPath, 'bun.lock');

    const packageBefore = readFileSync(packagePath);
    const lockBefore = readFileSync(lockPath);
    const pkg = JSON.parse(packageBefore.toString('utf8'));
    const initial = securityRepairPlan(audit(root, runCommand), pkg.overrides);

    if (initial.unsupported.length > 0) {
        throw new Error(
            `vulnérabilité high/critical hors overrides auto-réparables: ${initial.unsupported.join(', ')}`
        );
    }
    if (initial.repairable.length === 0) {
        return { repaired: false, packages: [] };
    }

    try {
        for (const packageName of initial.repairable) {
            runCommand(
                'bun',
                [
                    'update',
                    packageName,
                    '--lockfile-only',
                    '--ignore-scripts',
                    '--no-progress',
                ],
                { cwd: root }
            );
            // Bun ajoute actuellement une transitive ciblée au manifeste.
            // Cette mutation n'est jamais autorisée à sortir de l'outil.
            writeFileSync(packagePath, packageBefore);
        }
        runCommand('bun', ['install', '--lockfile-only', '--ignore-scripts'], {
            cwd: root,
        });
        writeFileSync(packagePath, packageBefore);

        const packageAfter = readFileSync(packagePath);
        if (!packageAfter.equals(packageBefore)) {
            throw new Error('package.json a dérivé pendant la réparation');
        }
        const lockAfter = readFileSync(lockPath);
        if (lockAfter.equals(lockBefore)) {
            throw new Error(
                `bun.lock est inchangé malgré les avis: ${initial.repairable.join(', ')}`
            );
        }

        const remaining = securityRepairPlan(
            audit(root, runCommand),
            pkg.overrides
        );
        if (remaining.findings.length > 0) {
            const labels = remaining.findings.map(
                ({ packageName, id }) =>
                    `${packageName}:${id ?? 'avis-inconnu'}`
            );
            throw new Error(`réparation incomplète: ${labels.join(', ')}`);
        }

        return { repaired: true, packages: initial.repairable };
    } catch (error) {
        // Une exécution locale doit être aussi transactionnelle que le job
        // éphémère : aucun lock partiellement réparé ne reste dans le dépôt.
        writeFileSync(lockPath, lockBefore);
        throw error;
    } finally {
        writeFileSync(packagePath, packageBefore);
    }
}

function main() {
    const result = repairSecurityOverrides();
    writeOutput('repaired', String(result.repaired));
    writeOutput('packages', result.packages.join(','));
    console.log(
        result.repaired
            ? `✔ bun.lock auto-réparé pour: ${result.packages.join(', ')} (package.json inchangé).`
            : '✔ Aucun override high/critical à réparer.'
    );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    try {
        main();
    } catch (error) {
        console.error(`✖ Auto-réparation sécurité refusée: ${error.message}`);
        process.exit(1);
    }
}
