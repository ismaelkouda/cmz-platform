const TARGETS = Object.freeze({
    'angular-pwa': Object.freeze({
        profile: 'angular-pwa',
        archetypeStack: 'angular',
        requiredFiles: Object.freeze([
            'page.component.html',
            'page.component.scss',
            'page.component.spec.ts',
            'page.component.ts',
            'realization-evidence.json',
        ]),
        additionalFile:
            /^page\.[a-z][a-z0-9-]*\.component\.(?:html|scss|spec\.ts|ts)$/,
    }),
    'react-spa': Object.freeze({
        profile: 'react-spa',
        archetypeStack: 'reactjs',
        requiredFiles: Object.freeze([
            'page.module.scss',
            'page.spec.tsx',
            'page.tsx',
            'realization-evidence.json',
        ]),
        additionalFile:
            /^page-[a-z][a-z0-9-]*\.(?:module\.scss|spec\.(?:ts|tsx)|ts|tsx)$/,
        protectedAdditionalFile: /^page-host(?:\.|-)/,
    }),
});

function fail(message) {
    throw new Error(`page realization: ${message}`);
}

export function resolvePageRealizationTarget(profile) {
    const target = TARGETS[profile];
    if (!target) fail(`unsupported application profile ${profile}`);
    return target;
}

export function pageRealizationAllowedFiles(target, additionalFiles = []) {
    const normalized = [...new Set(additionalFiles)].sort();
    if (
        normalized.length !== additionalFiles.length ||
        normalized.some(
            (file) =>
                typeof file !== 'string' ||
                !target.additionalFile.test(file) ||
                target.protectedAdditionalFile?.test(file) ||
                target.requiredFiles.includes(file)
        )
    ) {
        fail(
            `additional page files do not follow the ${target.profile} page naming convention or are duplicated`
        );
    }
    return [...target.requiredFiles, ...normalized];
}

export function additionalPageRealizationFiles(workOrder, target) {
    if (!Array.isArray(workOrder.allowed_files))
        fail('work order allowed_files must be an array');
    const required = workOrder.allowed_files.slice(
        0,
        target.requiredFiles.length
    );
    if (JSON.stringify(required) !== JSON.stringify(target.requiredFiles)) {
        fail('work order required page files drifted');
    }
    const additional = workOrder.allowed_files.slice(
        target.requiredFiles.length
    );
    if (
        JSON.stringify(pageRealizationAllowedFiles(target, additional)) !==
        JSON.stringify(workOrder.allowed_files)
    ) {
        fail('work order additional page files are not canonical');
    }
    return additional;
}
