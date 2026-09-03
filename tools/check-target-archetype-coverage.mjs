#!/usr/bin/env node
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadArchetypeSystem } from './generator-platform/core/archetype-selection.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

try {
    const system = loadArchetypeSystem(root, 'angular');
    console.log(
        `✔ Couverture rôle → archétype Angular : ${system.registry.roles.length} rôle(s), ${Object.keys(system.contracts).length} contrat(s) actif(s), aucun rôle sans producteur ni consommateur.`
    );
} catch (error) {
    console.error(
        `✖ ${error instanceof Error ? error.message : String(error)}`
    );
    process.exitCode = 1;
}
