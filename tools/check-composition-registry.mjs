#!/usr/bin/env node
import { fileURLToPath } from 'node:url';

import { loadCompositionRegistry } from './generator-platform/core/composition-registry.mjs';

const workspaceRoot = fileURLToPath(new URL('..', import.meta.url));

try {
    const registry = loadCompositionRegistry(workspaceRoot);
    console.log(
        `✅  Registre de compositions valide : ${registry.entries.length} composition(s), ` +
            `${registry.entries.filter(({ maturity }) => maturity === 'proven').length} prouvée(s).`
    );
} catch (error) {
    console.error(`❌  ${error.message}`);
    process.exitCode = 1;
}
