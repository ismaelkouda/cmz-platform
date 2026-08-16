import { createHash } from 'node:crypto';

export function stableStringify(value) {
    if (Array.isArray(value)) {
        return `[${value.map(stableStringify).join(',')}]`;
    }
    if (value !== null && typeof value === 'object') {
        const entries = Object.entries(value)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(
                ([key, child]) =>
                    `${JSON.stringify(key)}:${stableStringify(child)}`
            );
        return `{${entries.join(',')}}`;
    }
    return JSON.stringify(value);
}

export function sha256(value) {
    return createHash('sha256').update(value).digest('hex');
}

export function generationTreeSha256(entries) {
    const treeInput = [...entries]
        .sort((left, right) => left.path.localeCompare(right.path))
        .map(
            (entry) =>
                `${entry.path}\0${entry.artifact_id}\0${entry.owner}\0${entry.write_policy}\0${entry.bytes}\0${entry.sha256}`
        )
        .join('\n');
    return sha256(treeInput);
}

export function buildGenerationManifest(
    model,
    artifactPlan,
    profile,
    rendered
) {
    const modelSha256 = sha256(stableStringify(model));
    if (artifactPlan.input.sha256 !== modelSha256) {
        throw new Error('generation manifest: artifact plan input drifted');
    }
    const artifactsByPath = new Map(
        rendered.artifacts.map(({ path, artifact_id: artifactId }) => [
            path,
            artifactId,
        ])
    );
    if (artifactsByPath.size !== Object.keys(rendered.files).length) {
        throw new Error('generation manifest: incomplete artifact bindings');
    }
    const planById = new Map(
        artifactPlan.artifacts.map((artifact) => [artifact.id, artifact])
    );
    const entries = Object.entries(rendered.files)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([path, content]) => {
            if (
                path.startsWith('/') ||
                path.split('/').includes('..') ||
                !/^[a-z0-9][a-z0-9/._-]*$/.test(path)
            ) {
                throw new Error(
                    `generation manifest: unsafe output path ${path}`
                );
            }
            if (typeof content !== 'string' || content.length === 0) {
                throw new Error(`generation manifest: empty output ${path}`);
            }
            const artifactId = artifactsByPath.get(path);
            const artifact = planById.get(artifactId);
            if (!artifact) {
                throw new Error(
                    `generation manifest: ${path} has no planned artifact`
                );
            }
            return {
                path,
                artifact_id: artifactId,
                owner: artifact.owner,
                write_policy: artifact.write_policy,
                bytes: Buffer.byteLength(content),
                sha256: sha256(content),
            };
        });
    return {
        schema_version: '1.1.0',
        generator: { name: 'cmz-generator-platform', version: '1.2.0' },
        input: {
            model_id: artifactPlan.input.model_id,
            sha256: modelSha256,
        },
        plan: {
            plan_id: artifactPlan.plan_id,
            sha256: sha256(stableStringify(artifactPlan)),
        },
        target: {
            profile_id: profile.id,
            profile_version: profile.version,
            profile_sha256: sha256(stableStringify(profile)),
        },
        files: entries,
        tree_sha256: generationTreeSha256(entries),
    };
}
