// Support TRANSITOIRE des oracles C5 — retiré par le lot qui suit la
// réalisation de la page (ORC2).
//
// Les oracles de ce dossier décrivent l'interface attendue avant qu'elle soit
// réalisée. Tant que le dossier de la page est, octet pour octet, celui
// d'avant la réalisation, leurs tests sont des échecs ATTENDUS : ils
// s'exécutent, doivent échouer réellement, et la suite reste verte. Dès qu'un
// octet de ce dossier change, ils deviennent stricts, tous ensemble.
//
// La condition ne lit jamais l'interface rendue : une réalisation partielle
// pourrait conserver un marqueur visuel choisi. Elle compare le contenu du
// dossier de page à une empreinte mesurée sur `main`.
//
// Elle exige aussi que Playwright serve une build de cet arbre. Hors d'un run
// hermétique (`CI` actif, pas de `PLAYWRIGHT_BASE_URL`, build non sautée), le
// mode est strict : EN LOCAL SANS `CI=1`, CES ORACLES SONT ROUGES TANT QUE LA
// PAGE N'EST PAS RÉALISÉE. C'est voulu ; ne pas « réparer » ce rouge.
//
// Aucune variable ne peut relâcher le mode. `C5_ORACLES_STRICT=1` le durcit.
import { test } from '@playwright/test';
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, readdirSync, readlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';

export const PAGE_DIRECTORY = resolve(
    __dirname,
    '../src/app/pages/page_6666666666666666'
);

// Mesurée sur main@d6845764 : 9 fichiers, aucun exécutable, aucun lien.
// Témoin de revue : l'arbre Git du même dossier y vaut ab6a5afd. Git dit ce
// qui est commité, pas ce qui est sur le disque : seule l'empreinte fait foi.
export const LEGACY_PAGE_FINGERPRINT =
    '2b61fa448f97ae0f138520449bb7b7ab1f79cb98bb28e0b76e5d337e0358e5a7';

function sha256(content: Buffer | string): string {
    return createHash('sha256').update(content).digest('hex');
}

function inventory(root: string, relative = ''): string[] {
    return readdirSync(join(root, relative)).flatMap((name) => {
        const path = relative ? `${relative}/${name}` : name;
        const absolute = join(root, path);
        const stat = lstatSync(absolute);
        if (stat.isDirectory())
            return [[path, 'directory'].join('\0'), ...inventory(root, path)];
        if (stat.isSymbolicLink()) {
            // La cible n'est jamais suivie : son texte est l'identité du lien.
            const target = readlinkSync(absolute, { encoding: 'buffer' });
            return [
                [path, 'symlink', '-', target.byteLength, sha256(target)].join(
                    '\0'
                ),
            ];
        }
        if (!stat.isFile()) return [[path, 'other'].join('\0')];
        const content = readFileSync(absolute);
        const executable = (stat.mode & 0o111) !== 0 ? 'x' : '-';
        return [
            [
                path,
                'file',
                executable,
                content.byteLength,
                sha256(content),
            ].join('\0'),
        ];
    });
}

/** Empreinte canonique d'un dossier : chemins, types, bit exécutable, octets. */
export function directoryFingerprint(root: string): string {
    const entries = inventory(root).sort((left, right) =>
        left < right ? -1 : left > right ? 1 : 0
    );
    return sha256(entries.join('\n'));
}

export interface RealizationEnvironment {
    CI?: string;
    PLAYWRIGHT_BASE_URL?: string;
    E2E_SKIP_BUILD?: string;
    C5_ORACLES_STRICT?: string;
}

export interface RealizationClassification {
    mode: 'legacy' | 'strict';
    reason: string;
}

/**
 * Fonction pure : `legacy` seulement si le dossier est exactement celui
 * d'avant la réalisation ET si le run sert une build de cet arbre. Chaque
 * autre cas est strict. Aucune entrée ne force `legacy`.
 */
export function classifyRealization({
    fingerprint,
    baseline,
    env,
}: {
    fingerprint: string;
    baseline: string;
    env: RealizationEnvironment;
}): RealizationClassification {
    if (env.C5_ORACLES_STRICT === '1')
        return { mode: 'strict', reason: 'C5_ORACLES_STRICT=1' };
    if (fingerprint !== baseline)
        return {
            mode: 'strict',
            reason: 'le dossier de page diffère du baseline',
        };
    // Mêmes lectures que playwright.config.mjs : sans `CI`, un serveur déjà
    // lancé depuis un autre arbre peut être réutilisé.
    if (!env.CI)
        return { mode: 'strict', reason: 'run non hermétique : CI absent' };
    if (env.PLAYWRIGHT_BASE_URL)
        return {
            mode: 'strict',
            reason: 'run non hermétique : PLAYWRIGHT_BASE_URL fourni',
        };
    if (env.E2E_SKIP_BUILD === '1')
        return {
            mode: 'strict',
            reason: 'run non hermétique : build sautée',
        };
    return { mode: 'legacy', reason: 'dossier de page identique au baseline' };
}

const realization = classifyRealization({
    fingerprint: directoryFingerprint(PAGE_DIRECTORY),
    baseline: LEGACY_PAGE_FINGERPRINT,
    env: process.env,
});

/**
 * Seul point d'entrée des échecs attendus C5. N'ajoute aucune assertion : en
 * mode `legacy`, le test doit échouer par ses propres assertions.
 */
export function expectFailureWhileLegacy(reason: string): void {
    test.fail(realization.mode === 'legacy', reason);
}
