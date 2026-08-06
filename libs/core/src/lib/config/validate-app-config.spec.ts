import { describe, expect, it } from 'vitest';
import { assertAppConfig } from './validate-app-config';

const valid = {
    authenticationUrl: '/api/auth/',
    reportUrl: '/api/report/',
    settingUrl: '/api/settings/',
    fileUrl: '/api/file/',
    environmentDeployment: 'DEV' as const,
    enableDebug: true,
};

describe('assertAppConfig', () => {
    it('accepte une config minimale valide', () => {
        expect(assertAppConfig(valid)).toEqual(valid);
    });

    it('échoue si __env est absent', () => {
        expect(() => assertAppConfig(undefined)).toThrow(/absent/);
        expect(() => assertAppConfig(undefined)).toThrow(/public\/env\.js/);
    });

    it('liste les clés manquantes', () => {
        expect(() => assertAppConfig({ ...valid, reportUrl: '' })).toThrow(
            /reportUrl/
        );
    });

    it('détecte un placeholder non substitué', () => {
        expect(() =>
            assertAppConfig({
                ...valid,
                authenticationUrl: '${CMZ_AUTHENTICATION_URL}',
            })
        ).toThrow(/non substitué/);
    });

    it('rejette enableDebug non boolean', () => {
        expect(() =>
            assertAppConfig({ ...valid, enableDebug: 'false' })
        ).toThrow(/enableDebug/);
    });

    it('rejette un environmentDeployment inconnu', () => {
        expect(() =>
            assertAppConfig({ ...valid, environmentDeployment: 'STAGING' })
        ).toThrow(/environmentDeployment/);
    });

    it('accepte CMZ_DEV / CMZ_PROD (ne pas confondre avec un placeholder)', () => {
        expect(
            assertAppConfig({ ...valid, environmentDeployment: 'CMZ_PROD' })
                .environmentDeployment
        ).toBe('CMZ_PROD');
    });
});
