#!/usr/bin/env node
import { fileURLToPath } from 'node:url';

import { verifyRepositoryResolution } from './library-setup/resolution-policy.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const result = verifyRepositoryResolution(root);
if (!result.ok) {
    console.error('\n❌ Politique de résolution invalide :');
    for (const error of result.errors) console.error(`  - ${error}`);
    process.exitCode = 1;
} else {
    console.log(
        `✅ Politique de résolution : sources de ${result.checkedManifests} package.json, bun.lock et scripts de cycle de vie du manifeste racine conformes.`
    );
}
