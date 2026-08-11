import { accessLogsFilterVo } from './access-logs-filter.vo';

describe('accessLogsFilterVo', () => {
    it('retourne le contrat inchangé quand la plage de dates est valide', () => {
        const contract = {
            startDate: new Date('2026-01-01'),
            endDate: new Date('2026-01-31'),
        };
        expect(accessLogsFilterVo(contract)).toBe(contract);
    });

    it('délègue la validation à validateAccessLogsFilter (plage invalide → throw)', () => {
        expect(() =>
            accessLogsFilterVo({
                startDate: new Date('2026-02-01'),
                endDate: new Date('2026-01-01'),
            })
        ).toThrow();
    });
});
