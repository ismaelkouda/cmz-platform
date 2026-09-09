#!/usr/bin/env node
import { fileURLToPath } from 'node:url';

import { validateRecipes } from './check-library-setup.mjs';
import { validateCompatibilityMatrices } from './library-setup/compatibility.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const recipes = validateRecipes(root);
const result = validateCompatibilityMatrices(root, recipes.recipes);
const errors = [...recipes.errors, ...result.errors];
if (errors.length) {
    console.error('\n❌ Matrices de compatibilité invalides :');
    for (const error of errors) console.error(`  - ${error}`);
    process.exitCode = 1;
} else {
    console.log(
        `✅ Matrices de compatibilité : ${result.matrices.size} bibliothèque(s) couvertes.`
    );
}
