export const CREATE_MODULE_DEFERRED_CI_GATES = Object.freeze([
    Object.freeze({
        script: 'check:names',
        direct: 'node tools/check-project-names.mjs',
        reason: 'audit global de tous les noms de projets',
    }),
    Object.freeze({
        script: 'check:targets',
        direct: 'bun run check:targets',
        reason: 'audit global des targets de toutes les bibliothèques',
    }),
    Object.freeze({
        script: 'check:declared-deps',
        direct: 'bun run check:declared-deps',
        reason: 'audit global des dépendances de toutes les bibliothèques',
    }),
]);

function assertProjectNames(projectNames) {
    if (
        !Array.isArray(projectNames) ||
        projectNames.length === 0 ||
        projectNames.some(
            (name) =>
                typeof name !== 'string' ||
                !/^@cmz\/[a-z][a-z0-9-]+-[a-z]+$/.test(name)
        ) ||
        new Set(projectNames).size !== projectNames.length
    )
        throw new Error(
            'Projets de création invalides pour les gates ciblées.'
        );
}

export function createModuleLocalGateCommands(projectNames, outputRoot) {
    assertProjectNames(projectNames);
    if (!/^libs\/[a-z][a-z0-9-]*$/.test(outputRoot ?? ''))
        throw new Error('Sortie de création invalide pour les gates ciblées.');
    return [
        {
            id: 'install',
            command: 'bun',
            args: ['install', '--ignore-scripts'],
        },
        ...projectNames.map((project) => ({
            id: 'build',
            command: 'bunx',
            args: ['nx', 'run', `${project}:build`],
        })),
        {
            id: 'lint',
            command: 'bunx',
            args: [
                'nx',
                'run-many',
                '--target=lint',
                `--projects=${projectNames.join(',')}`,
                '--parallel=3',
            ],
        },
        {
            id: 'format',
            command: 'bunx',
            args: ['prettier', '--check', outputRoot],
        },
    ];
}
