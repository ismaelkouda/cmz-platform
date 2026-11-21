// X4-sécurité-3 (conception v1 §6.5, v2 §7 point 3) : rejeu des corpus par
// nom sur deux bases.
//   - Base adaptée, acceptée : c'est la PREUVE. Chaque insertion doit donner
//     au moins une violation `grammar:`, toutes commençant dans l'intervalle
//     inséré.
//   - Base d'origine, à l'octet, déjà refusée : CORROBORATION par
//     attribution différentielle (violations de la sonde moins celles de la
//     base, décalées de la longueur insérée). Un écart d'alignement est
//     signalé, il ne fait pas échouer la preuve.
import { pageGrammarFindings } from '../core/page-grammar/index.mjs';

// Carte d'ancres revue (v1 §6.5) : ancre de la base d'origine → ancre de la
// base adaptée. Le texte inséré reste à l'octet.
export const ADAPTED_ANCHORS = Object.freeze({
    '    private readonly injector = inject(Injector);':
        '    private readonly composition = inject(PageComposition);',
    '        const target = event.target;':
        '        this.values.update((current) => ({ ...current, [control]: value }));',
    "        '(window:offline)': 'online.set(false)',\n    },":
        "        class: 'page-host',\n    },",
    "'(window:offline)': 'online.set(false)',": "class: 'page-host',",
    '<main data-cmz-id="main" aria-label="Report form" class="page">':
        '<main data-cmz-id="main" aria-label="Report form" class="page">',
    'providers: [...PAGE_COMPOSITION_PROVIDERS],':
        'providers: [...PAGE_COMPOSITION_PROVIDERS],',
});

// Insertions d'une sonde : une ou plusieurs, chacune [fichier, texte, mode,
// ancre]. `append` ajoute à la fin, `prepend` au début, `replace` insère
// après l'ancre (l'ancre reste).
export function insertionsOf(probe) {
    if (Array.isArray(probe.text))
        return probe.text.map(([file, text, mode, find]) => ({
            file,
            text,
            mode: mode ?? 'append',
            find,
        }));
    return [
        {
            file: probe.file,
            text: probe.text,
            mode: probe.mode ?? 'append',
            find: probe.find,
        },
    ];
}

// Fichiers sondés et intervalles insérés, par fichier.
export function insert(files, insertions, { adapted }) {
    const result = { ...files };
    const intervals = [];
    for (const entry of insertions) {
        const original = result[entry.file];
        let find = entry.find;
        if (entry.mode === 'replace' && adapted) {
            if (!Object.hasOwn(ADAPTED_ANCHORS, find))
                throw new Error(
                    `no adapted anchor for ${JSON.stringify(find)}`
                );
            find = ADAPTED_ANCHORS[find];
        }
        let start;
        if (entry.mode === 'prepend') start = 0;
        else if (entry.mode === 'replace') {
            if (original.split(find).length !== 2)
                throw new Error(
                    `anchor is not unique: ${JSON.stringify(find)}`
                );
            start = original.indexOf(find) + find.length;
        } else start = original.length;
        // Un intervalle déjà posé dans ce fichier se décale s'il suit.
        for (const interval of intervals)
            if (interval.file === entry.file && interval.start >= start) {
                interval.start += entry.text.length;
                interval.end += entry.text.length;
            }
        result[entry.file] =
            original.slice(0, start) + entry.text + original.slice(start);
        intervals.push({
            file: entry.file,
            start,
            end: start + entry.text.length,
        });
    }
    return { files: result, intervals };
}

const inside = (finding, intervals) =>
    intervals.some(
        (interval) =>
            interval.file === finding.file &&
            finding.start >= interval.start &&
            finding.start <= interval.end
    );

// Preuve sur la base adaptée.
export function adaptedVerdict({ base, probe, workOrder, pageContract }) {
    const { files, intervals } = insert(base, insertionsOf(probe), {
        adapted: true,
    });
    const findings = pageGrammarFindings({ files, workOrder, pageContract });
    const outside = findings.filter((finding) => !inside(finding, intervals));
    return {
        id: probe.id,
        refused: findings.length > 0,
        contained: findings.length > 0 && outside.length === 0,
        codes: [...new Set(findings.map((finding) => finding.code))].sort(),
        outside: outside.map(
            (finding) => `${finding.code}@${finding.file}:${finding.line}`
        ),
        files,
    };
}

// Corroboration sur la base d'origine : attribution différentielle.
export function originalVerdict({ base, probe, workOrder, pageContract }) {
    const baseline = pageGrammarFindings({
        files: base,
        workOrder,
        pageContract,
    });
    const { files, intervals } = insert(base, insertionsOf(probe), {
        adapted: false,
    });
    const findings = pageGrammarFindings({ files, workOrder, pageContract });
    const shift = (finding) => {
        let offset = 0;
        for (const interval of intervals)
            if (interval.file === finding.file && interval.end <= finding.start)
                offset += interval.end - interval.start;
        return `${finding.code}|${finding.file}|${finding.start - offset}|${finding.message}`;
    };
    const known = new Map();
    for (const finding of baseline)
        known.set(
            `${finding.code}|${finding.file}|${finding.start}|${finding.message}`,
            (known.get(
                `${finding.code}|${finding.file}|${finding.start}|${finding.message}`
            ) ?? 0) + 1
        );
    const remaining = [];
    for (const finding of findings) {
        const key = shift(finding);
        if (known.get(key)) known.set(key, known.get(key) - 1);
        else remaining.push(finding);
    }
    return {
        id: probe.id,
        attributed: remaining.length > 0,
        aligned:
            remaining.length > 0 &&
            remaining.every((finding) => inside(finding, intervals)),
        codes: [...new Set(remaining.map((finding) => finding.code))].sort(),
    };
}
