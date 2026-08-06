import {
    AppConfig,
    ENVIRONMENT_DEPLOYMENTS,
    EnvironmentDeployment,
} from './config.type';

const REQUIRED_STRING_KEYS = [
    'authenticationUrl',
    'reportUrl',
    'settingUrl',
    'fileUrl',
] as const;

const HINT = [
    'Corriger :',
    '  • Dev local     → apps/backoffice-angular/public/env.js',
    '  • Conteneur     → variables CMZ_* (deploy/env.template.js.in + entrypoint)',
    '  • Clés requises → authenticationUrl, reportUrl, settingUrl, fileUrl,',
    '                    environmentDeployment, enableDebug',
].join('\n');

/**
 * Valide la forme de `window.__env` (audit G-6 / ADR-0007).
 * @returns la config typée
 * @throws Error avec diagnostic multi-lignes exploitable
 */
export function assertAppConfig(raw: unknown): AppConfig {
    const problems: string[] = [];

    if (raw == null || typeof raw !== 'object') {
        throw new Error(
            [
                'Configuration runtime invalide : `window.__env` est absent.',
                'Le script `env.js` doit être chargé avant le bundle Angular',
                '(voir `<script src="env.js">` dans index.html).',
                '',
                HINT,
            ].join('\n')
        );
    }

    const obj = raw as Record<string, unknown>;

    for (const key of REQUIRED_STRING_KEYS) {
        const value = obj[key];
        if (typeof value !== 'string' || value.trim() === '') {
            problems.push(
                `« ${key} » doit être une string non vide (reçu : ${describe(value)})`
            );
            continue;
        }
        if (looksUnsubstituted(value)) {
            problems.push(
                `« ${key} » contient un placeholder non substitué (${value}) — vérifier l'entrypoint / envsubst`
            );
        }
    }

    const env = obj['environmentDeployment'];
    if (typeof env !== 'string' || env.trim() === '') {
        problems.push(
            `« environmentDeployment » doit être une string parmi ${ENVIRONMENT_DEPLOYMENTS.join(' | ')} (reçu : ${describe(env)})`
        );
    } else if (looksUnsubstituted(env)) {
        problems.push(
            `« environmentDeployment » non substitué (${env}) — définir CMZ_ENVIRONMENT_DEPLOYMENT`
        );
    } else if (
        !ENVIRONMENT_DEPLOYMENTS.includes(env as EnvironmentDeployment)
    ) {
        problems.push(
            `« environmentDeployment » invalide : « ${env} » (attendu : ${ENVIRONMENT_DEPLOYMENTS.join(' | ')})`
        );
    }

    const debug = obj['enableDebug'];
    if (typeof debug !== 'boolean') {
        problems.push(
            `« enableDebug » doit être un boolean JS (reçu : ${describe(debug)}).` +
                ' En conteneur : CMZ_ENABLE_DEBUG=true|false sans guillemets dans le template.'
        );
    }

    if (problems.length > 0) {
        throw new Error(
            [
                'Configuration runtime invalide (`window.__env`) :',
                ...problems.map((p) => `  • ${p}`),
                '',
                HINT,
            ].join('\n')
        );
    }

    return {
        authenticationUrl: obj['authenticationUrl'] as string,
        reportUrl: obj['reportUrl'] as string,
        settingUrl: obj['settingUrl'] as string,
        fileUrl: obj['fileUrl'] as string,
        environmentDeployment: env as EnvironmentDeployment,
        enableDebug: debug as boolean,
        ...(obj['appSettings'] !== undefined
            ? { appSettings: obj['appSettings'] as AppConfig['appSettings'] }
            : {}),
        // Optionnel (audit I-14/I-15) : absent = TrustedOriginAdapter traite
        // comme aucune origine fiable (échoue fermé), pas d'erreur de
        // validation ici — ce champ n'est pas dans REQUIRED_STRING_KEYS.
        ...(Array.isArray(obj['trustedFrameOrigins'])
            ? {
                  trustedFrameOrigins: obj[
                      'trustedFrameOrigins'
                  ] as readonly string[],
              }
            : {}),
    };
}

function describe(value: unknown): string {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    if (typeof value === 'string') return JSON.stringify(value);
    return `${typeof value}(${String(value)})`;
}

/** Placeholder envsubst restant, ex. `${CMZ_REPORT_URL}` — pas `CMZ_DEV`. */
function looksUnsubstituted(value: string): boolean {
    return /\$\{[A-Z0-9_]+\}/.test(value);
}
