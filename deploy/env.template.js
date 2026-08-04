/**
 * Template runtime — substitué par `deploy/docker-entrypoint.sh` (envsubst)
 * au démarrage du conteneur → `/usr/share/nginx/html/env.js`.
 *
 * Variables (toutes optionnelles, défauts = proxy local /api) :
 *   CMZ_AUTHENTICATION_URL
 *   CMZ_REPORT_URL
 *   CMZ_SETTING_URL
 *   CMZ_FILE_URL
 *   CMZ_ENVIRONMENT_DEPLOYMENT   (DEV | CLOUD | CMZ_DEV | CMZ_PROD | PROD)
 *   CMZ_ENABLE_DEBUG             (true | false — sans guillemets dans le JS)
 *   CMZ_CSP_FRAME_SRC            (liste espacée d'origines, ex. "https://
 *                                grafana.example.org" — même variable que la
 *                                CSP frame-src ; convertie en tableau JSON
 *                                par l'entrypoint, cf. audit I-14/I-15)
 */
window.__env = {
    authenticationUrl: '${CMZ_AUTHENTICATION_URL}',
    reportUrl: '${CMZ_REPORT_URL}',
    settingUrl: '${CMZ_SETTING_URL}',
    fileUrl: '${CMZ_FILE_URL}',
    environmentDeployment: '${CMZ_ENVIRONMENT_DEPLOYMENT}',
    enableDebug: ${CMZ_ENABLE_DEBUG},
    trustedFrameOrigins: ${CMZ_TRUSTED_FRAME_ORIGINS_JSON},
};
