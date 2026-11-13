// X5 C5b, N5-navigateur (conception C5 v2 §4, C5b v2 §5) : jugement des
// témoins d'une page à lectures mesurés dans le navigateur. Pour chaque
// lecture de `read_states`, chaque état doit être rendu par une branche
// VISIBLE (visibilité calculée, C-B+4 : display, visibility, opacity,
// font-size), au texte non vide ; la branche hors ligne aussi ; dans l'état
// succès, chaque texte d'absence déclaré doit apparaître, visible.
//
// En C5b : le jugement et sa ligne de commande seulement. La mesure dans
// Chromium (copie jetable du produit de la preuve native, serveur fictif),
// l'entrée `package.json`, l'étape CI et `check:ci-wiring` viennent ENSEMBLE
// en C6, avec la première exécution réelle.
//
// Usage : node check-page-read-witnesses.mjs --work-order <bon de travail>
//         --report <rapport de témoins>
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export const READ_WITNESS_REPORT_VERSION = '1.0.0';

// Visibilité calculée d'un nœud témoin, telle que `getComputedStyle` la rend.
export function invisibility(visible) {
    if (!visible || typeof visible !== 'object') return 'no computed style';
    if (visible.display === 'none') return 'display: none';
    if (visible.visibility === 'hidden' || visible.visibility === 'collapse')
        return `visibility: ${visible.visibility}`;
    if (!(Number(visible.opacity) > 0)) return `opacity: ${visible.opacity}`;
    if (!(Number.parseFloat(visible.font_size) > 0))
        return `font-size: ${visible.font_size}`;
    return undefined;
}

function branchFailure(branch) {
    if (!branch?.present) return 'no rendered branch';
    if (typeof branch.text !== 'string' || !branch.text.trim())
        return 'empty branch text';
    return invisibility(branch.visible);
}

// Échecs nommés ; un rapport conforme rend [].
export function judgeReadWitnesses(readStates, report) {
    const failures = [];
    const fail = (where, why) => failures.push(`${where}: ${why}`);
    if (report?.schema_version !== READ_WITNESS_REPORT_VERSION)
        return [
            `report: schema_version must be ${READ_WITNESS_REPORT_VERSION}`,
        ];
    const offline = branchFailure(report.offline);
    if (offline) fail(`offline (${readStates.online_access})`, offline);
    const measured = new Map(
        (report.reads ?? []).map((entry) => [entry.member, entry])
    );
    for (const member of measured.keys())
        if (!readStates.reads.some((read) => read.member === member))
            fail(`read ${member}`, 'not declared in read_states');
    for (const read of readStates.reads) {
        const entry = measured.get(read.member);
        if (!entry) {
            fail(`read ${read.member}`, 'no witness');
            continue;
        }
        const observed = new Map(
            (entry.observations ?? []).map((item) => [item.state, item])
        );
        for (const state of observed.keys())
            if (!Object.hasOwn(read.states, state))
                fail(`${read.member}.${state}`, 'unknown state');
        for (const state of Object.keys(read.states)) {
            const why = branchFailure(observed.get(state)?.branch);
            if (why) fail(`${read.member}.${state}`, why);
        }
        const success = observed.get('success');
        for (const binding of read.bindings) {
            if (!binding.absent_access) continue;
            const absent = (success?.absent ?? []).find(
                (item) => item.binding_id === binding.binding_id
            );
            const where = `${read.member}.success.${binding.absent_access}`;
            if (!(absent?.count > 0)) fail(where, 'absent text not shown');
            else {
                const why = invisibility(absent.visible);
                if (why) fail(where, why);
            }
        }
    }
    return failures;
}

function argument(name) {
    const index = process.argv.indexOf(name);
    return index > 0 ? process.argv[index + 1] : undefined;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const workOrderPath = argument('--work-order');
    const reportPath = argument('--report');
    if (!workOrderPath || !reportPath) {
        console.error('usage: --work-order <path> --report <path>');
        process.exit(2);
    }
    const workOrder = JSON.parse(await readFile(workOrderPath, 'utf8'));
    if (!workOrder.read_states) {
        console.error('work order: no read_states (not a read page)');
        process.exit(2);
    }
    const report = JSON.parse(await readFile(reportPath, 'utf8'));
    const failures = judgeReadWitnesses(workOrder.read_states, report);
    for (const failure of failures) console.error(`FAIL ${failure}`);
    if (failures.length) process.exit(1);
    console.log('PASS read witnesses');
}
