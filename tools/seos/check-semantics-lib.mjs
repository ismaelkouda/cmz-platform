/**
 * Helpers partagés de check-semantics (plafond 800 l. CI).
 * Extrait mécanique — comportement inchangé.
 */
import fs from 'fs';
import path from 'path';

export function readIfExists(p) {
    return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
}

export function findMatchingBracket(text, openIdx, openChar, closeChar) {
    let depth = 0;
    for (let i = openIdx; i < text.length; i++) {
        if (text[i] === openChar) depth++;
        else if (text[i] === closeChar) {
            depth--;
            if (depth === 0) return i;
        }
    }
    return -1;
}

export function extractMethodBody(source, methodName) {
    // trouve "methodName(" en debut de ligne/mot (pas un appel du style this.xxx.methodName)
    const re = new RegExp(`(?:^|\\s)${methodName}\\s*\\(`, 'm');
    const match = re.exec(source);
    if (!match) return null;
    const parenOpen = match.index + match[0].indexOf('(');
    const parenClose = findMatchingBracket(source, parenOpen, '(', ')');
    if (parenClose === -1) return null;
    const braceOpen = source.indexOf('{', parenClose);
    if (braceOpen === -1) return null;
    const braceClose = findMatchingBracket(source, braceOpen, '{', '}');
    if (braceClose === -1) return null;
    return source.slice(braceOpen, braceClose + 1);
}

export function extractUseCaseMethodNames(source) {
    // Toute methode publique d'un use-case de ce schema retourne Observable<...> —
    // heuristique generalisable sans AST : on matche la signature plutot qu'une
    // liste figee de noms ('create'/'update'), pour ne plus dependre du nom de la
    // methode (execute/delete/enable/disable/... doivent etre couverts pareil).
    const names = new Set();
    const re = /(\w+)\s*\([^()]*(?:\([^()]*\)[^()]*)*\)\s*:\s*Observable</g;
    let m;
    while ((m = re.exec(source)) !== null) {
        names.add(m[1]);
    }
    return [...names];
}

export function getNestedValue(obj, dottedKey) {
    return dottedKey
        .split('.')
        .reduce(
            (acc, k) => (acc && typeof acc === 'object' ? acc[k] : undefined),
            obj
        );
}

// Resolution d'alias tsconfig (@shared/, @presentation/, @pages/) vers un chemin fichier reel.
// Deplace ici (utilise a la fois par le check 1 et le check 3) — un import relatif (./ ou ../)
// n'est pas resolu, ce n'est pas necessaire pour les cas reels rencontres dans ce schema.
export const TS_PATH_ALIASES = [
    ['@shared/', 'shared/'],
    ['@presentation/', 'presentation/'],
    ['@pages/', 'presentation/pages/'],
];
export function resolveImportToFile(importPath, srcRootDir) {
    for (const [alias, real] of TS_PATH_ALIASES) {
        if (importPath.startsWith(alias)) {
            return (
                path.resolve(
                    srcRootDir,
                    real + importPath.slice(alias.length)
                ) + '.ts'
            );
        }
    }
    return null;
}

export function extractImportMap(source) {
    // nom local -> chemin d'import brut (ex: '@pages/.../home-enable.vo')
    const map = new Map();
    const importRe = /import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g;
    let m;
    while ((m = importRe.exec(source)) !== null) {
        const specifiers = m[1]
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
        for (const spec of specifiers) {
            const asMatch = /^(\w+)\s+as\s+(\w+)$/.exec(spec);
            if (asMatch) {
                map.set(asMatch[2], m[2]);
            } else if (/^\w+$/.test(spec)) {
                map.set(spec, m[2]);
            }
        }
    }
    return map;
}

export function extractCalledIdentifiers(body) {
    // identifiants suivis d'une parenthese d'appel, hors mots-cles JS/TS courants.
    const EXCLUDE = new Set([
        'if',
        'for',
        'while',
        'switch',
        'catch',
        'function',
        'return',
        'defer',
        'of',
        'throw',
        'new',
        'typeof',
        'this',
        'super',
        'in',
        'instanceof',
    ]);
    const names = new Set();
    const re = /\b([a-zA-Z_$][\w$]*)\s*\(/g;
    let m;
    while ((m = re.exec(body)) !== null) {
        if (!EXCLUDE.has(m[1])) names.add(m[1]);
    }
    return [...names];
}

// Est-ce que le fichier resolu (VO, validateur, ou toute fonction qu'il appelle a son tour,
// jusqu'a une profondeur limitee) contient un throw synchrone ? Utilise pour le check 1 :
// seule une methode de use-case qui appelle reellement une fonction capable de throw a
// besoin de defer() — un VO identite pur (ex: (dto) => dto) ne peut jamais throw, l'envelopper
// dans defer() ne corrige rien de reel et signaler cette absence serait un faux positif.
export function fileCanThrowSynchronously(
    absFilePath,
    srcRootDir,
    depth,
    seen
) {
    if (depth <= 0 || !absFilePath || seen.has(absFilePath)) return false;
    seen.add(absFilePath);
    const src = readIfExists(absFilePath);
    if (!src) return false;
    if (/\bthrow\s+new\s+\w+/.test(src)) return true;
    const importMap = extractImportMap(src);
    const called = extractCalledIdentifiers(src);
    for (const name of called) {
        const importPath = importMap.get(name);
        if (!importPath) continue;
        const resolved = resolveImportToFile(importPath, srcRootDir);
        if (
            resolved &&
            fileCanThrowSynchronously(resolved, srcRootDir, depth - 1, seen)
        ) {
            return true;
        }
    }
    return false;
}

export function findRepoRootMarker(mr, marker) {
    let dir = path.resolve(mr);
    for (let i = 0; i < 8; i++) {
        const candidate = path.join(dir, ...marker);
        if (fs.existsSync(candidate)) return candidate;
        const parent = path.dirname(dir);
        if (parent === dir) break;
        dir = parent;
    }
    return null;
}

export function walk(dir, out) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full, out);
        else if (entry.name.endsWith('.ts')) out.push(full);
    }
}
