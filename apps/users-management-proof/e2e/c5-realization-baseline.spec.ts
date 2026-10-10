// Tests du support transitoire des oracles C5 : aucun navigateur, aucun
// serveur. Ils ne lisent jamais le vrai dossier de page, pour rester verts
// avant comme après la réalisation.
import { expect, test } from '@playwright/test';
import {
    chmodSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    readdirSync,
    rmSync,
    symlinkSync,
    writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
    LEGACY_PAGE_FINGERPRINT,
    classifyRealization,
    directoryFingerprint,
    type RealizationEnvironment,
} from './c5-realization-baseline.support';

const HERMETIC: RealizationEnvironment = { CI: 'true' };
const BASELINE = 'a'.repeat(64);

function tree(files: Record<string, string>): string {
    const root = mkdtempSync(join(tmpdir(), 'c5-baseline-'));
    for (const [path, content] of Object.entries(files)) {
        mkdirSync(join(root, path, '..'), { recursive: true });
        writeFileSync(join(root, path), content);
    }
    return root;
}

function classify(env: RealizationEnvironment, fingerprint = BASELINE): string {
    return classifyRealization({ fingerprint, baseline: BASELINE, env }).mode;
}

test.describe('empreinte du dossier de page', () => {
    const roots: string[] = [];
    const page = (files: Record<string, string>): string => {
        const root = tree(files);
        roots.push(root);
        return root;
    };
    const REFERENCE = { 'page.ts': 'export {};\n', 'page.html': '<p></p>\n' };

    test.afterAll(() => {
        for (const root of roots)
            rmSync(root, { recursive: true, force: true });
    });

    test('est stable, indépendante de l’ordre de création et épinglée', () => {
        const forward = page(REFERENCE);
        const backward = page({
            'page.html': '<p></p>\n',
            'page.ts': 'export {};\n',
        });
        expect(directoryFingerprint(forward)).toBe(
            directoryFingerprint(backward)
        );
        // Valeur recalculable à la main : sha256 des deux lignes
        // `chemin\0file\0-\0taille\0sha256(contenu)` jointes par `\n`.
        expect(directoryFingerprint(forward)).toBe(
            'a774de094c0bf8449856cd45749b2c614a633d598f4f627add8449d2abe02455'
        );
    });

    test('change pour un octet modifié, un fichier créé ou supprimé', () => {
        const reference = directoryFingerprint(page(REFERENCE));
        const variants = {
            'octet modifié': { ...REFERENCE, 'page.ts': 'export {} ;\n' },
            'octet ajouté': { ...REFERENCE, 'page.html': '<p></p>\n\n' },
            'fichier créé': { ...REFERENCE, 'page.scss': '' },
            'fichier supprimé': { 'page.ts': 'export {};\n' },
            'fichier renommé': {
                'page.ts': 'export {};\n',
                'page.htm': '<p></p>\n',
            },
            'contenus échangés': {
                'page.ts': '<p></p>\n',
                'page.html': 'export {};\n',
            },
            'fichier déplacé dans un sous-dossier': {
                'page.ts': 'export {};\n',
                'part/page.html': '<p></p>\n',
            },
        };
        for (const [name, files] of Object.entries(variants))
            expect(directoryFingerprint(page(files)), name).not.toBe(reference);
    });

    test('parcourt les sous-dossiers et trie tout l’inventaire, pas chaque dossier', () => {
        // Parcours : `a`, `a/x.ts`, `a-b.ts`. Tri global : `a`, `a-b.ts`,
        // `a/x.ts`. Valeur recalculée hors du support, sur l'ordre trié.
        const nested = { 'a/x.ts': 'x\n', 'a-b.ts': 'y\n' };
        expect(directoryFingerprint(page(nested))).toBe(
            'ffa6ee6bcad6a1ba2e1b145cc490b5b0e25d02368381bfbd3a53e37c50e14025'
        );
        expect(
            directoryFingerprint(page({ ...nested, 'a/x.ts': 'z\n' }))
        ).not.toBe(directoryFingerprint(page(nested)));
    });

    test('change pour un sous-dossier vide, un bit exécutable ou un lien', () => {
        const reference = directoryFingerprint(page(REFERENCE));

        const withDirectory = page(REFERENCE);
        mkdirSync(join(withDirectory, 'empty'));
        expect(directoryFingerprint(withDirectory)).not.toBe(reference);

        const executable = page(REFERENCE);
        chmodSync(join(executable, 'page.ts'), 0o755);
        expect(directoryFingerprint(executable)).not.toBe(reference);

        // Un lien vers un fichier de même contenu n'est pas ce fichier : la
        // cible n'est pas suivie.
        const linked = page({ 'page.ts': 'export {};\n' });
        const elsewhere = page({ 'page.html': '<p></p>\n' });
        symlinkSync(join(elsewhere, 'page.html'), join(linked, 'page.html'));
        expect(readFileSync(join(linked, 'page.html'), 'utf8')).toBe(
            '<p></p>\n'
        );
        expect(directoryFingerprint(linked)).not.toBe(reference);
    });

    test('un lien vaut par le texte de sa cible, jamais par ce qu’elle contient', () => {
        const elsewhere = page({
            'first.html': '<p></p>\n',
            'second.html': '<p></p>\n',
        });
        const linked = page({ 'page.ts': 'export {};\n' });
        const link = join(linked, 'page.html');
        symlinkSync(join(elsewhere, 'first.html'), link);
        const reference = directoryFingerprint(linked);

        // Ignoré : les octets de la cible, hors du dossier, peuvent changer.
        writeFileSync(join(elsewhere, 'first.html'), '<p>modifié</p>\n');
        expect(directoryFingerprint(linked)).toBe(reference);

        // Fait identité : le texte de la cible, même vers un contenu identique.
        rmSync(link);
        symlinkSync(join(elsewhere, 'second.html'), link);
        expect(readFileSync(link, 'utf8')).toBe('<p></p>\n');
        expect(directoryFingerprint(linked)).not.toBe(reference);

        // Un lien cassé reste inventorié, sans erreur de lecture.
        rmSync(join(elsewhere, 'second.html'));
        expect(() => directoryFingerprint(linked)).not.toThrow();
    });
});

test.describe('classification du run', () => {
    test('n’est legacy que sur le baseline exact, en run hermétique', () => {
        expect(
            classifyRealization({
                fingerprint: BASELINE,
                baseline: BASELINE,
                env: HERMETIC,
            })
        ).toEqual({
            mode: 'legacy',
            reason: 'dossier de page identique au baseline',
        });
        expect(classify(HERMETIC, 'b'.repeat(64))).toBe('strict');
    });

    test('durcit hors run hermétique', () => {
        const nonHermetic: Record<string, RealizationEnvironment> = {
            'CI absent': {},
            'CI vide': { CI: '' },
            'serveur externe': {
                ...HERMETIC,
                PLAYWRIGHT_BASE_URL: 'http://127.0.0.1:4300',
            },
            'build sautée': { ...HERMETIC, E2E_SKIP_BUILD: '1' },
            'strict demandé': { ...HERMETIC, C5_ORACLES_STRICT: '1' },
        };
        for (const [name, env] of Object.entries(nonHermetic))
            expect(classify(env), name).toBe('strict');
    });

    test('aucune variable ne relâche un dossier modifié', () => {
        const relaxing: RealizationEnvironment[] = [
            HERMETIC,
            { ...HERMETIC, C5_ORACLES_STRICT: '0' },
            { ...HERMETIC, C5_ORACLES_STRICT: 'false' },
            { ...HERMETIC, C5_ORACLES_STRICT: 'legacy' },
            { ...HERMETIC, E2E_SKIP_BUILD: '0' },
            { ...HERMETIC, PLAYWRIGHT_BASE_URL: '' },
        ];
        for (const env of relaxing)
            expect(classify(env, 'b'.repeat(64)), JSON.stringify(env)).toBe(
                'strict'
            );
        // Les mêmes valeurs ne durcissent pas non plus à tort le baseline.
        for (const env of relaxing)
            expect(classify(env), JSON.stringify(env)).toBe('legacy');
    });
});

test('le baseline versionné est une empreinte SHA-256', () => {
    expect(LEGACY_PAGE_FINGERPRINT).toMatch(/^[a-f0-9]{64}$/);
});

// Garde de dérive lisible, pas une frontière : la frontière est que ces
// specs sont fusionnées avant le work order, donc hors de son allowlist.
test('aucune spec n’appelle test.fail hors du support transitoire', () => {
    const offenders = readdirSync(__dirname)
        .filter(
            (file) =>
                file.endsWith('.ts') &&
                file !== 'c5-realization-baseline.support.ts' &&
                file !== 'c5-realization-baseline.spec.ts'
        )
        .filter((file) =>
            /\btest\s*\.\s*fail\b/.test(
                readFileSync(join(__dirname, file), 'utf8')
            )
        );
    expect(offenders).toEqual([]);
});
