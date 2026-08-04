/**
 * Configuration runtime locale (dev) — chargée par `index.html` avant le bundle.
 *
 * ADR-0007 / audit G-5 : un seul artefact de build ; en conteneur, ce fichier
 * est **écrasé** au démarrage depuis `deploy/env.template.js` (variables
 * d'environnement). Ne pas y mettre de secrets.
 */
window.__env = {
    authenticationUrl: '/api/auth/',
    reportUrl: '/api/report/',
    settingUrl: '/api/settings/',
    fileUrl: '/api/file/',
    environmentDeployment: 'DEV',
    enableDebug: true,
    // Aucune iframe externe fiable en dev par défaut (échoue fermé) — ajouter
    // une origine ici pour tester GrafanaEmbedComponent localement.
    trustedFrameOrigins: [],
};
