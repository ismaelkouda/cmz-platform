#!/usr/bin/env node
/**
 * Câble Tailwind CSS dans une app Angular ou React existante, en dérivant la
 * configuration d'une app de référence déjà fonctionnelle dans ce repo —
 * plutôt que d'écrire des templates figés dans ce script.
 *
 * POURQUOI cette conception (lire des apps de référence vivantes, pas des
 * templates figés) : ni @nx/angular:application ni @nx/react:application
 * n'ont de support Tailwind natif aujourd'hui (vérifié manuellement,
 * 2026-08-27, Nx 23.1.0 / Tailwind 4.1.13). Si demain Nx intègre Tailwind
 * nativement, ou si Tailwind change de mécanisme de configuration (il l'a
 * déjà fait une fois : v3 → v4 a remplacé tailwind.config.js + directives
 * @tailwind par @import 'tailwindcss' + @theme en CSS), un template figé
 * dans ce script deviendrait invisiblement obsolète. En lisant la config
 * réelle d'une app de référence à chaque exécution, ce script reste
 * synchronisé avec la pratique réelle du repo — à condition que quelqu'un
 * maintienne les apps de référence à jour.
 *
 * Ce script ne DEVINE jamais silencieusement : chaque étape vérifie une
 * hypothèse explicite et s'arrête avec un message clair si elle est fausse,
 * plutôt que d'écrire un fichier probablement incorrect.
 *
 * Usage :
 *   node tools/scaffold-tailwind.mjs --app <nom-app> --reference angular|react
 *
 * Exemple :
 *   node tools/scaffold-tailwind.mjs --app my-new-app --reference angular
 *
 * Documentation complète (à lire avant usage) :
 *   docs/architecture/scaffold-tailwind-apps.md
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const REPO_ROOT = process.cwd();

// Apps de référence connues à ce jour. Si une nouvelle app de référence est
// ajoutée (ex: une deuxième app React avec une config Tailwind différente),
// il faut décider explicitement laquelle fait autorité — voir resolveReference.
const ANGULAR_REFERENCES = ['newsletter-test', 'backoffice-angular'];
const REACT_REFERENCES = ['newsletter'];

function fail(message) {
    console.error(`\n✖ ${message}\n`);
    process.exit(1);
}

function parseArguments(argv) {
    const options = {};
    for (let index = 0; index < argv.length; index += 1) {
        const argument = argv[index];
        if (argument === '--app') {
            options.app = argv[index + 1];
            index += 1;
            continue;
        }
        if (argument === '--reference') {
            options.reference = argv[index + 1];
            index += 1;
            continue;
        }
    }
    if (!options.app) fail('--app <nom-app> est requis');
    if (!['angular', 'react'].includes(options.reference)) {
        fail('--reference doit être "angular" ou "react"');
    }
    return options;
}

function readJsonFile(path) {
    return JSON.parse(readFileSync(path, 'utf8'));
}

/**
 * Étape 1 — vérifie qu'aucune config Tailwind (ancienne convention connue)
 * n'existe déjà pour éviter un écrasement silencieux. Ne détecte QUE la
 * convention .postcssrc.json connue de ce script — si Nx/Angular a un jour
 * un mécanisme natif différent, ce test ne le verra pas (voir étape 2).
 */
function assertNotAlreadyConfigured(appDir) {
    const postcssPath = join(appDir, '.postcssrc.json');
    if (existsSync(postcssPath)) {
        fail(
            `${postcssPath} existe déjà. Ce script ne réécrit jamais une config existante — supprime-la manuellement si tu veux régénérer, ou vérifie d'abord si la config actuelle fonctionne encore.`
        );
    }
}

/**
 * Étape 2 — le vrai garde-fou contre la dérive de conception : si Tailwind
 * est un jour supporté nativement par le tooling Nx/Angular/Vite, ou par une
 * nouvelle version de Tailwind qui ne nécessite plus ce mécanisme, une classe
 * Tailwind arbitraire pourrait déjà fonctionner SANS .postcssrc.json. Ce
 * script doit détecter ce cas et s'arrêter, plutôt que d'empiler une config
 * PostCSS redondante ou conflictuelle sur un mécanisme déjà actif.
 *
 * Test : on lance `nx build` sur l'app cible et on observe si ça passe déjà.
 * Ce n'est pas une preuve formelle que Tailwind est actif (l'app peut juste
 * ne pas encore utiliser de classe Tailwind) — c'est un signal best-effort.
 *
 * NOTE : ce test est best-effort. S'il échoue pour une raison inattendue
 * (app introuvable, build cassé pour une autre raison), on ne bloque pas le
 * scaffolding pour autant — on log un avertissement et on continue, car le
 * risque de faux négatif ici est plus faible que le risque de bloquer tout
 * usage légitime du script à cause d'un environnement de build instable.
 */
function warnIfTailwindAlreadyActive(app) {
    console.log(
        `→ Vérification : Tailwind est-il déjà actif nativement dans ${app} (sans notre config) ?`
    );
    try {
        execFileSync('npx', ['nx', 'build', app], {
            cwd: REPO_ROOT,
            stdio: 'pipe',
            timeout: 120_000,
        });
        console.log(
            `  build ${app} déjà vert avant toute modification — ce n'est pas une preuve suffisante que Tailwind est actif (l'app peut juste ne pas encore utiliser de classe Tailwind). Poursuite du scaffolding.`
        );
    } catch {
        console.log(
            `  build ${app} échoue ou app non encore buildable en l'état — normal pour une app fraîchement générée. Poursuite du scaffolding.`
        );
    }
}

/**
 * Étape 3 — anti-drift entre sources de référence candidates : si deux apps
 * de référence pour le même framework ont des .postcssrc.json différents,
 * ce script ne doit PAS choisir silencieusement l'une des deux. C'est un
 * signal que quelqu'un a fait évoluer une référence sans répercuter l'autre
 * — exactement le genre de divergence que ce repo traite ailleurs comme un
 * défaut de provenance (voir tools/generator-platform/fixtures/*.json).
 */
function resolveReference(referenceKind) {
    const candidates =
        referenceKind === 'angular' ? ANGULAR_REFERENCES : REACT_REFERENCES;
    const existing = candidates.filter((name) =>
        existsSync(join(REPO_ROOT, 'apps', name, '.postcssrc.json'))
    );
    if (existing.length === 0) {
        fail(
            `Aucune app de référence ${referenceKind} avec .postcssrc.json trouvée parmi [${candidates.join(', ')}]. Ce script ne sait pas d'où dériver la config — mets à jour la liste des références dans scaffold-tailwind.mjs, ou configure Tailwind manuellement une première fois.`
        );
    }
    const postcssContents = existing.map((name) => ({
        name,
        content: readFileSync(
            join(REPO_ROOT, 'apps', name, '.postcssrc.json'),
            'utf8'
        ),
    }));
    const [first, ...rest] = postcssContents;
    const diverging = rest.filter((entry) => entry.content !== first.content);
    if (diverging.length > 0) {
        fail(
            `Les apps de référence ${referenceKind} divergent sur .postcssrc.json : ${existing.join(', ')}. ` +
                `Ce script refuse de choisir arbitrairement une source — corrige la divergence entre ces apps d'abord, ou dis explicitement au script laquelle utiliser.`
        );
    }
    return { name: first.name, postcssContent: first.content };
}

/**
 * Étape 4 — traçabilité de version : on inscrit la version de tailwindcss
 * RÉELLEMENT résolue (pas le placeholder catalog) dans le fichier généré,
 * pour qu'un futur audit puisse détecter un décalage entre ce que ce script
 * a produit et la version effectivement utilisée au moment de l'exécution.
 *
 * NE PAS lire package.json seul : ce repo utilise les "catalogs" Bun
 * workspaces, où package.json contient littéralement la chaîne "catalog:"
 * plutôt qu'un numéro de version (vérifié 2026-08-27 — un premier essai de
 * ce script a produit "tailwindcss@catalog:" dans un fichier généré, un
 * défaut de traçabilité silencieux qu'un futur audit n'aurait pas pu
 * exploiter). La version réellement résolue vit dans bun.lock.
 */
function readInstalledTailwindVersion() {
    const packageJson = readJsonFile(join(REPO_ROOT, 'package.json'));
    const declared =
        packageJson.devDependencies?.tailwindcss ??
        packageJson.dependencies?.tailwindcss;
    if (!declared) {
        fail(
            'tailwindcss introuvable dans package.json (devDependencies/dependencies). Installe-le avant de lancer ce script.'
        );
    }
    if (declared !== 'catalog:') {
        // Cas simple : package.json contient déjà un numéro de version exploitable.
        return declared;
    }
    const lockPath = join(REPO_ROOT, 'bun.lock');
    if (!existsSync(lockPath)) {
        fail(
            `package.json déclare tailwindcss: "catalog:" (Bun workspaces catalog) mais bun.lock est introuvable pour résoudre la vraie version. Résous manuellement, ou adapte cette fonction si le mécanisme de lock a changé.`
        );
    }
    const lockContent = readFileSync(lockPath, 'utf8');
    // Le format bun.lock n'est pas garanti stable entre versions de Bun — on
    // cherche l'entrée du package racine, pas une dépendance transitive
    // d'un autre paquet qui pourrait epingler une version différente.
    const match = lockContent.match(
        /"tailwindcss":\s*\[\s*"tailwindcss@([\d.]+)"/
    );
    if (!match) {
        fail(
            `Impossible de résoudre la version réelle de tailwindcss depuis bun.lock (motif attendu introuvable — le format de bun.lock a peut-être changé). Corrige cette fonction avant de faire confiance à la traçabilité de version de ce script.`
        );
    }
    return match[1];
}

function deriveTailwindCss(referenceName, appName, tailwindVersion) {
    const referenceCssPath = join(
        REPO_ROOT,
        'apps',
        referenceName,
        'src',
        'tailwind.css'
    );
    if (!existsSync(referenceCssPath)) {
        fail(
            `${referenceCssPath} introuvable — l'app de référence ${referenceName} n'a pas le fichier tailwind.css attendu. Vérifie manuellement sa config avant de relancer.`
        );
    }
    const referenceCss = readFileSync(referenceCssPath, 'utf8');
    const referenceSourcePattern = `@source '../../../apps/${referenceName}/src';`;
    if (!referenceCss.includes(referenceSourcePattern)) {
        fail(
            `${referenceCssPath} ne contient pas le motif @source attendu ("${referenceSourcePattern}"). ` +
                `La convention a peut-être changé — inspecte le fichier manuellement et mets à jour ce script si besoin, plutôt que de générer un fichier probablement incorrect.`
        );
    }
    const generatedSourcePattern = `@source '../../../apps/${appName}/src';`;
    const body = referenceCss.replace(
        referenceSourcePattern,
        generatedSourcePattern
    );
    const header = `/* Généré par tools/scaffold-tailwind.mjs depuis apps/${referenceName}/src/tailwind.css, tailwindcss@${tailwindVersion}, ${new Date().toISOString().slice(0, 10)}. */\n`;
    return header + body;
}

/**
 * Étape 5a — câblage Angular : édite project.json en JSON réel (jamais de
 * remplacement texte fragile), échoue explicitement si la structure attendue
 * (targets.build.options.styles, un tableau) n'est pas trouvée.
 */
function wireAngular(appName) {
    const projectJsonPath = join(REPO_ROOT, 'apps', appName, 'project.json');
    if (!existsSync(projectJsonPath)) {
        fail(`${projectJsonPath} introuvable.`);
    }
    const projectJson = readJsonFile(projectJsonPath);
    const stylesArray = projectJson?.targets?.build?.options?.styles;
    if (!Array.isArray(stylesArray)) {
        fail(
            `${projectJsonPath} : targets.build.options.styles n'est pas un tableau (ou est absent). ` +
                `La forme du project.json généré par Nx a peut-être changé (ex: targets inférés plutôt qu'explicites, comme observé sur les apps React de ce repo) — ce script ne sait pas où insérer tailwind.css dans ce cas. Câble-le manuellement et signale la divergence.`
        );
    }
    const tailwindCssRelativePath = `apps/${appName}/src/tailwind.css`;
    if (stylesArray.includes(tailwindCssRelativePath)) {
        fail(
            `${tailwindCssRelativePath} est déjà référencé dans project.json — rien à faire.`
        );
    }
    stylesArray.unshift(tailwindCssRelativePath);
    writeFileSync(projectJsonPath, `${JSON.stringify(projectJson, null, 2)}\n`);
    console.log(
        `  UPDATE ${projectJsonPath} (styles: +${tailwindCssRelativePath})`
    );
}

/**
 * Étape 5b — câblage React : ancre l'insertion sur le motif stable
 * "import App from" (le composant racine, présent dans tout générateur
 * @nx/react:application observé à ce jour) plutôt que "le dernier import",
 * qui est sensible à l'ordre et peut varier selon les options du générateur
 * (ex: --useReactRouter change la forme du fichier — vécu concrètement dans
 * ce repo le 2026-08-27).
 */
function wireReact(appName) {
    const candidateEntryPoints = ['main.tsx', 'main.ts', 'main.jsx'].map(
        (name) => join(REPO_ROOT, 'apps', appName, 'src', name)
    );
    const entryPoint = candidateEntryPoints.find((path) => existsSync(path));
    if (!entryPoint) {
        fail(
            `Aucun point d'entrée trouvé parmi ${candidateEntryPoints.join(', ')}. Câble l'import manuellement.`
        );
    }
    const content = readFileSync(entryPoint, 'utf8');
    if (content.includes("import './tailwind.css'")) {
        fail(`${entryPoint} importe déjà tailwind.css — rien à faire.`);
    }
    const anchorPattern = /import App from ['"].*?['"];?/;
    const match = content.match(anchorPattern);
    if (!match) {
        fail(
            `${entryPoint} : motif "import App from ..." introuvable. La structure générée a peut-être changé — câble l'import manuellement et signale la divergence.`
        );
    }
    const updated = content.replace(
        match[0],
        `${match[0]}\nimport './tailwind.css';`
    );
    writeFileSync(entryPoint, updated);
    console.log(`  UPDATE ${entryPoint} (+ import './tailwind.css')`);
}

function main() {
    const options = parseArguments(process.argv.slice(2));
    const appDir = join(REPO_ROOT, 'apps', options.app);
    if (!existsSync(appDir)) {
        fail(
            `${appDir} introuvable. Génère l'app d'abord (nx g @nx/angular:application ou @nx/react:application).`
        );
    }

    assertNotAlreadyConfigured(appDir);
    warnIfTailwindAlreadyActive(options.app);

    const reference = resolveReference(options.reference);
    const tailwindVersion = readInstalledTailwindVersion();

    const postcssPath = join(appDir, '.postcssrc.json');
    writeFileSync(postcssPath, reference.postcssContent);
    console.log(`  CREATE ${postcssPath} (depuis apps/${reference.name})`);

    const tailwindCssPath = join(appDir, 'src', 'tailwind.css');
    const tailwindCssContent = deriveTailwindCss(
        reference.name,
        options.app,
        tailwindVersion
    );
    writeFileSync(tailwindCssPath, tailwindCssContent);
    console.log(`  CREATE ${tailwindCssPath} (depuis apps/${reference.name})`);

    if (options.reference === 'angular') {
        wireAngular(options.app);
    } else {
        wireReact(options.app);
    }

    console.log(
        `\n✔ Tailwind câblé pour ${options.app} (référence: ${reference.name}). Vérifie visuellement avant de committer : ajoute une classe Tailwind arbitraire, lance le serveur de dev, confirme qu'elle rend bien.\n`
    );
}

main();
