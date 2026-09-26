/**
 * Configuration locale publique de l'application de preuve C5.
 *
 * Elle ne contient aucun secret ni contexte d'accès. L'identité de preuve est
 * fournie séparément par le host navigateur et reste refusée quand elle manque.
 */
window.__env = {
    authenticationUrl: '/api/auth/',
    reportUrl: '/api/report/',
    settingUrl: '/api/settings/',
    fileUrl: '/api/file/',
    environmentDeployment: 'DEV',
    enableDebug: false,
    trustedFrameOrigins: [],
};
