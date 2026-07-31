#!/usr/bin/env node
/**
 * Transforme libs/finalization (copie fraîche de requests) en module finalization.
 * Usage : rsync requests → finalization puis `node tools/scaffold-finalization.mjs`
 */
import {
    readdirSync,
    statSync,
    renameSync,
    readFileSync,
    writeFileSync,
    mkdirSync,
} from 'node:fs';
import { join, dirname, basename } from 'node:path';

const ROOT = 'libs/finalization';
const SKIP = new Set(['node_modules', 'dist', 'out-tsc']);

function walk(dir, cb) {
    for (const e of readdirSync(dir)) {
        if (SKIP.has(e)) continue;
        const p = join(dir, e);
        if (statSync(p).isDirectory()) walk(p, cb);
        else cb(p);
    }
}

function renameFile(p) {
    const dir = dirname(p);
    let name = basename(p);
    name = name
        .replace(/-requests-/g, '-finalization-')
        .replace(/-requests\./g, '-finalization.')
        .replace(/^requests-/g, 'finalization-');
    const np = join(dir, name);
    if (np !== p) {
        mkdirSync(dir, { recursive: true });
        renameSync(p, np);
        return np;
    }
    return p;
}

// 1. Rename files (deepest first)
const allFiles = [];
walk(ROOT, (p) => allFiles.push(p));
for (const p of allFiles.sort((a, b) => b.length - a.length)) {
    renameFile(p);
}

const TEXT_REPLACEMENTS = [
    ['QueuesRequests', 'QueuesFinalization'],
    ['TasksRequests', 'TasksFinalization'],
    ['AllRequests', 'AllFinalization'],
    ['RequestsDetails', 'FinalizationDetails'],
    ['requestsDetails', 'finalizationDetails'],
    ['queuesRequests', 'queuesFinalization'],
    ['tasksRequests', 'tasksFinalization'],
    ['allRequests', 'allFinalization'],
    ['RequestsSection', 'FinalizationSection'],
    ['RequestsAllStatus', 'FinalizationAllState'],
    ['isRequestsAllStatus', 'isFinalizationAllState'],
    ['requestsAllStatus', 'finalizationAllState'],
    ['REQUESTS_QUEUES_ROUTE', 'FINALIZATION_QUEUES_ROUTE'],
    ['REQUESTS_TASKS_ROUTE', 'FINALIZATION_TASKS_ROUTE'],
    ['REQUESTS_ALL_ROUTE', 'FINALIZATION_ALL_ROUTE'],
    ['REQUESTS_ENDPOINTS', 'FINALIZATION_ENDPOINTS'],
    ['REQUESTS_ROUTES', 'FINALIZATION_ROUTES'],
    ['provideRequests', 'provideFinalization'],
    ['@cmz/requests-', '@cmz/finalization-'],
    ['scope:requests', 'scope:finalization'],
    ['libs/requests/', 'libs/finalization/'],
    ['tag:scope:requests', 'tag:scope:finalization'],
    ['requests/queues', 'finalizations/queues'],
    ['requests/task-baskets', 'finalizations/task-baskets'],
    ['requests/qualified', 'finalizations'],
    ['DETAILS_REQUESTS', 'DETAILS_FINALIZATIONS'],
    ['TypeReport.REQUESTS', 'TypeReport.FINALIZATION'],
    ['/requests/queues', '/reports-finalization/queues'],
    ['/requests/tasks', '/reports-finalization/tasks'],
    ['/requests/all', '/reports-finalization/all'],
    ['exportRequestsList', 'exportFinalizationList'],
    ['requestsListExport', 'finalizationListExport'],
    ['requests-filter-wire', 'finalization-filter-wire'],
    ['requests-filter.mapper', 'finalization-filter.mapper'],
    ['requests-list-export', 'finalization-list-export'],
    ['requests-paths', 'finalization-paths'],
    ['requests-section', 'finalization-section'],
    ['requests-all-status', 'finalization-all-state'],
    ['requests-rbac-paths', 'finalization-rbac-paths'],
    ['requests-details-', 'finalization-details-'],
    ['requests.routes', 'finalization.routes'],
    ['requests.providers', 'finalization.providers'],
    ['requests.endpoints', 'finalization.endpoints'],
    ['cmz-requests-', 'cmz-finalization-'],
    ['RequestsPage', 'FinalizationPage'],
    ['REQUESTS.', 'FINALIZATION.'],
    ["permissionGuard('requests'", "permissionGuard('finalization'"],
    ["'requests'", "'finalization'"],
    ['canQualify', 'canFinalize'],
    ['NO_PERMISSION_QUALIFY', 'NO_PERMISSION_FINALIZE'],
    ['qualify', 'finalize'],
    ['Qualify', 'Finalize'],
    ['QUALIFY', 'FINALIZE'],
];

walk(ROOT, (p) => {
    if (!/\.(ts|json)$/.test(p)) return;
    let c = readFileSync(p, 'utf8');
    for (const [from, to] of TEXT_REPLACEMENTS) {
        c = c.split(from).join(to);
    }
    writeFileSync(p, c);
});

// Fix project names in project.json
walk(ROOT, (p) => {
    if (!p.endsWith('project.json')) return;
    let c = readFileSync(p, 'utf8');
    c = c.replace(/@cmz\/requests-/g, '@cmz/finalization-');
    writeFileSync(p, c);
});

console.log('✅ scaffold-finalization.mjs terminé');
