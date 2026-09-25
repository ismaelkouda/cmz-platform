import { createHash } from 'node:crypto';
import { lstatSync, readFileSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import { TextDecoder } from 'node:util';

import { validateJsonSchema } from '../validate-ir.mjs';

const MAX_SOURCE_COUNT = 32;
const MAX_TOTAL_BYTES = 20 * 1024 * 1024;
const PNG_SIGNATURE = Buffer.from('89504e470d0a1a0a', 'hex');
const JPEG_SIGNATURE = Buffer.from('ffd8ff', 'hex');

function fail(message) {
    throw new Error(`presentation evidence: ${message}`);
}

function sha256(content) {
    return createHash('sha256').update(content).digest('hex');
}

function workspaceFile(root, declaredPath, label) {
    const pathSegments = declaredPath.split('/');
    if (
        declaredPath.startsWith('/') ||
        pathSegments.some(
            (segment) => segment === '' || segment === '.' || segment === '..'
        )
    ) {
        fail(`${label} must use a normalized workspace-relative path`);
    }
    const absolute = resolve(root, declaredPath);
    const rel = relative(root, absolute);
    if (!rel || rel === '..' || rel.startsWith(`..${sep}`))
        fail(`${label} must be inside the workspace`);

    let current = root;
    const segments = rel.split(sep);
    for (const [index, segment] of segments.entries()) {
        current = resolve(current, segment);
        const metadata = lstatSync(current);
        if (metadata.isSymbolicLink())
            fail(`${label} must not traverse a symbolic link`);
        const leaf = index === segments.length - 1;
        if (!leaf && !metadata.isDirectory())
            fail(`${label} has a non-directory parent`);
        if (leaf && !metadata.isFile()) fail(`${label} must be a regular file`);
    }
    return absolute;
}

function validateMedia(content, source) {
    if (
        source.media_type === 'image/png' &&
        !content.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)
    ) {
        fail(`source ${source.id} is not a PNG payload`);
    }
    if (
        source.media_type === 'image/jpeg' &&
        !content.subarray(0, JPEG_SIGNATURE.length).equals(JPEG_SIGNATURE)
    ) {
        fail(`source ${source.id} is not a JPEG payload`);
    }
    if (source.media_type === 'application/json') {
        try {
            JSON.parse(
                new TextDecoder('utf-8', { fatal: true }).decode(content)
            );
        } catch (error) {
            fail(`source ${source.id} is invalid JSON (${error.message})`);
        }
    }
    if (source.media_type === 'text/markdown') {
        try {
            new TextDecoder('utf-8', { fatal: true }).decode(content);
        } catch {
            fail(`source ${source.id} is not valid UTF-8 markdown`);
        }
    }
}

function validateSemantics(manifest, pageContract) {
    if (manifest.page_id !== pageContract.page.id)
        fail('page_id does not match the page contract');
    if (manifest.sources.length > MAX_SOURCE_COUNT)
        fail(`sources must contain at most ${MAX_SOURCE_COUNT} entries`);
    if (!manifest.sources.some(({ purpose }) => purpose === 'primary-layout'))
        fail('one primary-layout source is required');

    const sourceIds = new Set();
    const stateIds = new Set(pageContract.page.states.map(({ id }) => id));
    const allowedMediaByKind = {
        'structured-design': new Set(['application/json']),
        screenshot: new Set(['image/jpeg', 'image/png']),
        wireframe: new Set(['image/jpeg', 'image/png']),
        'rendered-interface': new Set(['image/jpeg', 'image/png']),
        'design-system': new Set(['application/json']),
        'component-map': new Set(['application/json']),
        annotation: new Set([
            'application/json',
            'image/jpeg',
            'image/png',
            'text/markdown',
        ]),
        'design-brief': new Set(['application/json', 'text/markdown']),
    };
    for (const source of manifest.sources) {
        if (sourceIds.has(source.id)) fail(`duplicate source id ${source.id}`);
        sourceIds.add(source.id);
        if (!allowedMediaByKind[source.source_kind].has(source.media_type))
            fail(
                `source ${source.id} media ${source.media_type} is invalid for ${source.source_kind}`
            );
        for (const stateId of source.state_ids) {
            if (!stateIds.has(stateId))
                fail(`source ${source.id} references unknown state ${stateId}`);
        }
        if (
            source.purpose === 'state-reference' &&
            source.state_ids.length === 0
        ) {
            fail(`state-reference source ${source.id} must name a state`);
        }
        if (
            ['screenshot', 'wireframe', 'rendered-interface'].includes(
                source.source_kind
            ) &&
            source.viewport === null
        ) {
            fail(`visual source ${source.id} must declare its viewport`);
        }
    }
}

export function resolvePresentationEvidence({
    workspaceRoot,
    presentationEvidencePath,
    presentationEvidenceSchema,
    pageContract,
}) {
    if (!presentationEvidencePath) return null;
    if (!presentationEvidenceSchema)
        fail('schema is required when evidence is provided');

    const root = resolve(workspaceRoot);
    const manifestAbsolute = workspaceFile(
        root,
        presentationEvidencePath,
        'manifest'
    );
    const manifestContent = readFileSync(manifestAbsolute);
    let manifest;
    try {
        manifest = JSON.parse(manifestContent.toString('utf8'));
    } catch (error) {
        fail(`manifest is invalid JSON (${error.message})`);
    }
    const schemaErrors = validateJsonSchema(
        manifest,
        presentationEvidenceSchema
    );
    if (schemaErrors.length > 0)
        fail(`manifest violates schema\n${schemaErrors.join('\n')}`);
    validateSemantics(manifest, pageContract);

    let totalBytes = 0;
    const sources = manifest.sources.map((source) => {
        const sourceAbsolute = workspaceFile(
            root,
            source.snapshot_uri,
            `source ${source.id}`
        );
        if (sourceAbsolute === manifestAbsolute)
            fail(`source ${source.id} must not reference its own manifest`);
        const content = readFileSync(sourceAbsolute);
        totalBytes += content.byteLength;
        if (content.byteLength !== source.bytes)
            fail(`source ${source.id} byte length drifted`);
        if (sha256(content) !== source.sha256)
            fail(`source ${source.id} sha256 drifted`);
        validateMedia(content, source);
        return {
            id: source.id,
            source_kind: source.source_kind,
            purpose: source.purpose,
            path: relative(root, sourceAbsolute).split(sep).join('/'),
            media_type: source.media_type,
            bytes: source.bytes,
            sha256: source.sha256,
            trust: source.trust,
            state_ids: source.state_ids,
            viewport: source.viewport,
        };
    });
    if (totalBytes > MAX_TOTAL_BYTES)
        fail(`sources exceed the ${MAX_TOTAL_BYTES} byte bundle limit`);

    return {
        schema_version: manifest.schema_version,
        presentation_id: manifest.presentation_id,
        page_id: manifest.page_id,
        authority: manifest.authority,
        manifest: {
            path: relative(root, manifestAbsolute).split(sep).join('/'),
            sha256: sha256(manifestContent),
        },
        sources,
    };
}
