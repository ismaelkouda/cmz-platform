#!/usr/bin/env node
// X4-config : filet d'empreinte de l'image nginx du relais. Le Dockerfile du
// harnais en est la seule source ; Dependabot (écosystème docker) le suit, mais
// la documentation officielle ne dit pas qu'il met à jour l'empreinte avec le
// tag. Cette étape compare donc l'empreinte épinglée à celle du tag dans le
// registre, avec trois issues fermées :
//   0 : concordance ;
//   1 : empreinte périmée (écart) ;
//   2 : vérification impossible (registre injoignable, délai, réponse illisible).
// Jamais de vert par défaut, et l'issue 2 ne masque jamais un écart.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const DIGEST_TIMEOUT_MS = 60_000;

export function pinnedNginxImage(dockerfile) {
    const found =
        /^FROM nginx:([a-z0-9][a-z0-9.-]*)@(sha256:[a-f0-9]{64})$/m.exec(
            dockerfile
        );
    return found ? { tag: found[1], digest: found[2] } : null;
}

function defaultRun(args) {
    return spawnSync('docker', args, {
        encoding: 'utf8',
        timeout: DIGEST_TIMEOUT_MS,
        env: { PATH: process.env.PATH, HOME: process.env.HOME },
    });
}

export function checkNginxDigest(dockerfile, run = defaultRun) {
    const pinned = pinnedNginxImage(dockerfile);
    if (!pinned)
        return {
            code: 2,
            message:
                'CMZ_NGINX_DIGEST_UNVERIFIABLE image non épinglée par tag et empreinte',
        };
    const image = `nginx:${pinned.tag}`;
    const unverifiable = {
        code: 2,
        message: `CMZ_NGINX_DIGEST_UNVERIFIABLE ${image} : vérification impossible`,
    };
    let result;
    try {
        result = run(['buildx', 'imagetools', 'inspect', image]);
    } catch {
        return unverifiable;
    }
    if (!result || result.error || result.signal || result.status !== 0)
        return unverifiable;
    const digests = [
        ...String(result.stdout ?? '').matchAll(
            /^Digest:\s+(sha256:[a-f0-9]{64})\s*$/gm
        ),
    ].map((found) => found[1]);
    if (digests.length !== 1) return unverifiable;
    return digests[0] === pinned.digest
        ? { code: 0, message: `CMZ_NGINX_DIGEST_OK ${image}` }
        : {
              code: 1,
              message: `CMZ_NGINX_DIGEST_STALE ${image} : empreinte périmée`,
          };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const outcome = checkNginxDigest(
        readFileSync(
            new URL('./nginx-harness/Dockerfile', import.meta.url),
            'utf8'
        )
    );
    (outcome.code === 0 ? console.log : console.error)(outcome.message);
    process.exitCode = outcome.code;
}
