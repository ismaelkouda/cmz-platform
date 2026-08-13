import { createEnvironmentInjector } from '@angular/core';
import { describe, expect, it } from 'vitest';
import { AppConfig } from './config.type';
import {
    APP_CONFIG,
    AUTH_API_URL,
    FILE_API_URL,
    REPORT_API_URL,
    SETTINGS_API_URL,
} from './config.token';

/**
 * T12-3 (P1, 2026-08-13) — dernier fichier P1, jamais testé, ~5 appelants
 * (`RequestOptionsInterceptor`/repositories HTTP `shared-data`). Logique
 * quasi nulle (délégation directe `inject(APP_CONFIG).xxxUrl`), mais
 * verrouille le seul risque réel : qu'un futur refactor permute par erreur
 * deux champs (ex. `REPORT_API_URL` pointant vers `settingUrl`) sans
 * qu'aucun test ne le révèle — chaque token HTTP part vers la mauvaise
 * base d'URL silencieusement, erreur de configuration invisible en dev.
 *
 * Providers explicites (pas de résolution `providedIn: 'root'` implicite) :
 * un `EnvironmentInjector` créé à la main avec `null` comme parent n'est pas
 * la racine de la plateforme Angular — les tokens `providedIn: 'root'` n'y
 * sont jamais visibles (`NG0201`, confirmé par 2 approches alternatives qui
 * échouent de façon identique : `injector.get()` direct et
 * `runInInjectionContext`). On fournit donc chaque token explicitement avec
 * `{ provide: TOKEN }`, ce qui force Angular à utiliser sa `factory`
 * déclarée dans `config.token.ts` — c'est exactement cette factory que ce
 * test verrouille, la mécanique `providedIn` elle-même n'est pas ce qui est
 * sous test ici.
 */
function makeConfig(): AppConfig {
    return {
        authenticationUrl: 'https://auth.example',
        reportUrl: 'https://report.example',
        settingUrl: 'https://settings.example',
        fileUrl: 'https://files.example',
        environmentDeployment: 'PROD',
        enableDebug: false,
    };
}

function resolveTokens(config: AppConfig) {
    const injector = createEnvironmentInjector(
        [
            { provide: APP_CONFIG, useValue: config },
            { provide: REPORT_API_URL },
            { provide: AUTH_API_URL },
            { provide: SETTINGS_API_URL },
            { provide: FILE_API_URL },
        ],
        null as never
    );
    return {
        report: injector.get(REPORT_API_URL),
        auth: injector.get(AUTH_API_URL),
        settings: injector.get(SETTINGS_API_URL),
        file: injector.get(FILE_API_URL),
    };
}

describe('config.token — dérivation des URLs API depuis APP_CONFIG', () => {
    it('REPORT_API_URL délègue à APP_CONFIG.reportUrl', () => {
        expect(resolveTokens(makeConfig()).report).toBe(
            'https://report.example'
        );
    });

    it('AUTH_API_URL délègue à APP_CONFIG.authenticationUrl', () => {
        expect(resolveTokens(makeConfig()).auth).toBe('https://auth.example');
    });

    it('SETTINGS_API_URL délègue à APP_CONFIG.settingUrl', () => {
        expect(resolveTokens(makeConfig()).settings).toBe(
            'https://settings.example'
        );
    });

    it('FILE_API_URL délègue à APP_CONFIG.fileUrl', () => {
        expect(resolveTokens(makeConfig()).file).toBe('https://files.example');
    });

    it('les 4 tokens résolvent chacun un champ distinct (aucune permutation silencieuse)', () => {
        const resolved = resolveTokens(makeConfig());
        expect(
            new Set([
                resolved.report,
                resolved.auth,
                resolved.settings,
                resolved.file,
            ]).size
        ).toBe(4);
    });
});
