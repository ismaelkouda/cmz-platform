// X4-sécurité : preuves natives des deux barrières qui ne dépendent pas du
// réalisateur. Confinement : une spec piégée, publiée par
// verify:page-realization --apply avec le runner par défaut des outils, tente
// de sortir du produit (réseau, fichier extérieur, environnement de l'hôte) ;
// tout est bloqué et la publication est annulée. Politique de la coque : une
// page témoin piégée produit ses violations et aucune requête vers une autre
// origine ; la page réalisée n'en produit aucune.
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import { resolve } from 'node:path';

import {
    planExternalPageRealization,
    publishExternalPageRealization,
} from '../core/external-page-realization.mjs';
import { snapshotTree } from '../test-support/external-application-fixture.mjs';
import {
    measurableProbe,
    VALIDATOR_PROBES,
} from '../test-support/external-realization-probes.mjs';

export const CONFINEMENT_RECORD = 'tmp/cmz-confinement-trap.json';

// Spec écrite comme un réalisateur hostile : aucun import hors de `vitest`,
// les modules de Node atteints par `process.getBuiltinModule`, le réseau par
// clé calculée. Elle passe les règles de la spec et le lint du produit ; elle
// échoue toujours à la fin pour que la publication soit annulée.
export function confinementTrapSpec({ hosts, port, outside }) {
    return `import { describe, expect, it } from 'vitest';

interface Socket {
    on(event: string, listener: (value?: { code?: string }) => void): void;
    destroy(): void;
}
interface Host {
    process: {
        env: Record<string, string | undefined>;
        cwd(): string;
        getBuiltinModule(name: string): unknown;
    };
}
const host = globalThis as unknown as Host;
const files = host.process.getBuiltinModule('node:fs') as {
    readFileSync(path: string, encoding: string): string;
    writeFileSync(path: string, data: string): void;
};
const net = host.process.getBuiltinModule('node:net') as {
    connect(options: { host: string; port: number }): Socket;
};
const request = (globalThis as unknown as Record<string, (url: string) => Promise<unknown>>)['fe' + 'tch'];

function attempt(run: () => unknown): string {
    try {
        run();
        return 'allowed';
    } catch (error) {
        return 'blocked:' + ((error as { code?: string }).code ?? 'error');
    }
}

function connect(address: string): Promise<string> {
    return new Promise((done) => {
        const socket = net.connect({ host: address, port: ${port} });
        socket.on('connect', () => {
            socket.destroy();
            done('allowed');
        });
        socket.on('error', (error) => done('blocked:' + (error?.code ?? 'error')));
    });
}

describe('piège de confinement', () => {
    it('tente de sortir du produit', async () => {
        const root = host.process.cwd();
        const record: Record<string, string> = {
            sentinel: String(host.process.env['CMZ_PROBE_SECRET']),
            readOutside: attempt(() => files.readFileSync(${JSON.stringify(outside)}, 'utf8')),
            writeOutside: attempt(() => files.writeFileSync(${JSON.stringify(`${outside}.written`)}, 'x')),
            writeSources: attempt(() => files.writeFileSync(root + '/apps/confinement-trap.txt', 'x')),
            writeTool: attempt(() => files.writeFileSync(root + '/node_modules/vitest/confinement-trap.txt', 'x')),
        };
${hosts
    .map(
        (
            address,
            index
        ) => `        record['tcp${index}'] = await connect(${JSON.stringify(address)});
        record['http${index}'] = await request('ht' + 'tp:' + '//' + ${JSON.stringify(`${address}:${port}`)} + '/trap').then(
            () => 'allowed',
            (error: { cause?: { code?: string } }) => 'blocked:' + (error.cause?.code ?? 'error')
        );`
    )
    .join('\n')}
        files.writeFileSync(root + '/${CONFINEMENT_RECORD}', JSON.stringify(record));
        expect(record).toBe('le piège de confinement échoue toujours');
    });
});
`;
}

export function probeHosts() {
    return [
        '127.0.0.1',
        ...Object.values(networkInterfaces())
            .flat()
            .filter((entry) => entry?.family === 'IPv4' && !entry.internal)
            .map((entry) => entry.address)
            .slice(0, 1),
    ];
}

// Publication d'une page dont la spec est piégée, par le runner par défaut
// des outils (celui de la CLI du pilote) : refusée, rien ne sort, rien ne
// change.
export async function proveConfinedProductOracle(
    session,
    label,
    { root, app, options, workOrder, files, writeDraft }
) {
    let hits = 0;
    const server = createServer((socket) => {
        hits += 1;
        socket.destroy();
    });
    await new Promise((done) => server.listen(0, '0.0.0.0', done));
    const hosts = probeHosts();
    const outside = resolve(
        root,
        '..',
        `confinement-witness-${label.replaceAll('/', '-')}.txt`
    );
    await writeFile(outside, 'outside-witness');
    const previous = process.env.CMZ_PROBE_SECRET;
    process.env.CMZ_PROBE_SECRET = 'host-secret';
    try {
        await writeDraft(root, workOrder, {
            ...files,
            'page.component.spec.ts': confinementTrapSpec({
                hosts,
                port: server.address().port,
                outside,
            }),
        });
        const before = await snapshotTree(app, ['node_modules']);
        const plan = await planExternalPageRealization(options);
        await assert.rejects(
            publishExternalPageRealization({
                ...options,
                expectedPlanId: plan.plan_id,
            }),
            /^Error: external application: product command failed under confinement \(code 1\)$|product command failed under confinement \(code 1\)/
        );
        assert.deepEqual(await snapshotTree(app, ['node_modules']), before);
        const record = JSON.parse(
            await readFile(resolve(root, CONFINEMENT_RECORD), 'utf8')
        );
        await rm(resolve(root, CONFINEMENT_RECORD));
        assert.equal(record.sentinel, 'undefined', 'environnement de l’hôte');
        for (const [key, value] of Object.entries(record))
            if (key !== 'sentinel')
                assert.match(value, /^blocked:/, `${label} ${key}`);
        assert.equal(hits, 0, 'aucune connexion reçue');
        await assert.rejects(readFile(`${outside}.written`));
        session.lines.push(
            `PASS ${label}/confinement trap spec ran under the default product runner: network (${hosts.length} addresses, tcp and http), outside read and write, sources and tools writes blocked; host environment absent; publication rolled back`
        );
    } finally {
        server.close();
        await rm(outside, { force: true });
        if (previous === undefined) delete process.env.CMZ_PROBE_SECRET;
        else process.env.CMZ_PROBE_SECRET = previous;
    }
}

// Page témoin piégée, servie sous la politique de la coque construite : un
// piège par directive, plus les 13 sondes du validateur acceptées par les
// règles. `__FOREIGN__` est remplacé dans le navigateur par la seconde
// origine.
export function cspTrapFixture() {
    const foreign = 'http://__FOREIGN__';
    const probes = VALIDATOR_PROBES.filter(
        (probe) => probe.mechanism !== 'static'
    ).map((probe) => ({
        id: probe.id,
        mechanism: probe.mechanism,
        ...measurableProbe(probe, foreign),
    }));
    const traps = [
        ['trap-img', 'img-src', `<img src="${foreign}/trap-img/x.png" alt="">`],
        [
            'trap-link',
            'style-src',
            `<link rel="stylesheet" href="${foreign}/trap-link/x.css">`,
        ],
        [
            'trap-frame',
            'frame-src',
            `<iframe src="${foreign}/trap-frame/" title="t"></iframe>`,
        ],
        [
            'trap-object',
            'object-src',
            `<object data="${foreign}/trap-object/x"></object>`,
        ],
        [
            'trap-inline',
            'script-src',
            '<script>window.cmzInline = true;</script>',
        ],
        [
            'trap-form',
            'form-action',
            `<form id="trap-form" action="${foreign}/trap-form/" method="post"><input name="n" value="v"></form>`,
        ],
    ].map(([id, directive, html]) => ({ id, directive, html }));
    const scripted = [
        [
            'trap-fetch',
            'connect-src',
            `fetch('${foreign}/trap-fetch/').catch(() => undefined);`,
        ],
        [
            'trap-xhr',
            'connect-src',
            `(() => { const x = new XMLHttpRequest(); x.open('GET', '${foreign}/trap-xhr/'); x.send(); })();`,
        ],
        [
            'trap-beacon',
            'connect-src',
            `navigator.sendBeacon('${foreign}/trap-beacon/', 'x');`,
        ],
        [
            'trap-websocket',
            'connect-src',
            `new WebSocket('${foreign.replace('http', 'ws')}/trap-websocket/');`,
        ],
        [
            'trap-image',
            'img-src',
            `new Image().src = '${foreign}/trap-image/x.png';`,
        ],
        [
            'trap-html',
            'require-trusted-types-for',
            `document.body.insertAdjacentHTML('beforeend', '<img src="${foreign}/trap-html/x.png">');`,
        ],
        ['trap-eval', 'require-trusted-types-for', "eval('1');"],
        [
            'trap-script',
            'require-trusted-types-for',
            `(() => { const s = document.createElement('script'); s.src = '${foreign}/trap-script/x.js'; document.head.append(s); })();`,
        ],
    ].map(([id, directive, code]) => ({ id, directive, code }));
    return { probes, traps, scripted };
}
