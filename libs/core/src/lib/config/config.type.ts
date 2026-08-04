/** Environnements connus de `window.__env.environmentDeployment`. */
export type EnvironmentDeployment =
    | 'DEV'
    | 'CLOUD'
    | 'CMZ_DEV'
    | 'CMZ_PROD'
    | 'PROD';

export const ENVIRONMENT_DEPLOYMENTS: readonly EnvironmentDeployment[] = [
    'DEV',
    'CLOUD',
    'CMZ_DEV',
    'CMZ_PROD',
    'PROD',
] as const;

/**
 * Configuration runtime (`window.__env`) — clés **requises** au bootstrap.
 * `appSettings` reste optionnel : non consommé aujourd'hui, hors contrat G-6.
 */
export interface AppConfig {
    authenticationUrl: string;
    reportUrl: string;
    settingUrl: string;
    fileUrl: string;
    environmentDeployment: EnvironmentDeployment;
    enableDebug: boolean;
    /** Thème / assets (legacy) — non requis au démarrage. */
    appSettings?: AppSettings;
    /**
     * Origines (schéma + hôte, ex. `https://grafana.example.org`) autorisées
     * à être embarquées en iframe sans passer par le sanitizer par défaut
     * (`TrustedOriginPort`/`SafeUrlPipe`, audit I-14/I-15). Optionnel : absent
     * ou vide = aucune iframe externe n'est jamais considérée fiable (échoue
     * fermé). Dérivé, à l'entrypoint, de la **même** variable
     * `CMZ_CSP_FRAME_SRC` qui alimente la CSP `frame-src`
     * (`deploy/docker-entrypoint.sh`) — une seule variable d'environnement à
     * positionner par les opérateurs, deux consommateurs (en-tête HTTP +
     * allowlist app-level), pas de risque de dérive entre les deux.
     */
    trustedFrameOrigins?: readonly string[];
}

export interface AppSettings {
    app: {
        name: string;
        title: string;
        description: string;
        keywords: string;
        author: string;
    };
    fonts: { primary: string; secondary: string };
    colors: {
        primary: string;
        secondary: string;
        tertiary: string;
        black: string;
        white: string;
        gray: string;
        grayLight: string;
        error: string;
        warning: string;
        success: string;
        info: string;
    };
    languages: {
        supported: readonly string[];
        default: string;
        storageKey: string;
    };
    modes: {
        supported: readonly string[];
        default: string;
        storageKey: string;
    };
    assets: {
        favicon: string;
        authLogo: string;
        sidebarLogo: string;
        logoIcon: string;
        loginBg: string;
    };
    loadingBar: {
        color: string;
        height: string;
        includeSpinner: boolean;
    };
    error: {
        displayStyles: Record<string, string>;
        role: string;
        ariaLive: string;
    };
    performance: {
        bootstrapStartMark: string;
        bootstrapEndMark: string;
        bootstrapMeasure: string;
    };
}

export interface BuildInfo {
    environment: string;
    version: string;
    commitHash: string;
}

declare global {
    interface Window {
        __env?: AppConfig & { buildInfo?: BuildInfo };
    }
}
