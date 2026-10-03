import { createHash } from 'node:crypto';
import { lstat, readFile, readdir, realpath } from 'node:fs/promises';
import { arch, platform } from 'node:os';
import { dirname, relative, resolve, sep } from 'node:path';
import { createRequire } from 'node:module';

import { validateJsonSchema } from '../validate-ir.mjs';

const PNG_SIGNATURE = Buffer.from('89504e470d0a1a0a', 'hex');
const require = createRequire(import.meta.url);

function fail(message) {
    throw new Error(`visual evaluation: ${message}`);
}

function sha256(content) {
    return createHash('sha256').update(content).digest('hex');
}

async function workspaceFile(root, declaredPath, label) {
    const segments = declaredPath.split('/');
    if (
        declaredPath.startsWith('/') ||
        segments.some(
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
    for (const [index, segment] of rel.split(sep).entries()) {
        current = resolve(current, segment);
        const metadata = await lstat(current);
        if (metadata.isSymbolicLink())
            fail(`${label} must not traverse a symbolic link`);
        const leaf = index === rel.split(sep).length - 1;
        if (!leaf && !metadata.isDirectory())
            fail(`${label} has a non-directory parent`);
        if (leaf && !metadata.isFile()) fail(`${label} must be a regular file`);
    }
    return absolute;
}

function pngDimensions(content, label) {
    if (
        content.byteLength < 24 ||
        !content.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)
    ) {
        fail(`${label} must be a PNG payload`);
    }
    return {
        width: content.readUInt32BE(16),
        height: content.readUInt32BE(20),
    };
}

async function findFilesNamed(root, expectedName) {
    const matches = [];
    async function visit(directory) {
        for (const entry of await readdir(directory, { withFileTypes: true })) {
            const path = resolve(directory, entry.name);
            if (entry.isSymbolicLink())
                fail('results must not contain symbolic links');
            if (entry.isDirectory()) await visit(path);
            if (entry.isFile() && entry.name === expectedName)
                matches.push(path);
        }
    }
    await visit(root);
    return matches;
}

function assertUnique(values, label) {
    if (new Set(values).size !== values.length) fail(`${label} must be unique`);
}

async function readJson(path, label) {
    try {
        return JSON.parse(await readFile(path, 'utf8'));
    } catch (error) {
        fail(`${label} is invalid JSON (${error.message})`);
    }
}

function validatePlanSemantics(plan, presentation) {
    if (plan.page_id !== presentation.page_id)
        fail('page_id does not match presentation evidence');
    if (plan.presentation_id !== presentation.presentation_id)
        fail('presentation_id does not match presentation evidence');
    if (presentation.status !== 'approved')
        fail('presentation evidence must be approved');
    if (presentation.authority !== 'presentation-only')
        fail('presentation evidence authority must be presentation-only');

    assertUnique(
        plan.cases.map(({ id }) => id),
        'case ids'
    );
    assertUnique(
        plan.cases.map(({ runtime_scenario }) => runtime_scenario.capture_name),
        'capture names'
    );

    const sources = new Map(
        presentation.sources.map((source) => [source.id, source])
    );
    for (const evaluationCase of plan.cases) {
        const source = sources.get(evaluationCase.reference_source_id);
        if (!source)
            fail(
                `case ${evaluationCase.id} references unknown presentation source ${evaluationCase.reference_source_id}`
            );
        if (
            !['screenshot', 'wireframe', 'rendered-interface'].includes(
                source.source_kind
            )
        )
            fail(`case ${evaluationCase.id} reference must be visual`);
        if (source.media_type !== 'image/png')
            fail(`case ${evaluationCase.id} reference must be a PNG`);
        if (
            JSON.stringify(source.viewport) !==
            JSON.stringify(evaluationCase.viewport)
        )
            fail(
                `case ${evaluationCase.id} viewport differs from its reference`
            );
    }
}

async function renderEnvironment(browserMetadata) {
    const playwrightPackagePath =
        require.resolve('@playwright/test/package.json');
    const playwrightPackage = await readJson(
        playwrightPackagePath,
        '@playwright/test package'
    );
    return {
        os: platform(),
        architecture: arch(),
        playwright_version: playwrightPackage.version,
        ...browserMetadata,
        locale: 'fr-FR',
        timezone_id: 'Africa/Abidjan',
        color_scheme: 'light',
        reduced_motion: 'reduce',
    };
}

export async function collectVisualEvaluation({
    workspaceRoot,
    planPath,
    planSchema,
    presentationSchema,
    bundleSchema,
    resultsRoot,
}) {
    const root = await realpath(resolve(workspaceRoot));
    const absolutePlan = await workspaceFile(root, planPath, 'plan');
    const plan = await readJson(absolutePlan, 'plan');
    const planErrors = validateJsonSchema(plan, planSchema);
    if (planErrors.length > 0)
        fail(`plan violates schema\n${planErrors.join('\n')}`);

    const evidencePath = await workspaceFile(
        root,
        plan.presentation_evidence_uri,
        'presentation evidence'
    );
    const presentation = await readJson(evidencePath, 'presentation evidence');
    const presentationErrors = validateJsonSchema(
        presentation,
        presentationSchema
    );
    if (presentationErrors.length > 0)
        fail(
            `presentation evidence violates schema\n${presentationErrors.join('\n')}`
        );
    validatePlanSemantics(plan, presentation);

    const absoluteResults = await realpath(resolve(resultsRoot));
    const resultsRelative = relative(root, absoluteResults);
    if (
        !resultsRelative ||
        resultsRelative === '..' ||
        resultsRelative.startsWith(`..${sep}`)
    ) {
        fail('results root must be inside the workspace');
    }
    const sourceById = new Map(
        presentation.sources.map((source) => [source.id, source])
    );
    const cases = [];
    const browserEnvironments = [];

    for (const evaluationCase of plan.cases) {
        const source = sourceById.get(evaluationCase.reference_source_id);
        const referencePath = await workspaceFile(
            root,
            source.snapshot_uri,
            `reference ${source.id}`
        );
        const referenceContent = await readFile(referencePath);
        if (referenceContent.byteLength !== source.bytes)
            fail(`reference ${source.id} byte length drifted`);
        if (sha256(referenceContent) !== source.sha256)
            fail(`reference ${source.id} sha256 drifted`);

        const specPath = await workspaceFile(
            root,
            evaluationCase.runtime_scenario.spec_uri,
            `case ${evaluationCase.id} spec`
        );
        const specContent = await readFile(specPath, 'utf8');
        if (
            !specContent.includes(
                `test('${evaluationCase.runtime_scenario.test_title}'`
            )
        ) {
            fail(`case ${evaluationCase.id} test title is stale`);
        }

        const matches = await findFilesNamed(
            absoluteResults,
            evaluationCase.runtime_scenario.capture_name
        );
        if (matches.length !== 1)
            fail(
                `case ${evaluationCase.id} expected exactly one ${evaluationCase.runtime_scenario.capture_name}, found ${matches.length}`
            );
        const actualPath = matches[0];
        const actualContent = await readFile(actualPath);
        const metadataName = `${evaluationCase.runtime_scenario.capture_name}.metadata.json`;
        const metadataMatches = await findFilesNamed(
            absoluteResults,
            metadataName
        );
        if (metadataMatches.length !== 1)
            fail(
                `case ${evaluationCase.id} expected exactly one ${metadataName}, found ${metadataMatches.length}`
            );
        if (dirname(metadataMatches[0]) !== dirname(actualPath))
            fail(`case ${evaluationCase.id} browser metadata is detached`);
        const browserMetadata = await readJson(
            metadataMatches[0],
            `case ${evaluationCase.id} browser metadata`
        );
        if (
            browserMetadata.browser_name !== 'chromium' ||
            typeof browserMetadata.browser_version !== 'string' ||
            browserMetadata.browser_version.length === 0 ||
            typeof browserMetadata.browser_channel !== 'string' ||
            browserMetadata.browser_channel.length === 0 ||
            Object.keys(browserMetadata).length !== 3
        ) {
            fail(`case ${evaluationCase.id} browser metadata is invalid`);
        }
        browserEnvironments.push(browserMetadata);
        const referenceDimensions = pngDimensions(
            referenceContent,
            `reference ${source.id}`
        );
        const actualDimensions = pngDimensions(
            actualContent,
            `actual ${evaluationCase.id}`
        );
        const { width, height } = evaluationCase.viewport;
        if (
            referenceDimensions.width !== width ||
            referenceDimensions.height !== height
        ) {
            fail(`reference ${source.id} PNG dimensions differ from viewport`);
        }
        if (
            actualDimensions.width !== width ||
            actualDimensions.height !== height
        )
            fail(
                `actual ${evaluationCase.id} PNG dimensions differ from viewport`
            );

        cases.push({
            id: evaluationCase.id,
            reference_source_id: source.id,
            reference: {
                uri: source.snapshot_uri,
                bytes: referenceContent.byteLength,
                sha256: sha256(referenceContent),
                ...referenceDimensions,
            },
            actual: {
                uri: relative(absoluteResults, actualPath).split(sep).join('/'),
                bytes: actualContent.byteLength,
                sha256: sha256(actualContent),
                ...actualDimensions,
            },
            runtime_scenario: evaluationCase.runtime_scenario,
            review: {
                status: 'pending-human-review',
                authority: 'human',
                dimensions: evaluationCase.review_dimensions,
            },
        });
    }

    if (
        new Set(
            browserEnvironments.map((environment) =>
                JSON.stringify(environment)
            )
        ).size !== 1
    )
        fail('all cases must use the same browser environment');

    const bundle = {
        schema_version: '1.0.0',
        kind: 'visual-evaluation-bundle',
        evaluation_id: plan.evaluation_id,
        page_id: plan.page_id,
        presentation_id: plan.presentation_id,
        status: 'captured-unreviewed',
        render_environment: await renderEnvironment(browserEnvironments[0]),
        cases,
    };
    const bundleErrors = validateJsonSchema(bundle, bundleSchema);
    if (bundleErrors.length > 0)
        fail(`bundle violates schema\n${bundleErrors.join('\n')}`);
    return bundle;
}
