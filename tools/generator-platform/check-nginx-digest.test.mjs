// X4-config : filet d'empreinte de l'image nginx, trois issues fermées, sans
// réseau (exécutable docker témoin).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { checkNginxDigest, pinnedNginxImage } from './check-nginx-digest.mjs';

const dockerfile = readFileSync(
    new URL('./nginx-harness/Dockerfile', import.meta.url),
    'utf8'
);
const pinned = pinnedNginxImage(dockerfile);
const inspect = (digest) => () => ({
    status: 0,
    signal: null,
    stdout: `Name:      docker.io/library/nginx:${pinned.tag}\nMediaType: application/vnd.oci.image.index.v1+json\nDigest:    ${digest}\n\nManifests:\n  Name: x\n`,
    stderr: '',
});

test('X4-config : empreinte du harnais épinglée par tag et empreinte, seule ligne FROM', () => {
    assert.match(pinned.tag, /^\d+\.\d+-alpine$/);
    assert.match(pinned.digest, /^sha256:[a-f0-9]{64}$/);
    assert.equal(dockerfile.match(/^FROM /gm).length, 1);
});

test('X4-config : concordance, empreinte périmée et vérification impossible', () => {
    let seen;
    const ok = checkNginxDigest(dockerfile, (args) => {
        seen = args;
        return inspect(pinned.digest)();
    });
    assert.deepEqual(seen, [
        'buildx',
        'imagetools',
        'inspect',
        `nginx:${pinned.tag}`,
    ]);
    assert.deepEqual(ok, {
        code: 0,
        message: `CMZ_NGINX_DIGEST_OK nginx:${pinned.tag}`,
    });
    // Contre-test 1 : le tag a bougé, l'empreinte épinglée est périmée.
    const stale = checkNginxDigest(
        dockerfile,
        inspect(`sha256:${'0'.repeat(64)}`)
    );
    assert.equal(stale.code, 1);
    assert.match(
        stale.message,
        /^CMZ_NGINX_DIGEST_STALE .* empreinte périmée$/
    );
    // Contre-test 2 : registre en panne, délai dépassé, réponse illisible.
    const unverifiable = [
        () => ({
            status: 1,
            signal: null,
            stdout: '',
            stderr: 'registry unavailable',
        }),
        () => ({ status: null, signal: 'SIGTERM', stdout: '', stderr: '' }),
        () => ({ error: new Error('ETIMEDOUT'), status: null }),
        () => {
            throw new Error('spawn docker ENOENT');
        },
        () => ({
            status: 0,
            signal: null,
            stdout: 'pas de digest',
            stderr: '',
        }),
        () => ({
            status: 0,
            signal: null,
            stdout: `Digest: ${pinned.digest}\nDigest: sha256:${'1'.repeat(64)}\n`,
            stderr: '',
        }),
    ];
    // Un appel en échec qui imprime pourtant la bonne empreinte reste
    // « vérification impossible » : le code de sortie prime.
    unverifiable.push(() => ({
        status: 1,
        signal: null,
        stdout: `Digest: ${pinned.digest}\n`,
        stderr: 'registry error',
    }));
    for (const run of unverifiable) {
        const outcome = checkNginxDigest(dockerfile, run);
        assert.equal(outcome.code, 2);
        assert.match(
            outcome.message,
            /^CMZ_NGINX_DIGEST_UNVERIFIABLE .* vérification impossible$/
        );
    }
    assert.equal(
        checkNginxDigest('FROM nginx:1.31-alpine\n', () =>
            assert.fail('aucun appel')
        ).code,
        2
    );
});
