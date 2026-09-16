import { existsSync, readFileSync } from 'node:fs';

import postcss from 'postcss';

import {
    cssFiles,
    nxBuild,
    projectOutputPath,
    removeTree,
} from './support.mjs';

function fail(message) {
    throw new Error(`library runtime proof: ${message}`);
}

function isBareButtonSelector(selector) {
    const part = selector.trim();
    return /^button(?![\w-])/.test(part) && !part.includes('.');
}

function insideLayer(node) {
    for (let parent = node.parent; parent; parent = parent.parent) {
        if (parent.type === 'atrule' && parent.name === 'layer') return true;
    }
    return false;
}

/**
 * Le conflit réel entre Material et Tailwind est la relation de cascade entre
 * le preflight en couche et les jetons Material hors couche. Cet oracle juge
 * l'artefact CSS compilé, sans confondre cette propriété avec le rendu visuel.
 */
export function assertMaterialTailwindCascade(css, parse) {
    const root = parse(css);
    let resets = 0;
    const unlayeredResets = [];
    let tokenRules = 0;
    let unlayeredTokenRules = 0;
    root.walkRules((rule) => {
        if (rule.selectors.some(isBareButtonSelector)) {
            resets += 1;
            if (!insideLayer(rule)) unlayeredResets.push(rule.selector);
        }
        if (
            rule.nodes?.some(
                (node) => node.type === 'decl' && node.prop.startsWith('--mat-')
            )
        ) {
            tokenRules += 1;
            if (!insideLayer(rule)) unlayeredTokenRules += 1;
        }
    });
    if (resets === 0 || tokenRules === 0) {
        fail(
            `coexistence : CSS compilé incomplet (preflight Tailwind=${resets}, règles portant des jetons --mat-*=${tokenRules})`
        );
    }
    if (unlayeredResets.length > 0) {
        fail(
            `coexistence : preflight Tailwind hors couche, il écraserait Material (${unlayeredResets
                .slice(0, 3)
                .join(' / ')})`
        );
    }
    if (unlayeredTokenRules === 0) {
        fail(
            'coexistence : jetons --mat-* uniquement dans une couche, du CSS hors couche les écraserait'
        );
    }
    return { resets, tokenRules, unlayeredTokenRules };
}

export function proveMaterialTailwindCascade(context) {
    const output = projectOutputPath(context.workspace, context.app);
    if (existsSync(output)) fail('sortie de build préexistante');
    nxBuild(context, context.app);
    try {
        const css = cssFiles(output)
            .map((path) => readFileSync(path, 'utf8'))
            .join('\n');
        assertMaterialTailwindCascade(css, postcss.parse);
    } finally {
        removeTree(output);
    }
}
