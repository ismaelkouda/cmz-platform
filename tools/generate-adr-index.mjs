#!/usr/bin/env node
/**
 * generate-adr-index.mjs
 *
 * Audit E-6 / P1-16 — génère les index ADR depuis docs/adr/*.md :
 *   - docs/adr/README.md  (table Liste)
 *   - docs/README.md      (table Décisions)
 *
 * Marqueurs :
 *   <!-- BEGIN:GENERATED:adr-index -->
 *   …table…
 *   <!-- END:GENERATED:adr-index -->
 *
 * Usage :
 *   node tools/generate-adr-index.mjs
 *   bun run generate:adr-index
 *
 * Appelé aussi par generate-status.mjs / check-docs-freshness.
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ADR_DIR = join(ROOT, 'docs/adr');

/**
 * @param {string} filePath
 * @param {string} blockId
 * @param {string} body
 */
function upsertGeneratedBlock(filePath, blockId, body) {
    const begin = `<!-- BEGIN:GENERATED:${blockId} -->`;
    const end = `<!-- END:GENERATED:${blockId} -->`;
    const block = `${begin}\n${body.trimEnd()}\n${end}`;
    let src = readFileSync(filePath, 'utf8');
    const esc = blockId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(
        `<!-- BEGIN:GENERATED:${esc} -->[\\s\\S]*?<!-- END:GENERATED:${esc} -->`
    );
    if (!re.test(src)) {
        console.error(
            `FAIL  marqueur manquant dans ${relative(ROOT, filePath)} : ${blockId}`
        );
        console.error(`  Attendu : ${begin} … ${end}`);
        process.exit(1);
    }
    src = src.replace(re, () => block);
    writeFileSync(filePath, src, 'utf8');
    console.log(`✅ bloc ${blockId} → ${relative(ROOT, filePath)}`);
}

/**
 * @typedef {{ num: string; file: string; title: string; status: string }} AdrEntry
 */

/** @returns {AdrEntry[]} */
function scanAdrs() {
    const files = readdirSync(ADR_DIR)
        .filter((f) => /^\d{4}-.+\.md$/.test(f))
        .sort();

    /** @type {AdrEntry[]} */
    const entries = [];
    for (const file of files) {
        const text = readFileSync(join(ADR_DIR, file), 'utf8');
        const num = file.slice(0, 4);
        const h1 = text.match(/^#\s+ADR-(\d{4})\s+[—–-]\s+(.+)$/m);
        if (!h1) {
            console.error(`FAIL  titre H1 ADR introuvable : docs/adr/${file}`);
            process.exit(1);
        }
        if (h1[1] !== num) {
            console.error(
                `FAIL  numéro H1 (${h1[1]}) ≠ fichier (${num}) : docs/adr/${file}`
            );
            process.exit(1);
        }
        const title = h1[2].trim();
        const statusLine = text.match(/\*\*Statut\s*:\*\*\s*(.+)/i);
        if (!statusLine) {
            console.error(`FAIL  Statut manquant : docs/adr/${file}`);
            process.exit(1);
        }
        let status = statusLine[1].trim();
        // "Superseded by ADR-XXXX" → Superseded
        if (/^superseded/i.test(status)) status = 'Superseded';
        else if (/^deprecated/i.test(status)) status = 'Deprecated';
        else if (/^proposed/i.test(status)) status = 'Proposed';
        else if (/^accepted/i.test(status)) status = 'Accepted';
        // sinon garder le libellé brut (première ligne)

        entries.push({ num, file, title, status });
    }
    return entries;
}

/** Pad markdown table cells for readability (optional aesthetic). */
function pad(s, width) {
    return s.length >= width ? s : s + ' '.repeat(width - s.length);
}

function buildAdrReadmeTable(entries) {
    const rows = entries.map((e) => {
        const link = `[${e.num}](./${e.file})`;
        return `| ${pad(link, 57)} | ${pad(e.title, 56)} | ${pad(e.status, 8)} |`;
    });
    return [
        '| N°                                                        | Titre                                                      | Statut   |',
        '| --------------------------------------------------------- | ---------------------------------------------------------- | -------- |',
        ...rows,
    ].join('\n');
}

function buildDocsReadmeTable(entries) {
    const rows = entries.map((e) => {
        const link = `[${e.num}](./adr/${e.file})`;
        return `| ${pad(link, 59)} | ${pad(e.title, 56)} |`;
    });
    return [
        '| N°                                                            | Titre                                                      |',
        '| ------------------------------------------------------------- | ---------------------------------------------------------- |',
        ...rows,
    ].join('\n');
}

const entries = scanAdrs();
if (entries.length === 0) {
    console.error('FAIL  aucun ADR NNNN-*.md dans docs/adr/');
    process.exit(1);
}

upsertGeneratedBlock(
    join(ADR_DIR, 'README.md'),
    'adr-index',
    buildAdrReadmeTable(entries)
);
upsertGeneratedBlock(
    join(ROOT, 'docs/README.md'),
    'adr-index',
    buildDocsReadmeTable(entries)
);

console.log(
    `✅ index ADR — ${entries.length} décisions (docs/adr/README.md + docs/README.md)`
);
