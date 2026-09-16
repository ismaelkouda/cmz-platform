import { existsSync, lstatSync } from 'node:fs';

import { nxBuild, projectOutputPath, removeTree } from './support.mjs';

function fail(message) {
    throw new Error(`library runtime proof: ${message}`);
}

export function proveProductionBuild(context) {
    const output = projectOutputPath(context.workspace, context.app);
    if (existsSync(output)) fail('sortie de build préexistante');
    try {
        nxBuild(context, context.app, 'production');
        if (!existsSync(output) || !lstatSync(output).isDirectory()) {
            fail(
                `la build de production de ${context.app} n'a produit aucune sortie`
            );
        }
    } finally {
        removeTree(output);
    }
}
