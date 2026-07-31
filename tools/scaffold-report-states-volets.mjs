#!/usr/bin/env node
/**
 * Scaffold report-states per-volet IR from finalization templates.
 * Usage: node tools/scaffold-report-states-volets.mjs
 */
import {
    cpSync,
    existsSync,
    mkdirSync,
    readdirSync,
    readFileSync,
    rmSync,
    statSync,
    writeFileSync,
} from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const FIN = join(ROOT, 'libs/finalization');
const RS = join(ROOT, 'libs/report-states');

/** @type {Record<string, { src: string; endpoint: string; rbac: string; i18n: string }>} */
const VOLETS = {
    approve: {
        src: 'queues',
        endpoint: 'APPROVE',
        rbac: '/report-status/approved',
        i18n: 'APPROVE',
    },
    evaluate: {
        src: 'tasks',
        endpoint: 'EVALUATE',
        rbac: '/report-status/evaluated',
        i18n: 'EVALUATE',
    },
    close: {
        src: 'all',
        endpoint: 'CLOSE',
        rbac: '/report-status/closed',
        i18n: 'CLOSE',
    },
    reject: {
        src: 'queues',
        endpoint: 'REJECT',
        rbac: '/report-status/rejected',
        i18n: 'REJECT',
    },
};

/** @param {string} s @param {string} volet @param {string} Volet @param {typeof VOLETS.approve} cfg */
function transformContent(s, volet, Volet, cfg) {
    const src = cfg.src;
    const Src = src.charAt(0).toUpperCase() + src.slice(1);

    let out = s;
    const pairs = [
        [`${src}-finalization`, `${volet}-report-states`],
        [`${Src}Finalization`, `${Volet}ReportStates`],
        [`${src}Finalization`, `${volet}ReportStates`],
        [
            `${src.toUpperCase()}_FINALIZATION`,
            `${volet.toUpperCase()}_REPORT_STATES`,
        ],
        ['FINALIZATION_ENDPOINTS', 'REPORT_STATES_ENDPOINTS'],
        ['@cmz/finalization-', '@cmz/report-states-'],
        ['finalization/', 'report-states/'],
        ['FinalizationSection', 'ReportStateSection'],
        [`FINALIZATION.${Src.toUpperCase()}`, `REPORT_STATES.${cfg.i18n}`],
        [
            `FINALIZATION_${src.toUpperCase()}_ROUTE`,
            `REPORT_STATES_${volet.toUpperCase()}_ROUTE`,
        ],
        [
            `FINALIZATION_ENDPOINTS.${Src.toUpperCase()}`,
            `REPORT_STATES_ENDPOINTS.${cfg.endpoint}`,
        ],
        [
            `FINALIZATION_ENDPOINTS.${Src.toUpperCase()}_EXPORT`,
            `REPORT_STATES_ENDPOINTS.${cfg.endpoint}_EXPORT`,
        ],
        ['finalization-list-export', 'report-states-list-export'],
        ['exportFinalizationList', 'exportReportStatesList'],
        ['finalizationListExport', 'reportStatesListExport'],
        ['finalization-filter-wire', 'report-states-filter-wire'],
        ['FinalizationDetails', 'ReportStatesDetails'],
        ['finalization-details', 'report-states-details'],
    ];
    for (const [from, to] of pairs) {
        out = out.split(from).join(to);
    }
    // RBAC path in constants
    out = out.replace(
        /FINALIZATION_[A-Z_]+_ROUTE/g,
        `REPORT_STATES_${volet.toUpperCase()}_ROUTE`
    );
    out = out.replace(
        new RegExp(`'/reports-finalization/[^']+'`, 'g'),
        `'${cfg.rbac}'`
    );
    return out;
}

/** @param {string} dir */
function walkTs(dir, acc = []) {
    for (const e of readdirSync(dir)) {
        const p = join(dir, e);
        if (statSync(p).isDirectory()) walkTs(p, acc);
        else if (e.endsWith('.ts') && !e.endsWith('.spec.ts')) acc.push(p);
    }
    return acc;
}

/** @param {string} volet @param {typeof VOLETS.approve} cfg */
function scaffoldVolet(volet, cfg) {
    const src = cfg.src;
    const Volet = volet.charAt(0).toUpperCase() + volet.slice(1);
    const patterns = [`${src}-finalization`];

    for (const layer of ['domain', 'data', 'application', 'ui']) {
        const srcRoot = join(FIN, layer, 'src');
        if (!existsSync(srcRoot)) continue;
        for (const file of walkTs(srcRoot)) {
            const rel = relative(srcRoot, file);
            if (!patterns.some((p) => rel.includes(p))) continue;
            const destRel = rel
                .replace(
                    new RegExp(`${src}-finalization`, 'g'),
                    `${volet}-report-states`
                )
                .replace(/finalization/g, 'report-states');
            const dest = join(RS, layer, 'src', destRel);
            mkdirSync(dirname(dest), { recursive: true });
            const content = transformContent(
                readFileSync(file, 'utf8'),
                volet,
                Volet,
                cfg
            );
            writeFileSync(dest, content, 'utf8');
            console.log(`+ ${relative(ROOT, dest)}`);
        }
    }
}

// Shared UI utils from finalization
for (const util of [
    'ui/src/lib/utils/finalization-filter-wire.util.ts',
    'ui/src/lib/utils/finalization-list-export.util.ts',
    'ui/src/lib/constants/finalization-paths.constant.ts',
]) {
    const srcFile = join(FIN, util);
    const destName = basename(util).replace('finalization', 'report-states');
    const dest = join(
        RS,
        'ui/src/lib',
        util.includes('constants') ? 'constants' : 'utils',
        destName
    );
    mkdirSync(dirname(dest), { recursive: true });
    let content = readFileSync(srcFile, 'utf8');
    content = transformContent(content, 'approve', 'Approve', VOLETS.approve);
    content = content.replace(
        /REPORT_STATES_APPROVE_ROUTE/g,
        'REPORT_STATES_APPROVE_ROUTE'
    );
    writeFileSync(dest, content, 'utf8');
    console.log(`+ ${relative(ROOT, dest)}`);
}

for (const [volet, cfg] of Object.entries(VOLETS)) {
    scaffoldVolet(volet, cfg);
}

console.log(
    '\nDone. Update endpoints, index.ts exports, providers, routes manually.'
);
