import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { I18nextTranslationService } from './i18next-translation.service';

/**
 * T12-3 (P2, 2026-08-13) — jamais testé, seul point d'accès de l'app à
 * i18next (ADR-0012). `i18next` est un singleton de module — chaque test
 * réinitialise explicitement via `init()` pour rester indépendant de l'ordre
 * d'exécution, pas de mock : vérifie le vrai comportement de la lib.
 */
describe('I18nextTranslationService', () => {
    let service: I18nextTranslationService;

    beforeEach(async () => {
        service = new I18nextTranslationService();
        await service.init(
            {
                fr: { translation: { GREETING: 'Bonjour {{name}}' } },
                en: { translation: { GREETING: 'Hello {{name}}' } },
            },
            'fr'
        );
    });

    afterEach(async () => {
        // Ré-initialise vers un état neutre pour ne pas fuiter entre fichiers
        // de test partageant le même processus (singleton de module i18next).
        await service.init({}, 'fr');
    });

    it('translate() résout une clé existante dans la langue courante', () => {
        expect(service.translate('GREETING', { name: 'Marie' })).toBe(
            'Bonjour Marie'
        );
    });

    it('currentLanguage reflète la langue passée à init()', () => {
        expect(service.currentLanguage).toBe('fr');
    });

    it('setLanguage() change la langue courante et les traductions résolues', async () => {
        await service.setLanguage('en');

        expect(service.currentLanguage).toBe('en');
        expect(service.translate('GREETING', { name: 'Marie' })).toBe(
            'Hello Marie'
        );
    });

    it('translate() sans params ne lève pas et retourne la clé si non substituée', () => {
        expect(() => service.translate('GREETING')).not.toThrow();
    });

    it('translate() sur une clé absente retourne la clé elle-même (comportement i18next par défaut)', () => {
        expect(service.translate('UNKNOWN.KEY')).toBe('UNKNOWN.KEY');
    });
});
