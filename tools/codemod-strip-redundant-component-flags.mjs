#!/usr/bin/env node
/**
 * Codemod ponctuel — chantier J (J-3, J-4 ; audit-workspace-2026-08-02-
 * addendum.md, P0-10). Retire `standalone: true` et `changeDetection:
 * ChangeDetectionStrategy.OnPush` des décorateurs `@Component`, redondants
 * depuis qu'Angular 22 les traite comme défauts implicites
 * (`conventions/angular-22.profile.json`). Un seul passage, pas un outil à
 * rejouer en continu — laissé dans `tools/` pour traçabilité/rejouabilité,
 * pas pour un usage régulier.
 *
 * Ne touche que les fichiers signalés par `check-convention-profile.mjs`
 * (source de vérité, pas une liste dupliquée ici).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;

function getViolatingFiles() {
    // Le checker sort en code 1 quand il trouve des violations (attendu ici,
    // c'est tout le point de ce codemod) — execSync lève alors une erreur
    // dont `stdout` porte le rapport, à récupérer plutôt qu'à relancer.
    let out;
    try {
        out = execSync('node tools/check-convention-profile.mjs --verbose', {
            cwd: ROOT,
            encoding: 'utf8',
        });
    } catch (error) {
        out = error.stdout ?? '';
    }
    const files = new Set();
    let section = null;
    for (const line of out.split('\n')) {
        if (line.startsWith('standalone: true :')) {
            section = 'standalone';
            continue;
        }
        if (line.startsWith('changeDetection explicite :')) {
            section = 'cd';
            continue;
        }
        if (/^[A-Za-z@]/.test(line) && line.includes(':')) {
            section = null; // autre en-tête, hors périmètre de ce codemod
        }
        if (
            (section === 'standalone' || section === 'cd') &&
            line.startsWith('  ')
        ) {
            files.add(line.trim());
        }
    }
    return [...files];
}

function stripFlags(content) {
    let next = content;
    next = next.replace(/[ \t]*standalone:\s*true,?\r?\n/g, '');
    next = next.replace(
        /[ \t]*changeDetection:\s*ChangeDetectionStrategy\.OnPush,?\r?\n/g,
        ''
    );

    // Occurrences totales de l'identifiant : 1 = seulement dans l'import
    // (donc devenu inutilisé après le retrait ci-dessus) ; >1 = encore
    // utilisé ailleurs (ex. un second composant dans le même fichier),
    // ne pas toucher l'import. Plus fiable qu'essayer de "retirer les
    // lignes d'import" pour détecter l'usage restant : un import nommé
    // multi-ligne (formaté par Prettier) n'a que sa première ligne
    // commençant littéralement par `import`, donc une regex par ligne le
    // ratait (bug trouvé en testant sur un fichier réel avant d'appliquer
    // aux 105).
    const occurrences = (next.match(/\bChangeDetectionStrategy\b/g) ?? [])
        .length;

    if (occurrences === 1) {
        next = next.replace(
            /(\bimport\s*\{[^}]*)\bChangeDetectionStrategy,?\s*/,
            (_m, before) => before
        );
        // Nettoyage des virgules orphelines laissées par le retrait ci-dessus.
        next = next.replace(/,(\s*\})/g, '$1');
        next = next.replace(/\{\s*,/g, '{');
    }

    return next;
}

const files = getViolatingFiles();
console.log(`Codemod : ${files.length} fichier(s) à traiter.`);

let touched = 0;
for (const rel of files) {
    const abs = join(ROOT, rel);
    const before = readFileSync(abs, 'utf8');
    const after = stripFlags(before);
    if (after !== before) {
        writeFileSync(abs, after);
        touched++;
    }
}

console.log(`Codemod : ${touched} fichier(s) modifié(s).`);
