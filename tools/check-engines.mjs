#!/usr/bin/env node
/**
 * Vérifie que le runtime courant respecte le champ `engines` du package.json
 * racine (ADR-0006).
 *
 * Déclarer `engines` documente une contrainte ; cela ne l'applique pas — ni npm
 * ni bun n'échouent par défaut sur une version de Node non conforme. Ce script
 * transforme la documentation en garantie, et il est branché sur `preinstall`
 * pour échouer avant toute installation plutôt qu'au milieu d'un build.
 *
 * Usage : bun run check:engines (exécuté automatiquement au `bun install`)
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { engines = {} } = JSON.parse(
    readFileSync(join(ROOT, 'package.json'), 'utf8')
);

/** Découpe une plage semver simple en clauses `||`, chacune en conditions `&&`. */
function satisfies(version, range) {
    const [major, minor = 0, patch = 0] = version.split('.').map(Number);

    return range.split('||').some((clause) =>
        clause
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .every((condition) => matches(condition, [major, minor, patch]))
    );
}

function matches(condition, [major, minor, patch]) {
    const parsed = /^([\^~]|>=|<=|>|<|=)?v?(\d+)(?:\.(\d+))?(?:\.(\d+))?$/.exec(
        condition
    );
    if (!parsed) return true; // condition non reconnue : on ne bloque pas à tort

    const [, operator = '=', rawMajor, rawMinor, rawPatch] = parsed;
    const target = [
        Number(rawMajor),
        Number(rawMinor ?? 0),
        Number(rawPatch ?? 0),
    ];
    const current = [major, minor, patch];

    const compare = () => {
        for (let i = 0; i < 3; i += 1) {
            if (current[i] !== target[i]) return current[i] - target[i];
        }
        return 0;
    };

    switch (operator) {
        case '^':
            return major === target[0] && compare() >= 0;
        case '~':
            return major === target[0] && minor === target[1] && compare() >= 0;
        case '>=':
            return compare() >= 0;
        case '<=':
            return compare() <= 0;
        case '>':
            return compare() > 0;
        case '<':
            return compare() < 0;
        default:
            return compare() === 0;
    }
}

const failures = [];

const nodeVersion = process.versions.node;
if (engines.node && !satisfies(nodeVersion, engines.node)) {
    failures.push({
        outil: 'Node',
        requis: engines.node,
        trouve: nodeVersion,
        aide: 'Utilisez la version indiquée par .nvmrc — par exemple `nvm use`.',
    });
}

const bunVersion = process.versions.bun;
if (engines.bun && bunVersion && !satisfies(bunVersion, engines.bun)) {
    failures.push({
        outil: 'bun',
        requis: engines.bun,
        trouve: bunVersion,
        aide: 'Mettez bun à jour : `bun upgrade`.',
    });
}

if (failures.length > 0) {
    console.error('\n✖ Environnement non conforme au champ `engines` :\n');
    for (const f of failures) {
        console.error(
            `  ${f.outil} — requis ${f.requis}, trouvé ${f.trouve}\n    ${f.aide}`
        );
    }
    console.error(
        '\nAngular 22 exige Node ^22.22.3 || ^24.15.0 || >=26.0.0 (cf. ADR-0005).' +
            '\nInstallez la bonne version : `nvm install 22.22.3 && nvm use`.\n'
    );
    process.exit(1);
}

console.log(
    `✔ Environnement conforme — Node ${nodeVersion}${bunVersion ? `, bun ${bunVersion}` : ''}.`
);
