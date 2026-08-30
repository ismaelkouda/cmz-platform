import { resolve } from 'node:path';
import { format, resolveConfig } from 'prettier';

import { repositoryRoot } from '../validate-ir.mjs';

async function formatToFixedPoint(content, options, path) {
    let current = content;
    for (let pass = 1; pass <= 5; pass += 1) {
        const next = await format(current, options);
        if (next === current) return current;
        current = next;
    }
    throw new Error(`Prettier ne converge pas pour l’artefact généré ${path}.`);
}

export async function canonicalizeGeneratedFiles(files) {
    return Object.fromEntries(
        await Promise.all(
            Object.entries(files).map(async ([path, content]) => {
                const filepath = resolve(repositoryRoot, path);
                const config = (await resolveConfig(filepath)) || {};
                return [
                    path,
                    await formatToFixedPoint(
                        content,
                        { ...config, filepath },
                        path
                    ),
                ];
            })
        )
    );
}

export async function canonicalizeRenderedLayers(layers) {
    return Object.fromEntries(
        await Promise.all(
            Object.entries(layers).map(async ([layer, rendered]) => [
                layer,
                {
                    ...rendered,
                    files: await canonicalizeGeneratedFiles(rendered.files),
                },
            ])
        )
    );
}

export async function canonicalizeControlFiles(controlFiles) {
    const contents = await canonicalizeGeneratedFiles(
        Object.fromEntries(
            Object.entries(controlFiles).map(([path, value]) => [
                path,
                value.content,
            ])
        )
    );
    return Object.fromEntries(
        Object.entries(controlFiles).map(([path, value]) => [
            path,
            { ...value, content: contents[path] },
        ])
    );
}
