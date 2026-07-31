#!/usr/bin/env node
/**
 * Scaffolding one-shot : copie `libs/processing` → `libs/requests` avec renommage.
 * Écarts legacy requests appliqués après (status all, endpoints, presenters).
 */
import {
    cpSync,
    existsSync,
    readdirSync,
    renameSync,
    readFileSync,
    writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const SRC = join(ROOT, 'libs/processing');
const DEST = join(ROOT, 'libs/requests');

if (existsSync(DEST)) {
    console.error('libs/requests existe déjà — abort');
    process.exit(1);
}

cpSync(SRC, DEST, { recursive: true });

/** @param {string} dir */
function renameProcessingFiles(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
            renameProcessingFiles(full);
            if (entry.name.includes('processing')) {
                renameSync(
                    full,
                    join(dir, entry.name.replace(/processing/g, 'requests'))
                );
            }
        } else if (entry.name.includes('processing')) {
            renameSync(
                full,
                join(dir, entry.name.replace(/processing/g, 'requests'))
            );
        }
    }
}

renameProcessingFiles(DEST);

const REPLACEMENTS = [
    ['QueuesProcessing', 'QueuesRequests'],
    ['TasksProcessing', 'TasksRequests'],
    ['AllProcessing', 'AllRequests'],
    ['ProcessingList', 'RequestsList'],
    ['processingList', 'requestsList'],
    ['queuesProcessing', 'queuesRequests'],
    ['tasksProcessing', 'tasksRequests'],
    ['allProcessing', 'allRequests'],
    ['ProcessingSection', 'RequestsSection'],
    ['ProcessingAllState', 'RequestsAllStatus'],
    ['isProcessingAllState', 'isRequestsAllStatus'],
    ['processing-all-state', 'requests-all-status'],
    ['@cmz/processing-', '@cmz/requests-'],
    ['scope:processing', 'scope:requests'],
    ['TypeReport.PROCESSING', 'TypeReport.REQUESTS'],
    ['PROCESSING.', 'REQUESTS.'],
    ['provideProcessing', 'provideRequests'],
    ['PROCESSING_ROUTES', 'REQUESTS_ROUTES'],
    ['PROCESSING_ENDPOINTS', 'REQUESTS_ENDPOINTS'],
    [
        'processing-list-filter-api.mapper.util',
        'requests-list-filter-api.mapper.util',
    ],
    ['processing-list-filter-props.util', 'requests-list-filter-props.util'],
    ['queues-processing-filter.validator', 'queues-requests-filter.validator'],
    ['tasks-processing-filter.validator', 'tasks-requests-filter.validator'],
    ['all-processing-filter.validator', 'all-requests-filter.validator'],
    ['queues-processing-filter.vo', 'queues-requests-filter.vo'],
    ['tasks-processing-filter.vo', 'tasks-requests-filter.vo'],
    ['all-processing-filter.vo', 'all-requests-filter.vo'],
    ['processing-list-filter.props', 'requests-list-filter.props'],
    ['queues-processing-filter.contract', 'queues-requests-filter.contract'],
    ['tasks-processing-filter.contract', 'tasks-requests-filter.contract'],
    ['all-processing-filter.contract', 'all-requests-filter.contract'],
    ['processing-list-filter-keys', 'requests-list-filter-keys'],
    ['processing-filter.mapper.spec', 'requests-filter.mapper.spec'],
    ['libs/processing/', 'libs/requests/'],
    ['Processing', 'Requests'],
    ['processing', 'requests'],
];

/** @param {string} dir */
function transformContents(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
            transformContents(full);
        } else if (/\.(ts|json|md)$/.test(entry.name)) {
            let content = readFileSync(full, 'utf8');
            for (const [from, to] of REPLACEMENTS) {
                content = content.split(from).join(to);
            }
            writeFileSync(full, content);
        }
    }
}

transformContents(DEST);
console.log('Scaffolded libs/requests from processing');
