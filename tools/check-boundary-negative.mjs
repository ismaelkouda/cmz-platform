#!/usr/bin/env node
/**
 * check-boundary-negative.mjs
 *
 * Audit A-12 — test negatif de non-regression des frontieres `scope:`.
 *
 * Simule une PR jetable : injecte un import interdit
 * (scope:monitoring → scope:reporting), execute ESLint, exige un echec
 * portant `@nx/enforce-module-boundaries`, puis nettoie le fichier sonde.
 *
 * Si ESLint est vert, la barriere machine est morte — exit 1.
 *
 * Usage:
 *   node tools/check-boundary-negative.mjs
 *
 * CI: job guardrails. Script npm: check:boundary-negative.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const PROBE_REL = 'libs/monitoring/domain/src/lib/__boundary-negative.probe.ts';
const PROBE_ABS = join(ROOT, PROBE_REL);

/**
 * Invoque ESLint sur la sonde en essayant plusieurs binaires — jamais un
 * seul chemin en dur. Trouvé en pratique (audit M-2026-08-03, même défaut
 * déjà corrigé dans `check-project-targets.mjs`, M-3) : `bunx` n'est pas
 * garanti sur le `PATH` de tous les environnements d'exécution
 * (`spawnSync bunx ENOENT`) — sans repli, ce script échouait avant même
 * d'avoir donné à ESLint la chance de rejeter la sonde, masquant le vrai
 * résultat du test négatif derrière une erreur d'environnement.
 *
 * Distinct de `tryInvokeNx` (`check-project-targets.mjs`) : ici, un ESLint
 * qui **échoue avec un exit non-zéro** est le résultat **attendu** (la
 * frontière a rejeté l'import interdit) — seule une erreur `ENOENT` (le
 * binaire lui-même est introuvable) doit déclencher l'essai suivant.
 */
function runEslintOnProbe() {
    const candidates = [
        ['bunx', ['eslint', PROBE_REL, '--max-warnings=0']],
        [
            join(ROOT, 'node_modules', '.bin', 'eslint'),
            [PROBE_REL, '--max-warnings=0'],
        ],
        ['npx', ['eslint', PROBE_REL, '--max-warnings=0']],
    ];
    let lastEnoent;
    for (const [cmd, args] of candidates) {
        try {
            const out = execFileSync(cmd, args, {
                cwd: ROOT,
                encoding: 'utf8',
                stdio: ['ignore', 'pipe', 'pipe'],
            });
            return { exitCode: 0, output: out };
        } catch (err) {
            if (err.code === 'ENOENT') {
                lastEnoent = err;
                continue; // binaire introuvable — essayer le candidat suivant
            }
            // ESLint a réellement tourné et a échoué — c'est le résultat.
            return {
                exitCode: typeof err.status === 'number' ? err.status : 1,
                output:
                    String(err.stdout || '') +
                    String(err.stderr || '') +
                    String(err.message || ''),
            };
        }
    }
    throw (
        lastEnoent ??
        new Error('Aucun binaire ESLint invocable (bunx/local/npx)')
    );
}

const PROBE_SOURCE = [
    '// Sonde temporaire — check-boundary-negative.mjs (ne pas committer).',
    "import type { ReportingSection } from '@cmz/reporting-domain';",
    '',
    'export type BoundaryNegativeProbe = ReportingSection;',
    '',
].join('\n');

mkdirSync(dirname(PROBE_ABS), { recursive: true });
writeFileSync(PROBE_ABS, PROBE_SOURCE, 'utf8');

let eslintExit = 0;
let eslintOut = '';
let invocationError;

// Le nettoyage de la sonde (finally) doit s'exécuter même si aucun binaire
// ESLint n'est invocable — jamais quitter via process.exit() à l'intérieur
// du try, qui n'attend pas forcément le finally avant de terminer le
// process (piège déjà rencontré avec le fichier sonde laissé derrière lors
// d'une session précédente).
try {
    const result = runEslintOnProbe();
    eslintExit = result.exitCode;
    eslintOut = result.output;
} catch (err) {
    invocationError = err;
} finally {
    try {
        unlinkSync(PROBE_ABS);
    } catch {
        // ignore cleanup errors
    }
}

if (invocationError) {
    console.error(
        "FAIL  impossible d'invoquer ESLint (bunx/local/npx tous indisponibles) :"
    );
    console.error(String(invocationError.message || invocationError));
    process.exit(1);
}

const mentionsBoundary =
    eslintOut.includes('@nx/enforce-module-boundaries') ||
    eslintOut.includes('enforce-module-boundaries') ||
    eslintOut.includes('A project tagged with');

if (eslintExit === 0) {
    console.error(
        'FAIL  violation scope:monitoring → scope:reporting non detectee.'
    );
    console.error(
        '      La regle @nx/enforce-module-boundaries ne bloque plus — regression A-1/A-12.'
    );
    if (eslintOut.trim()) console.error(eslintOut);
    process.exit(1);
}

if (!mentionsBoundary) {
    console.error(
        'FAIL  ESLint a echoue, mais sans signal enforce-module-boundaries.'
    );
    console.error(eslintOut);
    process.exit(1);
}

console.log(
    'OK  test negatif : import interdit scope:monitoring → scope:reporting rejete par ESLint'
);
process.exit(0);
