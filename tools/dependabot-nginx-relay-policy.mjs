/**
 * X4-config : l'image nginx du relais extérieur a une seule source, le
 * Dockerfile du harnais réduit à `FROM`, suivi par l'écosystème `docker`
 * dans un groupe dédié. Le suivi de l'empreinte par le robot n'est pas
 * documenté : check-nginx-digest.mjs reste le filet.
 *
 * Module séparé de check-dependabot-policy.mjs, qui l'appelle, pour garder
 * celui-ci sous le plafond de lignes de check-file-weight.mjs.
 */

export const NGINX_RELAY_DIRECTORY = '/tools/generator-platform/nginx-harness';
export const NGINX_RELAY_GROUP = 'nginx-relay';

export function nginxRelayPolicyErrors(config) {
    const entries = (config?.updates ?? []).filter(
        (update) =>
            update?.['package-ecosystem'] === 'docker' &&
            update?.directory === NGINX_RELAY_DIRECTORY
    );
    if (entries.length !== 1)
        return [
            `attendu exactement un update Dependabot docker pour '${NGINX_RELAY_DIRECTORY}', trouvé ${entries.length}`,
        ];
    const patterns = entries[0].groups?.[NGINX_RELAY_GROUP]?.patterns;
    if (!Array.isArray(patterns) || !patterns.includes('nginx'))
        return [
            `le groupe '${NGINX_RELAY_GROUP}' doit couvrir l'image 'nginx' de '${NGINX_RELAY_DIRECTORY}'`,
        ];
    return [];
}
