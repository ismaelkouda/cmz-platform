import { validateAccessLogsFilter } from './access-logs-filter.validator';

describe('validateAccessLogsFilter', () => {
    it('valide un contrat vide (aucun champ requis)', () => {
        expect(() => validateAccessLogsFilter({})).not.toThrow();
    });

    it('valide un contrat avec search/action seuls', () => {
        expect(() =>
            validateAccessLogsFilter({ search: 'jean', action: undefined })
        ).not.toThrow();
    });

    it('valide une plage de dates cohérente (startDate <= endDate)', () => {
        expect(() =>
            validateAccessLogsFilter({
                startDate: new Date('2026-01-01'),
                endDate: new Date('2026-01-31'),
            })
        ).not.toThrow();
    });

    it('lève une erreur si startDate est après endDate', () => {
        expect(() =>
            validateAccessLogsFilter({
                startDate: new Date('2026-02-01'),
                endDate: new Date('2026-01-01'),
            })
        ).toThrow();
    });
});
