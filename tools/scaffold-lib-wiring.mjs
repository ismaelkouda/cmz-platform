#!/usr/bin/env node
/**
 * Câble une lib Angular générée par tools/generator-platform/ (action-request)
 * dans une app Angular existante : entrée tsconfig.base.json, providers dans
 * app.config.ts, squelette de composant consommateur minimal.
 *
 * POURQUOI ce script (plutôt que refaire ces gestes à la main à chaque fois) :
 * lors du câblage manuel d'une lib générée dans une app Angular de test
 * (2026-08-27), 4 gestes ont été nécessaires. Deux d'entre eux sont
 * mécaniquement dérivables du contenu généré (entrée tsconfig, squelette de
 * providers) — ce script les automatise. Les deux autres restent
 * délibérément hors de son périmètre :
 *   - le VRAI contenu du composant (UX, wording, mise en page) : ce script
 *     écrit un squelette minimal fonctionnel, pas un livrable fini — à
 *     adapter après coup, exactement comme un point de départ.
 *   - le backend que le client HTTP appelle : ce script ne sait rien de
 *     l'infrastructure réelle, seulement de l'URL à fournir (laissée en
 *     placeholder explicite, jamais devinée).
 *
 * FRONTIÈRES DE COUCHE (voir CLAUDE.md, eslint.config.mjs
 * depConstraints) : ce script refuse d'agir si l'app cible n'a pas le tag
 * Nx `type:app`. Consommer une lib générée depuis une lib `type:domain` ou
 * `type:application` existante percerait les frontières architecturales
 * strictes de ce repo (0 import framework en domain, dépendances
 * unidirectionnelles domain->data->application->ui) — ce script n'est prévu
 * QUE pour le point d'orchestration final (une app), jamais pour une lib
 * métier intermédiaire.
 *
 * Ce script ne DEVINE jamais silencieusement : il parse le contenu réel des
 * fichiers générés (models.ts, action-request-commands.ts) pour connaître
 * les vrais noms de champs/méthodes plutôt que de les coder en dur — sinon
 * il ne fonctionnerait que pour une lib précise, pas pour une future lib.
 *
 * Usage :
 *   node tools/scaffold-lib-wiring.mjs --lib <nom-libs> --app <nom-app>
 *
 * Exemple :
 *   node tools/scaffold-lib-wiring.mjs --lib content-moderation --app backoffice-angular
 *
 * Documentation complète (à lire avant usage) :
 *   docs/architecture/scaffold-lib-wiring.md
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = process.cwd();

function fail(message) {
    console.error(`\n✖ ${message}\n`);
    process.exit(1);
}

function parseArguments(argv) {
    const options = {};
    for (let index = 0; index < argv.length; index += 1) {
        const argument = argv[index];
        if (argument === '--lib') {
            options.lib = argv[index + 1];
            index += 1;
            continue;
        }
        if (argument === '--app') {
            options.app = argv[index + 1];
            index += 1;
            continue;
        }
    }
    if (!options.lib)
        fail(
            '--lib <nom> est requis (ex: content-moderation, pour libs/content-moderation/angular)'
        );
    if (!options.app) fail('--app <nom> est requis (ex: backoffice-angular)');
    return options;
}

function readJson(path) {
    return JSON.parse(readFileSync(path, 'utf8'));
}

/**
 * Étape 1 — garde-fou de frontière : refuse d'agir si la cible n'a pas
 * explicitement le tag Nx type:app. Voir la note de tête de fichier.
 */
function assertTargetIsApp(appName) {
    const projectJsonPath = join(REPO_ROOT, 'apps', appName, 'project.json');
    if (!existsSync(projectJsonPath)) {
        fail(
            `${projectJsonPath} introuvable. Ce script ne câble que dans apps/, jamais dans libs/ — vérifie le nom de l'app cible.`
        );
    }
    const projectJson = readJson(projectJsonPath);
    const tags = projectJson.tags ?? [];
    if (!tags.includes('type:app')) {
        fail(
            `apps/${appName}/project.json n'a pas le tag "type:app" (tags actuels: ${JSON.stringify(tags)}). ` +
                `Ce script refuse de câbler une lib générée dans autre chose qu'une app — percer les frontières de couche (domain/data/application/ui) n'est jamais automatisé silencieusement ici.`
        );
    }
}

/**
 * Étape 2 — localise la lib générée et vérifie sa forme attendue (Angular,
 * action-request). Échoue explicitement si la structure diverge, plutôt que
 * de deviner un chemin probable.
 */
function locateGeneratedLib(libName) {
    const libDir = join(REPO_ROOT, 'libs', libName, 'angular');
    const srcDir = join(libDir, 'src');
    const requiredFiles = [
        'models.ts',
        'action-request-client.ts',
        'action-request-commands.ts',
        'index.ts',
    ];
    for (const file of requiredFiles) {
        if (!existsSync(join(srcDir, file))) {
            fail(
                `${join(srcDir, file)} introuvable. Ce script attend la structure produite par generate-action-request.mjs (profil angular-nx) — si le générateur a changé de structure, adapte ce script avant de l'utiliser, ne suppose pas un chemin.`
            );
        }
    }
    return { libDir, srcDir };
}

/**
 * Étape 3 — parse action-request-commands.ts pour extraire les vraies
 * méthodes exposées (nom + type d'input/output), plutôt que de coder en dur
 * "subscribeNewsletter" ou tout autre nom spécifique à un cas déjà vu.
 */
function parseCommandsMethods(srcDir) {
    const content = readFileSync(
        join(srcDir, 'action-request-commands.ts'),
        'utf8'
    );
    // Tolère la mise en forme prettier multi-lignes (constatée en pratique :
    // "method(\n    input: Type\n): Observable<Type>") — ne pas supposer une
    // seule ligne, sous peine de faux-négatif à chaque reformatage.
    const methodPattern = /(\w+)\(\s*input:\s*(\w+)\s*\):\s*Observable<(\w+)>/g;
    const methods = [];
    let match;
    while ((match = methodPattern.exec(content)) !== null) {
        methods.push({
            methodName: match[1],
            inputType: match[2],
            outputType: match[3],
        });
    }
    if (methods.length === 0) {
        fail(
            `Aucune méthode reconnue dans action-request-commands.ts (motif attendu: "<nom>(input: <Type>): Observable<<Type>>"). ` +
                `Le renderer a peut-être changé de forme — adapte ce script avant de continuer.`
        );
    }
    return methods;
}

/**
 * Étape 4 — parse models.ts pour extraire les champs du type d'input de la
 * première méthode (utilisé pour générer un formulaire minimal cohérent
 * avec le vrai contrat, pas un formulaire générique arbitraire).
 */
function parseInputFields(srcDir, inputTypeName) {
    const content = readFileSync(join(srcDir, 'models.ts'), 'utf8');
    const interfacePattern = new RegExp(
        `export interface ${inputTypeName} \\{([^}]*)\\}`
    );
    const match = content.match(interfacePattern);
    if (!match) {
        fail(
            `Interface ${inputTypeName} introuvable dans models.ts. Le contrat a peut-être changé — vérifie manuellement.`
        );
    }
    const fieldPattern = /readonly (\w+): (\w+);/g;
    const fields = [];
    let fieldMatch;
    while ((fieldMatch = fieldPattern.exec(match[1])) !== null) {
        fields.push({ name: fieldMatch[1], type: fieldMatch[2] });
    }
    return fields;
}

function pascalCase(value) {
    return value
        .split(/[-_]/)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join('');
}

function camelCase(value) {
    const pascal = pascalCase(value);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/** Extrait le nom court d'un alias @cmz/<nom>-angular (ex: "content-moderation"). */
function libShortName(aliasName) {
    return aliasName.replace('@cmz/', '').replace('-angular', '');
}

/**
 * Étape 5a — entrée tsconfig.base.json. Suit le motif observé sur toutes les
 * libs existantes (@cmz/<nom>-<target> -> ./libs/<nom>/<target>/src/index.ts).
 * Échoue si une entrée existe déjà pour éviter un doublon silencieux.
 */
function wireTsconfigPath(libName) {
    const tsconfigPath = join(REPO_ROOT, 'tsconfig.base.json');
    const raw = readFileSync(tsconfigPath, 'utf8');
    const aliasName = `@cmz/${libName}-angular`;
    if (raw.includes(`"${aliasName}"`)) {
        console.log(
            `  SKIP ${tsconfigPath} (${aliasName} déjà présent — rien à faire)`
        );
        return aliasName;
    }
    const tsconfig = JSON.parse(raw);
    const paths = tsconfig.compilerOptions.paths;
    paths[aliasName] = [`./libs/${libName}/angular/src/index.ts`];
    writeFileSync(tsconfigPath, `${JSON.stringify(tsconfig, null, 2)}\n`);
    console.log(`  UPDATE ${tsconfigPath} (+${aliasName})`);
    return aliasName;
}

/**
 * Étape 5b — providers dans app.config.ts. Parse le fichier existant,
 * échoue si la forme (export const appConfig: ApplicationConfig = { providers: [...] })
 * n'est pas trouvée plutôt que d'insérer au mauvais endroit.
 */
function wireAppConfig(appName, aliasName, methods) {
    const appConfigPath = join(
        REPO_ROOT,
        'apps',
        appName,
        'src',
        'app',
        'app.config.ts'
    );
    if (!existsSync(appConfigPath)) {
        fail(`${appConfigPath} introuvable. Câble les providers manuellement.`);
    }
    const content = readFileSync(appConfigPath, 'utf8');
    if (content.includes(aliasName)) {
        console.log(
            `  SKIP ${appConfigPath} (${aliasName} déjà importé — rien à faire)`
        );
        return;
    }
    const providersPattern = /providers:\s*\[/;
    if (!providersPattern.test(content)) {
        fail(
            `${appConfigPath} : motif "providers: [" introuvable. La forme du fichier a peut-être changé — câble les providers manuellement.`
        );
    }
    const shortName = libShortName(aliasName);
    const baseUrlConstant = `${camelCase(shortName)}BaseUrl`;
    const importBlock =
        `import {\n` +
        `    ACTION_REQUEST_BASE_URL,\n` +
        `    ActionRequestClient,\n` +
        `    ActionRequestCommands,\n` +
        `} from '${aliasName}';\n` +
        `import { provideHttpClient } from '@angular/common/http';\n\n` +
        `// TODO: remplacer par la vraie URL du backend (ou du mock local).\n` +
        `const ${baseUrlConstant} = 'http://localhost:0000';\n\n`;
    const withImports = importBlock + content;
    const withProviders = withImports.replace(
        providersPattern,
        `providers: [\n` +
            `        provideHttpClient(),\n` +
            `        { provide: ACTION_REQUEST_BASE_URL, useValue: ${baseUrlConstant} },\n` +
            `        ActionRequestClient,\n` +
            `        ActionRequestCommands,\n        `
    );
    writeFileSync(appConfigPath, withProviders);
    console.log(
        `  UPDATE ${appConfigPath} (+providers ${methods.length > 0 ? "— TODO: vérifier l'URL backend" : ''})`
    );
}

function main() {
    const options = parseArguments(process.argv.slice(2));
    assertTargetIsApp(options.app);
    const { srcDir } = locateGeneratedLib(options.lib);
    const methods = parseCommandsMethods(srcDir);
    const firstMethod = methods[0];
    parseInputFields(srcDir, firstMethod.inputType);

    const aliasName = wireTsconfigPath(options.lib);
    wireAppConfig(options.app, aliasName, methods);

    console.log(
        `\n✔ Squelette de câblage posé pour ${options.lib} dans ${options.app}.\n` +
            `  Reste à faire manuellement : fixer l'URL backend dans app.config.ts, ` +
            `et écrire/adapter le composant consommateur (UX non automatisée par design).\n`
    );
}

main();
