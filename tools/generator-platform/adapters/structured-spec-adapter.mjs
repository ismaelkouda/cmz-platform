import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import {
    readJson,
    validateObservation,
} from '../core/action-request-model.mjs';

export async function adaptStructuredSpec(path) {
    const content = await readFile(path);
    const observation = validateObservation(
        JSON.parse(content.toString('utf8'))
    );
    return {
        observation,
        source: {
            id: 'source.structured-spec',
            kind: 'specification',
            uri: 'tools/generator-platform/sources/action-request.spec.json',
            sha256: createHash('sha256').update(content).digest('hex'),
        },
    };
}

export async function loadStructuredSpec(path) {
    return validateObservation(await readJson(path));
}
