#!/usr/bin/env node
/**
 * SEOS — Semantic validation engine ("Etape 2", zero IA).
 *
 * check-pattern.js verifie la PRESENCE des fichiers du coeur canonique (fait structurel).
 * Ce script verifie le CONTENU de certains de ces fichiers contre des regles mecaniques
 * derivees de bugs REELS trouves manuellement dans administrative-infrastructure au cours
 * de cette session (voir SEOS-Assumptions-Register.md, Experience 008/010/012/018/019).
 * Chaque regle ci-dessous a deja attrape au moins un bug reel, soit avant l'ecriture de
 * l'outil (trouve a la main), soit par l'outil lui-meme une fois ecrit.
 *
 * 9 verifications :
 *   1. defer() — TOUTE methode du use-case qui appelle this.repository.xxx(...) doit
 *      envelopper cet appel dans rxjs defer(), sinon un throw synchrone du validateur
 *      de domaine ne remonte jamais au pipeline d'erreur (bug trouve et corrige
 *      Experience 008/012, puis retrouve sur execute()/delete()/enable()/disable() —
 *      pas seulement create()/update() — dans administrative-infrastructure lui-meme,
 *      Experience 028 : la regle ne testait a l'origine que create()/update(), ce qui
 *      a laisse passer le bug sans le detecter. Generalisee a toute methode dont la
 *      signature retourne Observable<...>, plutot qu'a une liste figee de noms.
 *   2. i18n — chaque cle passee a une erreur de validateur de domaine doit exister dans
 *      fr.json (bug trouve et corrige Experience 008/012 : GenericRequiredError silencieux).
 *   3. UiFeedbackService — chaque classe qui etend DomainError doit avoir un handler
 *      enregistre dans registerDefaultHandlers(), sinon l'erreur, meme si elle atteint le
 *      pipeline, ne produit aucun retour utilisateur (meme bug qu'au point 2, cause differente).
 *   4. Validators.required vs validateur de domaine — les champs marques Validators.required
 *      dans le formulaire Angular (presentation/store/{ENTITY}/{ENTITY}-form.store.ts)
 *      doivent correspondre exactement aux champs verifies par {ENTITY}-create.validator.ts
 *      ET {ENTITY}-update.validator.ts (uniqId tolere en plus sur update, jamais requis par
 *      un formulaire). Critere mecanique donne explicitement par l'architecte (Expérience 011).
 *      Bug reel trouve par cet outil sur infrastructure/infrastructure-type (Expérience 018) :
 *      name/type requis par le validateur mais pas par le formulaire.
 *   5. Artefacts orphelins — chaque classe exportee dans application/commands/{ENTITY}/*.ts,
 *      application/dto/{ENTITY}/*.ts et domain/entities/{ENTITY}/*.ts doit etre referencee au
 *      moins une fois ailleurs que dans son propre fichier. Generalise la detection manuelle
 *      de code mort deja faite 3 fois cette session (responsibilities-select x2, stubs
 *      enable/disable d'infrastructure — Experience 012/016).
 *   6. Cérémonie VO/Entity — un fichier domain/entities/{ENTITY}/{ENTITY}-{create,update,
 *      delete,filter}.entity.ts qui ne fait qu'envelopper des donnees deja valides (aucune
 *      transformation reelle au-dela d'un simple passthrough) est un candidat a la
 *      suppression, meme regle que la decision explicite de l'architecte en Experience 007/010.
 *   7. Nommage {ENTITY}-select-response-api.dto.ts — quand une entite a un repository select
 *      (domain/repositories/{ENTITY}/{ENTITY}-select.repository.ts existe), le DTO d'API
 *      correspondant doit s'appeler {ENTITY}-select-response-api.dto.ts (convention du schema
 *      crud-entity.pattern.json, core_files), pas {ENTITY}-select-api.dto.ts (sans "-response").
 *      Bug reel trouve Experience 029 : infrastructure-type portait exactement le meme contenu
 *      (ItemApiDto + ResponseApiDto) que son jumeau infrastructure-select-response-api.dto.ts,
 *      mais dans un fichier mal nomme — invisible pour check-pattern.js (qui l'aurait signale
 *      comme "manquant" sans expliquer pourquoi), rendu explicite ici.
 *   8. Chainage VO -> Entity — genéralise design_decisions_v7 (crud-entity.pattern.json) a
 *      TOUTE methode de use-case, pas seulement filter : le VO est toujours une fonction
 *      presente ; l'Entity correspondante (domain/entities/{ENTITY}/{ENTITY}-{op}.entity.ts)
 *      ne doit exister QUE si elle contient une transformation reelle (deja verifie par la
 *      regle 6, cote "cette entity devrait etre supprimee"). Cette regle-ci verifie le sens
 *      inverse : si cette entity existe ET contient une vraie regle metier (logique
 *      conditionnelle detectee), la methode de use-case qui appelle le VO correspondant doit
 *      AUSSI appeler la fonction Entity (meme modele que infrastructureFilterVo() puis
 *      infrastructureFilterEntity()) — sinon la regle metier est ecrite mais jamais executee,
 *      un bug silencieux qu'aucune erreur tsc/eslint ne peut reveler (le fichier compile, il
 *      est juste orphelin d'appel).
 *   9. Residus console.log/debug/warn — toute methode ou classe scopee a cette entite (fichiers
 *      dont un segment de chemin egale exactement le nom de l'entite) ne doit contenir aucun
 *      appel console.log/console.debug/console.warn. Bug reel trouve et corrige Experience 028 :
 *      infrastructure-form.store.ts portait un effect() entier dont le seul contenu etait un
 *      console.log, infrastructure-form.component.ts un console.log juste avant un if qui gerait
 *      deja le cas — aucun des deux n'avait ete detecte par tsc/eslint (ce ne sont pas des
 *      erreurs de compilation ni de lint par defaut), seule une relecture manuelle les avait
 *      trouves. Regle volontairement stricte : console.error exclu (peut etre une strategie de
 *      logging legitime), console.log/debug/warn exclus sans exception.
 *
 * Usage :
 *   node check-semantics.js <chemin-du-module> <nom-entite>
 *
 * Exemple :
 *   node check-semantics.js src/presentation/pages/administrative-infrastructure infrastructure
 *
 * Limite explicite (meme discipline que check-pattern.js) : ce script ne verifie que ce que
 * ses 6 regles couvrent, par analyse textuelle simple (regex + comptage de parentheses et
 * accolades equilibrees), pas d'AST complet, pas d'IA. Un resultat "OK" ne garantit pas
 * l'absence d'autre bug semantique — seulement l'absence des classes de bugs deja observees
 * et documentees. La regle 5 et 6 en particulier sont des heuristiques : elles signalent des
 * CANDIDATS a verifier a la main, pas des verdicts automatiques (meme prudence que le "NON
 * PROMU" de domain_validators_assertion_pattern dans crud-entity.pattern.json).
 */

import fs from 'fs';
import path from 'path';
import {
    readIfExists,
    findMatchingBracket,
    extractMethodBody,
    extractUseCaseMethodNames,
    getNestedValue,
    TS_PATH_ALIASES,
    resolveImportToFile,
    extractImportMap,
    extractCalledIdentifiers,
    fileCanThrowSynchronously,
    findRepoRootMarker,
    walk,
} from './check-semantics-lib.mjs';

const [, , moduleRoot, entityName] = process.argv;

if (!moduleRoot || !entityName) {
    console.error(
        'Usage: node check-semantics.js <chemin-du-module> <nom-entite>'
    );
    process.exit(1);
}

if (!fs.existsSync(moduleRoot)) {
    console.error(
        `Erreur : le chemin "${moduleRoot}" n'existe pas depuis le dossier courant (${process.cwd()}).`
    );
    process.exit(2);
}

const srcRoot = findRepoRootMarker(moduleRoot, ['src']);
const allTsFiles = [];
if (srcRoot) walk(srcRoot, allTsFiles);

const findings = {
    defer: [],
    i18n: [],
    uiFeedback: [],
    requiredMismatch: [],
    orphaned: [],
    ceremony: [],
    selectNaming: [],
    voEntityChain: [],
    debugResidue: [],
};

// ---------- Check 1 : defer() sur TOUTE methode de TOUT use-case de cette entite ----------
// Ne se limite plus a {entityName}.use-case.ts : un meme bug a ete retrouve sur des fichiers
// use-case satellites (ex: {entityName}-find-one.use-case.ts) qui portent leur propre classe
// avec leur propre appel this.repository.xxx() — Experience 028.
const useCasesDir = path.join(
    moduleRoot,
    'application',
    'use-cases',
    entityName
);
if (!fs.existsSync(useCasesDir)) {
    findings.defer.push(
        `Dossier absent (${useCasesDir}) — verification impossible.`
    );
} else {
    const useCaseFiles = fs
        .readdirSync(useCasesDir)
        .filter((f) => f.endsWith('.use-case.ts'));
    if (useCaseFiles.length === 0) {
        findings.defer.push(
            `Aucun fichier *.use-case.ts trouve dans ${useCasesDir}.`
        );
    }
    for (const file of useCaseFiles) {
        const useCasePath = path.join(useCasesDir, file);
        const useCaseSrc = readIfExists(useCasePath);
        const methodNames = extractUseCaseMethodNames(useCaseSrc);
        if (methodNames.length === 0) {
            findings.defer.push(
                `${file} : aucune methode retournant Observable<...> detectee — verification impossible (heuristique de signature en echec, a verifier a la main).`
            );
            continue;
        }
        const useCaseImportMap = extractImportMap(useCaseSrc);
        for (const method of methodNames) {
            const body = extractMethodBody(useCaseSrc, method);
            if (body === null) continue;
            const callsRepository = /this\.repository\.\w+\s*\(/.test(body);
            if (!callsRepository) continue;
            const usesDefer = /\bdefer\s*\(/.test(body);
            if (usesDefer) continue;

            // Ne signaler que si une fonction reellement appelee dans le corps de la
            // methode (typiquement un xxxVo(...) passe en argument au repository) peut
            // throw synchrone — sinon defer() ne corrigerait rien de reel et le signaler
            // serait un faux positif (ex: un VO identite pur (dto) => dto, ou un readAll()
            // qui ne valide rien). Verifie a une profondeur de 3 appels imbriques.
            const calledInBody = extractCalledIdentifiers(body);
            let riskyCall = null;
            for (const name of calledInBody) {
                if (name === method) continue; // recursion triviale, ignorer
                const importPath = useCaseImportMap.get(name);
                if (!importPath) continue;
                const resolved = resolveImportToFile(
                    importPath,
                    srcRoot || '.'
                );
                if (
                    resolved &&
                    fileCanThrowSynchronously(
                        resolved,
                        srcRoot || '.',
                        3,
                        new Set()
                    )
                ) {
                    riskyCall = name;
                    break;
                }
            }
            if (riskyCall) {
                findings.defer.push(
                    `${file} : ${method}() appelle this.repository.xxx(...) SANS l'envelopper dans defer(), alors que "${riskyCall}(...)" (appele dans le corps de la methode) peut lever une exception synchrone — ce throw ne remontera jamais au pipeline d'erreur RxJS (meme bug qu'Experience 008/012, retrouve Experience 028).`
                );
            }
        }
    }
}

// ---------- Check 2 : cles i18n des validateurs presentes dans fr.json ----------
const frJsonPath = findRepoRootMarker(moduleRoot, [
    'src',
    'assets',
    'i18n',
    'fr.json',
]);
const frJson = frJsonPath
    ? JSON.parse(fs.readFileSync(frJsonPath, 'utf8'))
    : null;

const validatorsDir = path.join(moduleRoot, 'domain', 'validators', entityName);
if (fs.existsSync(validatorsDir)) {
    const validatorFiles = fs
        .readdirSync(validatorsDir)
        .filter((f) => f.endsWith('.validator.ts'));
    for (const file of validatorFiles) {
        const src = fs.readFileSync(path.join(validatorsDir, file), 'utf8');
        const re = /new\s+\w*Error\s*\(\s*['"]([^'"]+)['"]/g;
        let m;
        while ((m = re.exec(src)) !== null) {
            const key = m[1];
            if (!frJson) {
                findings.i18n.push(
                    `${file} : cle "${key}" — impossible de verifier, fr.json introuvable.`
                );
                continue;
            }
            if (getNestedValue(frJson, key) === undefined) {
                findings.i18n.push(
                    `${file} : cle "${key}" absente de fr.json.`
                );
            }
        }
    }
} else {
    findings.i18n.push(
        `Dossier absent (${validatorsDir}) — verification impossible.`
    );
}

// ---------- Check 3 : DomainError -> handler enregistre dans UiFeedbackService (app-wide) ----------
// Identite = (fichier reel, nom exporte), pas juste le nom : plusieurs classes distinctes
// partagent le meme nom (ex: 5 x "ContractRequiredError" dans report-states) et sont
// enregistrees sous un alias local dans ui-feedback.service.ts (import { X as Y }).
// Une comparaison par nom seul produit de faux positifs sur ces alias — corrige ici en
// resolvant chaque alias jusqu'a son fichier source reel via les chemins tsconfig.
// (TS_PATH_ALIASES / resolveImportToFile sont definis plus haut, partages avec le check 1.)

if (srcRoot) {
    // (fichier resolu absolu) -> Set(noms exportes qui etendent DomainError dans ce fichier)
    const domainErrorsByFile = new Map();
    for (const f of allTsFiles) {
        // Guard TOCTOU : allTsFiles est une photo prise au debut du script (walk()) ; si un
        // fichier est renomme/supprime pendant l'execution (edition concurrente ailleurs dans
        // le depot, deja observe en pratique), on l'ignore silencieusement plutot que de planter.
        const src = readIfExists(f);
        if (src === null) continue;
        const re = /export class (\w+) extends DomainError/g;
        let m;
        while ((m = re.exec(src)) !== null) {
            const abs = path.resolve(f);
            if (!domainErrorsByFile.has(abs))
                domainErrorsByFile.set(abs, new Set());
            domainErrorsByFile.get(abs).add(m[1]);
        }
    }

    const uiFeedbackPath = path.join(
        srcRoot,
        'shared',
        'domain',
        'services',
        'ui-feedback.service.ts'
    );
    const uiFeedbackSrc = readIfExists(uiFeedbackPath);

    // localName -> { file, originalName } via les instructions d'import de ui-feedback.service.ts
    const localToOrigin = new Map();
    if (uiFeedbackSrc) {
        const importRe = /import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g;
        let im;
        while ((im = importRe.exec(uiFeedbackSrc)) !== null) {
            const specifiers = im[1]
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);
            const resolvedFile = resolveImportToFile(im[2], srcRoot);
            for (const spec of specifiers) {
                const asMatch = /^(\w+)\s+as\s+(\w+)$/.exec(spec);
                if (asMatch) {
                    localToOrigin.set(asMatch[2], {
                        file: resolvedFile,
                        originalName: asMatch[1],
                    });
                } else if (/^\w+$/.test(spec)) {
                    localToOrigin.set(spec, {
                        file: resolvedFile,
                        originalName: spec,
                    });
                }
            }
        }
    }

    const registeredPairs = new Set(); // "file::originalName"
    if (uiFeedbackSrc) {
        const re = /this\.registry\.register\(\s*(\w+)\s*,/g;
        let m;
        while ((m = re.exec(uiFeedbackSrc)) !== null) {
            const origin = localToOrigin.get(m[1]);
            if (origin && origin.file) {
                registeredPairs.add(`${origin.file}::${origin.originalName}`);
            } else {
                // import non resolu (relatif) : on retombe sur le nom local seul, moins precis
                registeredPairs.add(`?::${m[1]}`);
            }
        }
    }

    const unregistered = [];
    let total = 0;
    for (const [file, names] of domainErrorsByFile) {
        for (const name of names) {
            total++;
            const key = `${file}::${name}`;
            const fallbackKey = `?::${name}`;
            if (
                !registeredPairs.has(key) &&
                !registeredPairs.has(fallbackKey)
            ) {
                unregistered.push(`${name} (${path.relative(srcRoot, file)})`);
            }
        }
    }
    unregistered.sort();
    if (unregistered.length > 0) {
        findings.uiFeedback.push(
            `${unregistered.length}/${total} classes DomainError (app entiere) sans handler dans UiFeedbackService.registerDefaultHandlers() : ${unregistered.join(', ')}`
        );
    }
} else {
    findings.uiFeedback.push(
        'Racine src/ introuvable — verification impossible.'
    );
}

// ---------- Check 4 : Validators.required (formulaire) vs create/update.validator.ts (domaine) ----------
function extractRequiredFieldsFromFormStore(src) {
    const required = new Set();
    const all = new Set();
    const re = /(\w+):\s*new FormControl/g;
    let m;
    while ((m = re.exec(src)) !== null) {
        const fieldName = m[1];
        const parenOpen = src.indexOf('(', re.lastIndex - 1);
        const parenClose = findMatchingBracket(src, parenOpen, '(', ')');
        if (parenClose === -1) continue;
        const block = src.slice(parenOpen, parenClose + 1);
        // Retirer les commentaires ligne (// ...) avant de tester : un
        // Validators.required commente ne doit pas compter comme actif.
        const blockWithoutLineComments = block.replace(/\/\/[^\n]*/g, '');
        all.add(fieldName);
        if (/Validators\.required\b/.test(blockWithoutLineComments)) {
            required.add(fieldName);
        }
    }
    return { required, all };
}
function extractRequiredFieldsFromValidator(src) {
    const required = new Set();
    const re1 = /if\s*\(\s*!contract\.(\w+)\s*\)/g;
    // Autorise les conditions composees (ex: if (contract.x === null || contract.x === undefined))
    // et pas seulement une condition unique isolee entre parentheses.
    const re2 =
        /if\s*\([^)]*\bcontract\.(\w+)\s*===\s*(undefined|null)\b[^)]*\)/g;
    // Champs tableau (ex: platforms: string[]) verifies via !contract.field?.length
    // plutot que !contract.field seul — idiome legitime, pas une absence de check.
    const re3 = /if\s*\(\s*!contract\.(\w+)\?\.\w+\s*\)/g;
    let m;
    while ((m = re1.exec(src)) !== null) required.add(m[1]);
    while ((m = re2.exec(src)) !== null) required.add(m[1]);
    while ((m = re3.exec(src)) !== null) required.add(m[1]);
    return required;
}

// Deux conventions coexistent reellement dans l'app (voir SEOS-Assumptions-Register.md) :
// presentation/store (administrative-infrastructure, departments, ...) et application/store
// (content-management, encore non migre). On essaie les deux, dans cet ordre.
const formStoreCandidates = [
    path.join(
        moduleRoot,
        'presentation',
        'store',
        entityName,
        `${entityName}-form.store.ts`
    ),
    path.join(
        moduleRoot,
        'application',
        'store',
        entityName,
        `${entityName}-form.store.ts`
    ),
];
let formStorePath = formStoreCandidates[0];
let formStoreSrc = null;
for (const candidate of formStoreCandidates) {
    const src = readIfExists(candidate);
    if (src) {
        formStorePath = candidate;
        formStoreSrc = src;
        break;
    }
}

if (!formStoreSrc) {
    findings.requiredMismatch.push(
        `Fichier absent (${formStorePath}) — verification impossible.`
    );
} else {
    const { required: formRequired, all: formAllFields } =
        extractRequiredFieldsFromFormStore(formStoreSrc);

    for (const op of ['create', 'update']) {
        const validatorPath = path.join(
            moduleRoot,
            'domain',
            'validators',
            entityName,
            `${entityName}-${op}.validator.ts`
        );
        const validatorSrc = readIfExists(validatorPath);
        if (!validatorSrc) {
            findings.requiredMismatch.push(
                `Pas de validateur de ${op === 'create' ? 'creation' : 'mise a jour'} (${validatorPath}) — rien a comparer (peut etre legitime si aucun champ obligatoire).`
            );
            continue;
        }
        const domainRequired = extractRequiredFieldsFromValidator(validatorSrc);
        // uniqId est tolere en plus sur update (jamais un champ de formulaire) — pas un mismatch.
        const ignoredOnUpdate =
            op === 'update' ? new Set(['uniqId']) : new Set();

        const requiredByDomainNotByForm = [...domainRequired].filter(
            (f) =>
                !ignoredOnUpdate.has(f) &&
                formAllFields.has(f) &&
                !formRequired.has(f)
        );
        const requiredByFormNotByDomain = [...formRequired].filter(
            (f) => !domainRequired.has(f)
        );

        if (requiredByDomainNotByForm.length > 0) {
            findings.requiredMismatch.push(
                `[${op}] Champ(s) obligatoire(s) cote domaine mais PAS marque(s) Validators.required dans le formulaire : ${requiredByDomainNotByForm.join(', ')}. Consequence : l'utilisateur peut soumettre un formulaire juge valide par Angular, puis recevoir une erreur de validation au moment de la soumission.`
            );
        }
        if (op === 'create' && requiredByFormNotByDomain.length > 0) {
            findings.requiredMismatch.push(
                `[create] Champ(s) Validators.required dans le formulaire mais PAS verifie(s) par le validateur de domaine : ${requiredByFormNotByDomain.join(', ')}. Consequence, moins critique : un appel direct au repository (hors formulaire) pourrait creer une entite avec ce champ manquant sans qu'aucun garde-fou domaine ne l'empeche.`
            );
        }
    }
}

// ---------- Check 5 : artefacts orphelins (commands / dto / entities / facades per-entite) ----------
// application/services/{ENTITY} ajoute (Experience 032) suite a la critique du module de
// reference : InfrastructureSelectFacade s'est revelee sans consommateur dans toute l'app,
// trouve seulement par grep manuel — cette regle l'aurait signale mecaniquement (candidat a
// verifier a la main, pas une suppression automatique ; une facade annotee explicitement avec
// une date de revision, comme design_decisions_v14.infrastructure_select_slice_anticipee, reste
// un signalement attendu et deja explique, pas un nouveau bug).
if (srcRoot) {
    const targetDirs = [
        path.join(moduleRoot, 'application', 'commands', entityName),
        path.join(moduleRoot, 'application', 'dto', entityName),
        path.join(moduleRoot, 'domain', 'entities', entityName),
        path.join(moduleRoot, 'application', 'services', entityName),
    ];
    for (const dir of targetDirs) {
        if (!fs.existsSync(dir)) continue;
        for (const file of fs.readdirSync(dir)) {
            if (!file.endsWith('.ts')) continue;
            const fullPath = path.join(dir, file);
            const src = fs.readFileSync(fullPath, 'utf8');
            const classNames = [];
            const re = /export class (\w+)/g;
            let m;
            while ((m = re.exec(src)) !== null) classNames.push(m[1]);
            for (const className of classNames) {
                const wordRe = new RegExp(`\\b${className}\\b`, 'g');
                let refCount = 0;
                for (const f of allTsFiles) {
                    if (path.resolve(f) === path.resolve(fullPath)) continue;
                    const otherSrc = readIfExists(f); // guard TOCTOU, voir check 3
                    if (otherSrc === null) continue;
                    if (wordRe.test(otherSrc)) refCount++;
                    wordRe.lastIndex = 0;
                }
                if (refCount === 0) {
                    findings.orphaned.push(
                        `${className} (${path.relative(moduleRoot, fullPath)}) — aucune reference trouvee en dehors de son propre fichier, dans toute l'application. Candidat code mort (meme profil que responsibilities-select / stubs enable-disable, Experience 012/016).`
                    );
                }
            }
        }
    }
} else {
    findings.orphaned.push(
        'Racine src/ introuvable — verification impossible.'
    );
}

// ---------- Check 6 : ceremonie VO/Entity (passthrough sans transformation reelle) ----------
const entitiesDir = path.join(moduleRoot, 'domain', 'entities', entityName);
if (fs.existsSync(entitiesDir)) {
    for (const op of ['create', 'update', 'delete', 'filter']) {
        const entityFile = path.join(
            entitiesDir,
            `${entityName}-${op}.entity.ts`
        );
        const src = readIfExists(entityFile);
        if (!src) continue; // absent = deja collapse, rien a signaler
        // heuristique : presence d'un operateur conditionnel/de defaut = transformation reelle probable
        const hasConditionalLogic =
            /(\bif\s*\(|\?\s*[^:]+:|\?\?|\|\|\s*[^,)\n]+)/.test(src);
        if (!hasConditionalLogic) {
            findings.ceremony.push(
                `${entityName}-${op}.entity.ts existe encore et ne contient aucune logique conditionnelle detectee (if / ternaire / ?? / ||) — probable pur passthrough. Candidat a la suppression, meme regle que la decision explicite de l'architecte (Experience 007/010) : verifier a la main avant de supprimer.`
            );
        }
    }
}

// ---------- Check 7 : nommage {ENTITY}-select-response-api.dto.ts ----------
// Ne s'applique qu'aux entites qui ont reellement un repository select (le fichier
// abstrait fait foi : sa presence signifie que la fonctionnalite select existe pour
// cette entite). Convention point (Experience 029) : domain/repositories/{ENTITY}/
// {ENTITY}-select.repository.ts.
const selectRepoPath = path.join(
    moduleRoot,
    'domain',
    'repositories',
    entityName,
    `${entityName}-select.repository.ts`
);
if (fs.existsSync(selectRepoPath)) {
    const apiDtoDir = path.join(
        moduleRoot,
        'infrastructure',
        'api',
        'dto',
        entityName
    );
    const expectedFile = `${entityName}-select-response-api.dto.ts`;
    const expectedPath = path.join(apiDtoDir, expectedFile);
    if (!fs.existsSync(expectedPath)) {
        const candidates = fs.existsSync(apiDtoDir)
            ? fs
                  .readdirSync(apiDtoDir)
                  .filter((f) => f.includes('select') && f.endsWith('.ts'))
            : [];
        if (candidates.length > 0) {
            findings.selectNaming.push(
                `${expectedFile} absent, mais ${candidates.join(', ')} trouve(s) dans ${apiDtoDir} — probable variante de nommage (ex: suffixe "-response" manquant) plutot qu'une fonctionnalite select absente. Renommer pour correspondre a la convention (voir Experience 029, infrastructure-type).`
            );
        } else {
            findings.selectNaming.push(
                `${expectedFile} absent et aucun fichier *select*.ts trouve dans ${apiDtoDir} — le repository select existe (${path.relative(moduleRoot, selectRepoPath)}) mais son DTO d'API semble manquant, a verifier a la main.`
            );
        }
    }
}

// ---------- Check 8 : chainage VO -> Entity (regle metier implementee mais jamais appelee) ----------
if (fs.existsSync(useCasesDir)) {
    const useCaseFiles8 = fs
        .readdirSync(useCasesDir)
        .filter((f) => f.endsWith('.use-case.ts'));
    for (const file of useCaseFiles8) {
        const useCasePath = path.join(useCasesDir, file);
        const useCaseSrc = readIfExists(useCasePath);
        const methodNames = extractUseCaseMethodNames(useCaseSrc);
        const useCaseImportMap = extractImportMap(useCaseSrc);
        for (const method of methodNames) {
            const body = extractMethodBody(useCaseSrc, method);
            if (body === null) continue;
            const calledInBody = extractCalledIdentifiers(body);
            for (const name of calledInBody) {
                const importPath = useCaseImportMap.get(name);
                if (!importPath || !/\/value-objects\//.test(importPath))
                    continue;
                const voBasename = importPath.split('/').pop() || '';
                if (
                    !voBasename.startsWith(`${entityName}-`) ||
                    !voBasename.endsWith('.vo')
                )
                    continue;
                const operation = voBasename.slice(entityName.length + 1, -3);
                if (!operation) continue;

                const entityFilePath = path.join(
                    moduleRoot,
                    'domain',
                    'entities',
                    entityName,
                    `${entityName}-${operation}.entity.ts`
                );
                const entitySrc = readIfExists(entityFilePath);
                if (!entitySrc) continue; // pas d'entity pour cette operation : rien a chainer, cas normal
                const hasConditionalLogic =
                    /(\bif\s*\(|\?\s*[^:]+:|\?\?|\|\|\s*[^,)\n]+)/.test(
                        entitySrc
                    );
                if (!hasConditionalLogic) continue; // entity passthrough : deja couvert par la regle 6

                let entityCalled = false;
                for (const other of calledInBody) {
                    if (other === name) continue;
                    const otherImportPath = useCaseImportMap.get(other);
                    if (!otherImportPath) continue;
                    const resolved = resolveImportToFile(
                        otherImportPath,
                        srcRoot || '.'
                    );
                    if (
                        resolved &&
                        path.resolve(resolved) === path.resolve(entityFilePath)
                    ) {
                        entityCalled = true;
                        break;
                    }
                }
                if (!entityCalled) {
                    findings.voEntityChain.push(
                        `${file} : ${method}() appelle "${name}(...)" (VO ${operation}) mais n'appelle jamais la fonction de ${path.relative(moduleRoot, entityFilePath)}, qui contient pourtant une regle metier reelle (logique conditionnelle detectee) — cette regle est ecrite mais jamais executee. Meme modele attendu que infrastructureFilterVo() -> infrastructureFilterEntity().`
                    );
                }
            }
        }
    }
}

// ---------- Check 9 : residus console.log/debug/warn (fichiers scopes a cette entite) ----------
if (srcRoot) {
    const moduleRootAbs = path.resolve(moduleRoot);
    for (const f of allTsFiles) {
        const abs = path.resolve(f);
        if (!abs.startsWith(moduleRootAbs)) continue;
        const rel = path.relative(moduleRootAbs, abs);
        const segments = rel.split(path.sep);
        if (!segments.includes(entityName)) continue;
        const src = readIfExists(abs);
        if (!src) continue;
        const re = /console\.(log|debug|warn)\s*\(/g;
        let m;
        const kinds = new Set();
        while ((m = re.exec(src)) !== null) kinds.add(m[1]);
        if (kinds.size > 0) {
            findings.debugResidue.push(
                `${path.relative(moduleRoot, abs)} : console.${[...kinds].join('/console.')}(...) trouve — residu de debug probable (meme profil qu'Experience 028 : infrastructure-form.store.ts/infrastructure-form.component.ts), a verifier et retirer avant de considerer ce fichier fini.`
            );
        }
    }
}

// ---------- Rapport ----------
console.log(`SEOS — validation semantique ("check-semantics.js", Etape 2)`);
console.log(`Module : ${moduleRoot}`);
console.log(`Entite : ${entityName}\n`);

let hasIssue = false;
function printSection(title, items) {
    console.log(`--- ${title} ---`);
    if (items.length === 0) {
        console.log('OK — aucun probleme detecte par cette regle.');
    } else {
        hasIssue = true;
        for (const item of items) console.log(`  - ${item}`);
    }
    console.log('');
}

printSection('1. defer() sur create()/update() (use-case)', findings.defer);
printSection(
    '2. Cles i18n des validateurs presentes dans fr.json',
    findings.i18n
);
printSection(
    '3. DomainError -> handler UiFeedbackService (app entiere, pas scope au module)',
    findings.uiFeedback
);
printSection(
    '4. Validators.required (formulaire) vs create/update.validator.ts (domaine)',
    findings.requiredMismatch
);
printSection(
    '5. Artefacts orphelins (commands/dto/entities de cette entite, heuristique)',
    findings.orphaned
);
printSection(
    '6. Ceremonie VO/Entity (heuristique, a verifier a la main avant suppression)',
    findings.ceremony
);
printSection(
    '7. Nommage {ENTITY}-select-response-api.dto.ts',
    findings.selectNaming
);
printSection(
    '8. Chainage VO -> Entity (regle metier implementee mais jamais appelee)',
    findings.voEntityChain
);
printSection('9. Residus console.log/debug/warn', findings.debugResidue);

console.log(
    'Note : verification par analyse textuelle simple (regex + comptage de parentheses/accolades), pas par AST complet, aucune IA. ' +
        'Un resultat "OK" ne couvre que les 9 regles ci-dessus, pas une garantie generale d\'absence de bug semantique. ' +
        'Les regles 5, 6 et 8 sont des heuristiques (detection de logique conditionnelle par regex) : elles signalent des candidats a verifier a la main, jamais un verdict a executer aveuglement.'
);

process.exitCode = hasIssue ? 1 : 0;
