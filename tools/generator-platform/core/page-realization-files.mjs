export const REQUIRED_PAGE_REALIZATION_FILES = [
    'page.component.html',
    'page.component.scss',
    'page.component.spec.ts',
    'page.component.ts',
    'realization-evidence.json',
];

const PAGE_PART_FILE =
    /^page\.[a-z][a-z0-9-]*\.component\.(?:html|scss|spec\.ts|ts)$/;

function fail(message) {
    throw new Error(`page realization: ${message}`);
}

export function pageRealizationAllowedFiles(additionalFiles = []) {
    const normalized = [...new Set(additionalFiles)].sort();
    if (
        normalized.length !== additionalFiles.length ||
        normalized.some(
            (file) =>
                typeof file !== 'string' ||
                !PAGE_PART_FILE.test(file) ||
                REQUIRED_PAGE_REALIZATION_FILES.includes(file)
        )
    ) {
        fail(
            'additional page files must be unique page.<part>.component.{ts,html,scss,spec.ts} basenames'
        );
    }
    return [...REQUIRED_PAGE_REALIZATION_FILES, ...normalized];
}

export function additionalPageRealizationFiles(workOrder) {
    if (!Array.isArray(workOrder.allowed_files))
        fail('work order allowed_files must be an array');
    const required = workOrder.allowed_files.slice(
        0,
        REQUIRED_PAGE_REALIZATION_FILES.length
    );
    if (
        JSON.stringify(required) !==
        JSON.stringify(REQUIRED_PAGE_REALIZATION_FILES)
    ) {
        fail('work order required page files drifted');
    }
    const additional = workOrder.allowed_files.slice(
        REQUIRED_PAGE_REALIZATION_FILES.length
    );
    if (
        JSON.stringify(pageRealizationAllowedFiles(additional)) !==
        JSON.stringify(workOrder.allowed_files)
    ) {
        fail('work order additional page files are not canonical');
    }
    return additional;
}
