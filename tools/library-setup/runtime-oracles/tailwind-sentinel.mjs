import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';

import {
    cssFiles,
    nxBuild,
    projectOutputPath,
    removeTree,
    safePath,
} from './support.mjs';

const SENTINEL = 'cmz-proof-text-[#123456]';

function fail(message) {
    throw new Error(`library runtime proof: ${message}`);
}

export function proveTailwindSentinel(context) {
    const probe = safePath(
        context.workspace,
        `apps/${context.app}/src/${SENTINEL}.html`
    );
    if (existsSync(probe)) fail('fixture Tailwind déjà présente');
    const output = projectOutputPath(context.workspace, context.app);
    if (existsSync(output)) fail('sortie de build préexistante');
    writeFileSync(probe, '<div class="text-[#123456]">preuve</div>\n', {
        flag: 'wx',
    });
    try {
        nxBuild(context, context.app);
        const styles = cssFiles(output)
            .map((path) => readFileSync(path, 'utf8'))
            .join('\n');
        if (
            !/(?:color:\s*#123456|color:\s*rgb\(18[ ,]+52[ ,]+86\))/.test(
                styles
            )
        ) {
            fail('la classe sentinelle Tailwind n’a émis aucune règle CSS');
        }
    } finally {
        if (existsSync(probe)) unlinkSync(probe);
        removeTree(output);
    }
}
