/**
 * layered-artifact-binding.mjs — étape 2 du chantier « générateur en
 * couches » (ADR-0003 §5d).
 *
 * `bindRenderedArtifacts` (core/artifact-plan.mjs) exige que TOUTES les
 * responsabilités du plan soient couvertes par un seul appel — correct
 * pour la sortie plate actuelle (un package = un appel), mais inadapté à
 * une sortie en couches où chaque package (domain/data/application) ne
 * couvre qu'un sous-ensemble des responsabilités du même plan partagé.
 *
 * `bindLayeredArtifacts` applique la même discipline (chaque fichier a un
 * artifact_id planifié, aucun artifact non couvert) mais restreinte au
 * sous-plan des responsabilités dont `layer` correspond à la couche
 * courante, ou vaut `per-layer` (répété dans chaque couche : project.json,
 * tsconfig.json, index.ts — voir core/artifact-plan.mjs).
 *
 * N'appartient PAS à core/artifact-plan.mjs : ce module n'est utilisé que
 * par les renderers *-layered, jamais par le pipeline de publication actif.
 */
function assert(condition, message) {
    if (!condition) throw new Error(`layered artifact binding: ${message}`);
}

export function bindLayeredArtifacts(plan, layer, files, bindings) {
    const plannedForLayer = new Set(
        plan.artifacts
            .filter(
                (artifact) =>
                    artifact.layer === layer || artifact.layer === 'per-layer'
            )
            .map(({ id }) => id)
    );
    const paths = Object.keys(files).sort();
    const boundPaths = Object.keys(bindings).sort();
    assert(
        JSON.stringify(paths) === JSON.stringify(boundPaths),
        `${layer}: renderer bindings must cover every file exactly once`
    );
    const used = new Set();
    const artifacts = paths.map((path) => {
        const artifactId = bindings[path];
        assert(
            plannedForLayer.has(artifactId),
            `${layer}/${path}: ${artifactId} is not planned for this layer`
        );
        used.add(artifactId);
        return { path, artifact_id: artifactId };
    });
    for (const artifactId of plannedForLayer) {
        assert(
            used.has(artifactId),
            `${layer}/${artifactId}: not materialized`
        );
    }
    return { files, artifacts };
}
