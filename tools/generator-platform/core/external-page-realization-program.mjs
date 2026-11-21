// X4-sécurité 2 : programme TypeScript de la page réalisée, vérifié dans
// l'atelier avec les vraies bibliothèques du produit (lib ES et DOM du
// `typescript` installé, types d'Angular et de rxjs) sous le tsconfig de
// l'application. Les listes de symboles sont revues contre des versions
// précises : une autre version impose une nouvelle revue (A.7).
import { readFileSync, realpathSync, statSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

export const REVIEWED_VERSIONS = Object.freeze({
    typescript: '6.0.3',
    '@angular/common': '22.2.4',
    '@angular/core': '22.2.4',
    '@angular/router': '22.2.4',
    rxjs: '7.8.2',
});

// Fichiers des paquets installés et de la lib : lus une fois par version de
// fichier. Le brouillon de la page et les sources du produit sont relus.
const cache = new Map();
let previous;

function installedVersion(productRoot, name) {
    try {
        return JSON.parse(
            readFileSync(
                join(productRoot, 'node_modules', name, 'package.json'),
                'utf8'
            )
        ).version;
    } catch {
        return undefined;
    }
}

export function typeEnvironmentViolations(productRoot) {
    const violations = [];
    if (ts.version !== REVIEWED_VERSIONS.typescript)
        violations.push(
            `type environment differs from the reviewed versions: workshop typescript ${ts.version}`
        );
    for (const [name, version] of Object.entries(REVIEWED_VERSIONS)) {
        const installed = installedVersion(productRoot, name);
        if (installed !== version)
            violations.push(
                `type environment differs from the reviewed versions: ${name} ${installed ?? 'absent'} (reviewed ${version})`
            );
    }
    return violations;
}

// Programme de la seule page ; ce qu'elle importe est résolu dans le produit.
export function pageProgram({ productRoot, appRoot, pagePath, text }) {
    const parsed = ts.getParsedCommandLineOfConfigFile(
        join(appRoot, 'tsconfig.app.json'),
        {},
        {
            ...ts.sys,
            onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
                throw new Error(
                    `application tsconfig is unreadable: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')}`
                );
            },
        }
    );
    const options = { ...parsed.options, noEmit: true };
    const libraries = realpathSync(
        join(productRoot, 'node_modules', 'typescript', 'lib')
    );
    const host = ts.createCompilerHost(options, true);
    const read = host.getSourceFile;
    host.getDefaultLibLocation = () => libraries;
    host.getDefaultLibFileName = (settings) =>
        join(libraries, ts.getDefaultLibFileName(settings));
    host.fileExists = (path) => path === pagePath || ts.sys.fileExists(path);
    host.readFile = (path) =>
        path === pagePath ? text : ts.sys.readFile(path);
    host.getSourceFile = (path, language, onError) => {
        if (path === pagePath)
            return ts.createSourceFile(path, text, language, true);
        if (!/[\\/]node_modules[\\/]/.test(path))
            return read.call(host, path, language, onError);
        const key = `${path}\n${JSON.stringify(language)}`;
        const stamp = statSync(path, { throwIfNoEntry: false })?.mtimeMs;
        const hit = cache.get(key);
        if (hit && hit.stamp === stamp) return hit.file;
        const file = read.call(host, path, language, onError);
        cache.set(key, { stamp, file });
        return file;
    };
    const program = ts.createProgram({
        rootNames: [pagePath],
        options,
        host,
        oldProgram: previous,
    });
    previous = program;
    return {
        program,
        checker: program.getTypeChecker(),
        file: program.getSourceFile(pagePath),
    };
}
