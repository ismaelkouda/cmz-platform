import { usersFilterVo } from './users-filter.vo';

describe('usersFilterVo', () => {
    it('retourne le contrat inchangé (aucun champ requis, filtre libre)', () => {
        const contract = { search: 'jean' };
        expect(usersFilterVo(contract)).toBe(contract);
    });

    it('accepte un contrat vide', () => {
        const contract = {};
        expect(usersFilterVo(contract)).toBe(contract);
    });
});
