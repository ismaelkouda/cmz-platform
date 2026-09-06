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

const REPO_ROOT = process.cwd();

// Apps de référence connues à ce jour. Si une nouvelle app de référence est
// ajoutée (ex: une deuxième app React avec une config Tailwind différente),
// il faut décider explicitement laquelle fait autorité — voir resolveReference.
const ANGULAR_REFERENCES = ['backoffice-angular'];
// Aucune app React de référence dans le repo actuellement (newsletter/
// newsletter-test retirés). resolveReference() échoue explicitement si
// --reference react est demandé tant que cette liste reste vide — à
// repeupler dès qu'une app React est câblée avec Tailwind.
const REACT_REFERENCES = [];

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
        if (argument === '--tailwind-version') {
            options.tailwindVersion = argv[index + 1];
            index += 1;
            continue;
        }
    }
    if (!/^[a-z][a-z0-9-]*$/.test(options.app ?? '')) {
        fail('--app exige un nom kebab-case sûr');
    }
    if (!['angular', 'react'].includes(options.reference)) {
        fail('--reference doit être "angular" ou "react"');
    }
    if (
        !/^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?$/.test(
            options.tailwindVersion ?? ''
        )
    ) {
        fail('--tailwind-version exige une version SemVer exacte');
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
 * Étape 2 — anti-drift entre sources de référence candidates : si deux apps
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
 * Étape 3 — la version exacte vient de la piste de compatibilité déjà validée
 * par add-library. Le script ne reparcourt jamais bun.lock avec un regex et ne
 * résout rien lui-même.
 */
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
    const header = `/* Généré par tools/scaffold-tailwind.mjs depuis apps/${referenceName}/src/tailwind.css, tailwindcss@${tailwindVersion}. */\n`;
    return header + body;
}

/**
 * Étape 4a — câblage Angular : édite project.json en JSON réel (jamais de
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
 * Étape 4b — câblage React : ancre l'insertion sur le motif stable
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
    const reference = resolveReference(options.reference);
    const tailwindVersion = options.tailwindVersion;

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
