#!/usr/bin/env node
/**
 * Point d'entrée unique de l'audit des dépendances (high/critical bloquant).
 *
 * `AUDIT_IGNORES` est la seule source des exceptions. Une exception vise un
 * seul avis GHSA d'un seul paquet, dure au plus 14 jours et se ferme seule.
 * Elle n'est appliquée qu'après validation, fermée par défaut : l'audit est
 * refusé (code 1) si
 *   a. la date du jour (UTC) atteint `expires` ;
 *   b. `expires − granted` dépasse 14 jours, ou `granted` est dans le futur ;
 *   c. l'avis n'apparaît plus dans `bun audit --json` (exception à retirer) ;
 *   d. l'avis apparaît sous un autre paquet que `package` ;
 *   e. une version corrigée existe : la dernière version publiée du paquet ne
 *      satisfait plus `vulnerable_versions`. Registre injoignable : refus.
 * Puis il lance le `bun audit --audit-level=high --ignore=<avis>` natif et
 * rend son code de sortie. Aucun workflow n'écrit `--ignore` lui-même
 * (garde : check:workflow-privileges).
 *
 * `--ignore` de Bun 1.4.4 est sensible à la casse : l'avis est passé tel que
 * le rapport l'écrit (suffixe de son URL), jamais tel que la liste l'écrit.
 *
 * Usage : node tools/audit-exceptions.mjs
 */

import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import semver from 'semver';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DAY_MS = 86_400_000;
const GHSA = /^GHSA(?:-[23456789CFGHJMPQRVWX]{4}){3}$/;
const PACKAGE_NAME = /^(?:@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ENTRY_KEYS = ['expires', 'granted', 'id', 'package', 'reason'];

export const AUDIT_EXCEPTION_MAX_DAYS = 14;

// Aucune exception en cours. Une entrée ajoutée ici (objet gelé, clés
// d'ENTRY_KEYS) n'est appliquée qu'après validateAuditExceptions.
export const AUDIT_IGNORES = Object.freeze([]);

/** Identifiant GHSA d'un avis, tel que son URL l'écrit (casse d'origine). */
export function advisoryId(advisory) {
    return String(advisory?.url ?? '').match(/(GHSA-[\w-]+)$/i)?.[1];
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

function day(value, label) {
    const time = Date.parse(`${value}T00:00:00Z`);
    if (
        typeof value !== 'string' ||
        !ISO_DATE.test(value) ||
        Number.isNaN(time) ||
        new Date(time).toISOString().slice(0, 10) !== value
    )
        throw new Error(`${label} doit être une date AAAA-MM-JJ`);
    return time;
}

function assertEntry(entry) {
    const keys = Object.keys(entry ?? {}).sort();
    if (keys.join() !== ENTRY_KEYS.join())
        throw new Error(`exception mal formée : clés ${ENTRY_KEYS.join(', ')}`);
    if (!GHSA.test(entry.id))
        throw new Error(`exception ${entry.id} : identifiant GHSA invalide`);
    if (!PACKAGE_NAME.test(entry.package))
        throw new Error(`exception ${entry.id} : paquet invalide`);
    if (typeof entry.reason !== 'string' || entry.reason.trim() === '')
        throw new Error(`exception ${entry.id} : raison écrite manquante`);
}

/**
 * Valide les exceptions contre le rapport COMPLET (sans `--ignore`) et rend
 * les identifiants à passer à `--ignore`, dans la casse du rapport.
 */
export function validateAuditExceptions(
    report,
    { exceptions = AUDIT_IGNORES, now = new Date(), latestVersion }
) {
    const today = day(now.toISOString().slice(0, 10), 'aujourd’hui');
    const seen = new Set();
    const ids = [];
    for (const entry of exceptions) {
        assertEntry(entry);
        const { id, package: name, granted, expires } = entry;
        if (seen.has(id)) throw new Error(`exception ${id} : en double`);
        seen.add(id);
        const start = day(granted, `exception ${id} : granted`);
        const end = day(expires, `exception ${id} : expires`);
        if (today >= end)
            throw new Error(`exception ${id} expirée depuis le ${expires}`);
        if (start > today)
            throw new Error(`exception ${id} : accordée dans le futur`);
        // Atteint après (a) et le refus du futur : expires > today >= granted.
        if (end - start > AUDIT_EXCEPTION_MAX_DAYS * DAY_MS)
            throw new Error(
                `exception ${id} : durée de plus de ${AUDIT_EXCEPTION_MAX_DAYS} jours`
            );
        const found = Object.entries(report).flatMap(([pkg, advisories]) =>
            (Array.isArray(advisories) ? advisories : [])
                .filter((a) => advisoryId(a)?.toUpperCase() === id)
                .map((advisory) => ({ pkg, advisory }))
        );
        if (found.length === 0)
            throw new Error(
                `exception ${id} périmée : l'avis n'apparaît plus dans bun audit, retirer l'exception`
            );
        const others = [...new Set(found.map(({ pkg }) => pkg))].filter(
            (pkg) => pkg !== name
        );
        if (others.length)
            throw new Error(
                `exception ${id} : avis aussi sous ${others.sort().join(', ')}, pas seulement ${name}`
            );
        const latest = latestVersion(name);
        if (!semver.valid(latest))
            throw new Error(
                `exception ${id} : dernière version de ${name} illisible`
            );
        for (const { advisory } of found) {
            const range = advisory.vulnerable_versions;
            if (typeof range !== 'string' || !semver.validRange(range))
                throw new Error(
                    `exception ${id} : vulnerable_versions illisible`
                );
            if (!semver.satisfies(latest, range))
                throw new Error(
                    `exception ${id} : version corrigée publiée (${name}@${latest} hors de ${range}), retirer l'exception et corriger`
                );
        }
        ids.push(...new Set(found.map(({ advisory }) => advisoryId(advisory))));
    }
    return ids;
}

export const AUDIT_ENTRY = 'node tools/audit-exceptions.mjs';

/**
 * Lignes `run` d'un workflow qui contournent le point d'entrée : un
 * `--ignore` d'audit écrit à la main, un audit lancé directement, ou le
 * point d'entrée appelé avec autre chose que sa commande exacte.
 */
export function workflowAuditViolations(file, workflow) {
    const violations = [];
    for (const [name, job] of Object.entries(workflow?.jobs ?? {})) {
        for (const step of Array.isArray(job?.steps) ? job.steps : []) {
            if (typeof step?.run !== 'string') continue;
            for (const line of step.run.split('\n').map((l) => l.trim())) {
                const where = `${file} : job ${name}`;
                if (
                    /\baudit\b/.test(line) &&
                    /--ignore(?!-scripts)\b/.test(line)
                )
                    violations.push(
                        `${where} : --ignore d'audit écrit à la main, refusé (exceptions : AUDIT_IGNORES)`
                    );
                else if (/\b(?:bunx?|npx|npm|pnpm|yarn)\s+audit\b/.test(line))
                    violations.push(
                        `${where} : audit lancé hors de ${AUDIT_ENTRY}`
                    );
                else if (
                    line.includes('audit-exceptions.mjs') &&
                    line !== AUDIT_ENTRY
                )
                    violations.push(
                        `${where} : ${AUDIT_ENTRY} s'appelle seul, sans argument`
                    );
            }
        }
    }
    return violations;
}

/** Dernière version publiée (registre npm) ; toute panne est un refus. */
export function registryLatestVersion(name, spawn = spawnSync) {
    const result = spawn('bun', ['info', name, 'version'], {
        cwd: ROOT,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 60_000,
    });
    if (result.error || result.signal || result.status !== 0)
        throw new Error(`registre injoignable pour ${name}`);
    return result.stdout.trim();
}

function capture(spawn, args) {
    const result = spawn('bun', args, {
        cwd: ROOT,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        maxBuffer: 64 * 1024 * 1024,
    });
    if (result.error) throw result.error;
    if (result.signal || (result.status !== 0 && result.status !== 1))
        throw new Error(
            `bun ${args.join(' ')} a échoué (${result.signal ?? result.status})`
        );
    return result.stdout.trim();
}

/**
 * Valide puis lance l'audit natif ; rend son code de sortie. `exceptions`
 * vaut `AUDIT_IGNORES` ; seuls les tests en injectent d'autres.
 */
export function runAudit({
    now = new Date(),
    exceptions = AUDIT_IGNORES,
    spawn = spawnSync,
    latestVersion = (name) => registryLatestVersion(name, spawn),
    log = console.log,
} = {}) {
    const report = parseAuditReport(capture(spawn, ['audit', '--json']));
    const ids = validateAuditExceptions(report, {
        exceptions,
        now,
        latestVersion,
    });
    for (const entry of exceptions)
        log(
            `exception validée : ${entry.id} (${entry.package}), expire le ${entry.expires}`
        );
    const result = spawn(
        'bun',
        ['audit', '--audit-level=high', ...ids.map((id) => `--ignore=${id}`)],
        { cwd: ROOT, stdio: 'inherit' }
    );
    if (result.error) throw result.error;
    return result.status ?? 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    try {
        process.exitCode = runAudit();
    } catch (error) {
        console.error(`✖ Audit des dépendances refusé : ${error.message}`);
        process.exitCode = 1;
    }
}
