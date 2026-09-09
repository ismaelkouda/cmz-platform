#!/usr/bin/env node
/**
 * check:cmz-journals-ignored — tout journal d'outil sous `<dépôt>/.cmz/` doit
 * être ignoré par Git.
 *
 * Défaut réel trouvé le 2026-09-08 : `.cmz/library-llm-audit/` n'était pas dans
 * `.gitignore`, alors que ses cinq voisins y étaient. Conséquence mesurée — le
 * journal écrit par le harnais LLM rend le dépôt sale, et `add-library` exige un
 * dépôt **entièrement propre** avant de publier. Le contrôle initial (ligne 338)
 * passait, le journal était écrit (ligne 415), puis la publication (ligne 499)
 * échouait : l'échec arrivait au moment le plus coûteux, après le modèle, les
 * itérations et les preuves.
 *
 * Ajouter la ligne manquante n'aurait fermé que ce cas. Ce contrôle dérive la
 * liste depuis le CODE — les segments `.cmz/<nom>` littéraux des outils — et
 * exige que chacun soit ignoré, sauf ceux qui sont relatifs à une app et donc
 * gouvernés, listés ici explicitement. Un nouveau journal non ignoré échoue
 * sans que personne ait à y penser.
 */
import { execFileSync } from 'node:child_process';
import {
    globSync,
    mkdirSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

/**
 * Répertoires `.cmz/` portés par une APPLICATION (`apps/<app>/.cmz/…`), donc
 * versionnés : ce sont des artefacts gouvernés, pas des journaux d'exécution.
 */
export const APP_SCOPED = new Set(['app-manifest', 'libraries', 'pages']);

export function scanCmzDirectories(root = ROOT) {
    const names = new Set();
    for (const file of globSync('tools/**/*.mjs', { cwd: root })) {
        if (file.includes('/seos/') || file.includes('/mock-server/')) continue;
        const source = readFileSync(join(root, file), 'utf8');
        for (const [, name] of source.matchAll(/\.cmz\/([a-z][a-z0-9-]*)/g)) {
            if (!APP_SCOPED.has(name)) names.add(name);
        }
    }
    return [...names].sort();
}

export function ignoredByGit(root, relativePath) {
    try {
        execFileSync('git', ['-C', root, 'check-ignore', '-q', relativePath], {
            stdio: 'ignore',
        });
        return true;
    } catch {
        return false;
    }
}

export function verifyCmzJournalsIgnored(root = ROOT) {
    const errors = [];
    const names = scanCmzDirectories(root);
    if (names.length === 0)
        errors.push('aucun journal .cmz détecté — scan cassé');
    for (const name of names) {
        // `check-ignore` répond sur un chemin, existant ou non ; on crée une
        // sonde réelle pour couvrir aussi les motifs qui exigent un fichier.
        const probeDirectory = join(root, '.cmz', name);
        const probe = join(probeDirectory, '.cmz-ignore-probe');
        let created = false;
        try {
            mkdirSync(probeDirectory, { recursive: true });
            writeFileSync(probe, '');
            created = true;
            if (!ignoredByGit(root, `.cmz/${name}/.cmz-ignore-probe`)) {
                errors.push(
                    `.cmz/${name}/ n'est pas ignoré par Git : ce journal salirait le dépôt et ferait échouer la publication`
                );
            }
        } finally {
            if (created) rmSync(probe, { force: true });
            rmSync(probeDirectory, { recursive: true, force: true });
        }
    }
    return { ok: errors.length === 0, names, errors };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const result = verifyCmzJournalsIgnored();
    if (!result.ok) {
        console.error('\n❌ Journaux .cmz non ignorés :');
        for (const error of result.errors) console.error(`  - ${error}`);
        process.exitCode = 1;
    } else {
        console.log(
            `✔ check:cmz-journals-ignored — ${result.names.length} journal(aux) d'outil sous .cmz/, tous ignorés par Git.`
        );
    }
}
