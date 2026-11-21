// X4-sécurité-3 : un produit fictif composé, son bon de travail et ses deux
// bases (page adaptée, acceptée ; page d'origine, à l'octet), pour juger la
// grammaire seule : monde fermé par symbole et diagnostics du vérificateur
// hors jeu (conception v1 §6.3).
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { pageGrammarFindings } from '../core/page-grammar/index.mjs';
import { formatViolation } from '../core/page-grammar/text.mjs';
import { sha256 } from '../core/generation-manifest.mjs';
import {
    connexionOriginalRealizationFiles,
    connexionRealizationFiles,
} from './external-realization-fixture.mjs';
import {
    composedProduct,
    prepare,
    workOrderOf,
} from './external-realization-product.mjs';

export const PAGE_FILES = Object.freeze([
    'page.component.ts',
    'page.component.html',
    'page.component.scss',
]);

const pageOnly = (files) =>
    Object.fromEntries(PAGE_FILES.map((name) => [name, files[name]]));

export async function grammarFixture(t, domain = 'observatory') {
    const product = await composedProduct(t, domain);
    await prepare(product);
    const workOrder = await workOrderOf(product);
    const contract = await readFile(
        join(product.app, workOrder.page_contract.path)
    );
    const pageContract = JSON.parse(contract);
    const options = {
        pageContract,
        contractSha256: sha256(contract),
        composition: workOrder.composition.module,
    };
    const findings = (files) =>
        pageGrammarFindings({ files, workOrder, pageContract });
    return {
        product,
        workOrder,
        pageContract,
        adapted: pageOnly(connexionRealizationFiles(options)),
        original: pageOnly(connexionOriginalRealizationFiles(options)),
        findings,
        violations: (files) => findings(files).map(formatViolation),
    };
}

// Texte inséré à une ancre unique d'un fichier ; rend les fichiers et
// l'intervalle inséré.
export function insertAt(files, name, anchor, text, { after = true } = {}) {
    const source = files[name];
    if (source.split(anchor).length !== 2)
        throw new Error(`anchor is not unique: ${JSON.stringify(anchor)}`);
    const start = source.indexOf(anchor) + (after ? anchor.length : 0);
    return {
        files: {
            ...files,
            [name]: source.slice(0, start) + text + source.slice(start),
        },
        interval: { file: name, start, end: start + text.length },
    };
}

export const insideInterval = (finding, interval) =>
    finding.file === interval.file &&
    finding.start >= interval.start &&
    finding.start <= interval.end;
