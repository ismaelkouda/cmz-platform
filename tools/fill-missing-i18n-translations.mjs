#!/usr/bin/env node
/**
 * Script ponctuel K-4 (audit-workspace-2026-08-03.md, chantier K) — rédige
 * les traductions des 320 clés confirmées manquantes par K-3
 * (`tools/check-i18n.mjs`, méthode triée) et les fusionne dans
 * `apps/backoffice-angular/src/app/i18n/fr.translation.ts` sans toucher aux
 * clés existantes. Lancé une fois, pas un outil à rejouer en continu —
 * gardé dans `tools/` pour traçabilité, comme
 * `codemod-strip-redundant-component-flags.mjs` (chantier J).
 *
 * Méthode : charge `FR` réellement (comme le fait check-i18n.mjs — API
 * TypeScript, pas d'eval sur du texte non validé), construit un objet
 * d'ajouts à partir de la liste triée de K-3, fusionne (n'écrase jamais une
 * clé déjà présente), sérialise en JSON (toujours valide en TS), réécrit le
 * fichier, puis laisse `prettier --write` remettre au format du dépôt
 * (guillemets simples, largeur 80, etc. — `.prettierrc.json`).
 */
import { writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import {
    FR_TRANSLATION_ENTRY as TRANSLATION_FILE,
    loadFrModule,
    REPO_ROOT as ROOT,
} from './load-fr-i18n.mjs';

/**
 * Redérive la liste des clés manquantes en rejouant `check-i18n.mjs`
 * (méthode triée par K-3) — pas une liste figée recopiée à la main, pour que
 * ce script reste rejouable si de nouvelles clés apparaissent avant que K-4
 * ne soit rejoué. Même motif que `codemod-strip-redundant-component-flags.mjs`
 * (chantier J), qui reparse la sortie de `check-convention-profile.mjs`
 * plutôt que de dupliquer sa liste de violations.
 */
function getMissingKeys() {
    let out;
    try {
        out = execSync('node tools/check-i18n.mjs', {
            cwd: ROOT,
            encoding: 'utf8',
        });
    } catch (error) {
        out = error.stdout ?? '';
    }
    return out
        .split('\n')
        .filter((line) => /^  [A-Z]/.test(line))
        .map((line) => line.trim());
}

const MISSING_KEYS = getMissingKeys();

// --- Dictionnaire de traduction --------------------------------------------

// Suffixe générique `*_REQUIRE(D)` : message de validation de formulaire.
const REQUIRE_FIELD = {
    CODE: 'Le code est requis',
    NAME: 'Le nom est requis',
    DESCRIPTION: 'La description est requise',
    POPULATION_SIZE: 'La population est requise',
    INFRASTRUCTURE_COUNT: "Le nombre d'infrastructures est requis",
    REGION_ID: 'La région est requise',
    DEPARTMENT_ID: 'Le département est requis',
    UNIQ_ID: "L'identifiant est requis",
    POSITION: 'La position est requise',
    TYPE: 'Le type est requis',
    TOKEN: 'Le jeton est requis',
    BUTTON_LABEL: 'Le libellé du bouton est requis',
    BUTTON_URL: "L'URL du bouton est requise",
    CONTENT: 'Le contenu est requis',
    END_DATE: 'La date de fin est requise',
    START_DATE: 'La date de début est requise',
    IMAGE: "L'image est requise",
    PLATFORMS: 'Les plateformes sont requises',
    RESUME: 'Le résumé est requis',
    TITLE: 'Le titre est requis',
    VERSION: 'La version est requise',
    CATEGORY: 'La catégorie est requise',
    VIDEO: 'La vidéo est requise',
    TIME_DURATION: 'La durée est requise',
    INFRASTRUCTURE_TYPE: "Le type d'infrastructure est requis",
    OPERATOR: "L'opérateur est requis",
    SITE_ID: "L'identifiant du site est requis",
    SITE_NAME: 'Le nom du site est requis',
    TECHNOLOGY: 'La technologie est requise',
    TOWER_SIZE: 'La taille du pylône est requise',
    TOWER_TYPE: 'Le type de pylône est requis',
    FIBER_CONSTRUCTOR: 'Le constructeur fibre est requis',
    GEOM_FILE: 'Le fichier géométrique est requis',
    FREQUENCY: 'La fréquence est requise',
    EMAIL: "L'email est requis",
    FIRST_NAME: 'Le prénom est requis',
    LAST_NAME: 'Le nom est requis',
    PHONE: 'Le téléphone est requis',
    PROFILE: 'Le profil est requis',
    OPERATORS: 'Les opérateurs sont requis',
    REPORT_TYPES: 'Les types de signalement sont requis',
    COMMENT: 'Le commentaire est requis',
};

// Libellé "humain" d'un module, pour composer TOOLTIP.CREATE ("Créer X") —
// genre grammatical inclus (repris des blocs déjà traduits : "une région",
// "un département", "un type").
const MODULE_LABEL = {
    INFRASTRUCTURE_TYPE: { article: 'un', name: "type d'infrastructure" },
};

const TOOLTIP_GENERIC = {
    EDIT: 'Modifier',
    DELETE: 'Supprimer',
    ENABLE: 'Activer',
    DISABLE: 'Désactiver',
    CHOOSE: 'Actions',
    NO_PERMISSION_CREATE: 'Permission manquante pour créer',
    NO_PERMISSION_EDIT: 'Permission manquante pour modifier',
    NO_PERMISSION_DELETE: 'Permission manquante pour supprimer',
    NO_PERMISSION_ENABLE: 'Permission manquante pour activer',
    NO_PERMISSION_ACTIVE: 'Permission manquante pour activer',
    NO_PERMISSION_DISABLE: 'Permission manquante pour désactiver',
    NO_PERMISSION_CHOOSE: 'Aucune action disponible',
};

const TABS_LABEL = {
    HISTORY: 'Historique',
    INFRASTRUCTURE: 'Infrastructure',
    INFRASTRUCTURE_TYPE: "Type d'infrastructure",
};

// Clés one-off — pas de règle générique fiable, traduites une par une après
// lecture du fichier source réel (K-3).
const EXPLICIT = {
    'COMMON.ACTIVITY_PLACE': "Lieu d'activité",
    'COMMON.AFFECTED': 'Affecté',
    'COMMON.APP': 'Application',
    'COMMON.AUTO': 'Automatique',
    'COMMON.CRITICAL': 'Critique',
    'COMMON.GPS': 'GPS',
    'COMMON.HIGH': 'Élevée',
    'COMMON.IVR': 'SVI',
    'COMMON.LOW': 'Faible',
    'COMMON.MANUAL': 'Manuel',
    'COMMON.MEDIUM': 'Moyenne',
    'COMMON.NETWORK': 'Réseau',
    'COMMON.PLACE_NOT_PROVIDED': 'Lieu non renseigné',
    'COMMON.RESIDENCE_PLACE': 'Lieu de résidence',
    'COMMON.SMS': 'SMS',
    'COMMON.TRANSIT_PLACE': 'Lieu de transit',
    'COMMON.USSD': 'USSD',
    'COMMON.WHAT3WORDS': 'What3Words',
    'COMMON.DATE_RANGE.INVALID': 'Plage de dates invalide',
    'COMMON.INVALID_DATE_RANGE': 'Plage de dates invalide',
    'COMMON.INVALID_END_DATE': 'Date de fin invalide',
    'COMMON.INVALID_START_DATE': 'Date de début invalide',
    'COMMON.SUCCESS.FINALIZE': 'Finalisation réussie.',
    'COMMON.TYPE.REQUIRED': 'Le type est requis',
    'COMMUNICATION.MESSAGING.ERROR.SMS_CONTENT_TOO_LONG':
        'Le contenu du SMS est trop long',
    'AUTHENTICATION.RESET_PASSWORD.FORM.ERROR.TOKEN_REQUIRE':
        'Le jeton est requis',
};

function translate(key) {
    if (EXPLICIT[key]) return EXPLICIT[key];

    const segs = key.split('.');
    const leaf = segs[segs.length - 1];

    // TABS.<X>.LABEL
    if (segs.length >= 3 && segs[segs.length - 2] in TABS_LABEL === false) {
        // no-op, géré ci-dessous par cas explicite sur le nom du segment
    }
    if (leaf === 'LABEL') {
        const tabName = segs[segs.length - 2];
        if (TABS_LABEL[tabName]) return TABS_LABEL[tabName];
    }

    // TOOLTIP.<ACTION>
    if (segs[segs.length - 2] === 'TOOLTIP') {
        if (leaf === 'CREATE') {
            const moduleSeg = segs[segs.length - 3];
            const label = MODULE_LABEL[moduleSeg];
            if (label) return `Créer ${label.article} ${label.name}`;
        }
        if (TOOLTIP_GENERIC[leaf]) return TOOLTIP_GENERIC[leaf];
    }

    // *_REQUIRE / *_REQUIRED
    const m = leaf.match(/^(.*)_REQUIRED?$/);
    if (m && REQUIRE_FIELD[m[1]]) return REQUIRE_FIELD[m[1]];

    throw new Error(`Aucune règle de traduction pour la clé : ${key}`);
}

// --- Chargement de FR (réel, transpilé — tools/load-fr-i18n.mjs) --

async function loadFR() {
    const { FR } = await loadFrModule();
    return FR;
}

function setDeep(obj, path, value) {
    let node = obj;
    for (let i = 0; i < path.length - 1; i++) {
        const seg = path[i];
        if (typeof node[seg] !== 'object' || node[seg] === null) {
            node[seg] = {};
        }
        node = node[seg];
    }
    const leaf = path[path.length - 1];
    if (leaf in node) {
        throw new Error(
            `Clé déjà présente, ne devrait pas l'être : ${path.join('.')}`
        );
    }
    node[leaf] = value;
}

async function main() {
    const FR = await loadFR();

    let added = 0;
    for (const key of MISSING_KEYS) {
        const value = translate(key);
        setDeep(FR, key.split('.'), value);
        added++;
    }

    const header =
        '/** Bundle de traduction FR (dev) — couvre le commun + le module. */\n';
    const body = JSON.stringify(FR, null, 4);
    const output = `${header}export const FR = ${body} as const;\n`;
    writeFileSync(TRANSLATION_FILE, output);

    console.log(`K-4 : ${added} clé(s) ajoutée(s) à fr.translation.ts.`);
}

await main();
