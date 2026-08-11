import { usersFilterEntity } from './users-filter.entity';

describe('usersFilterEntity', () => {
    it('projette le contrat inchangé (fonction identité)', () => {
        const contract = { search: 'jean' };
        expect(usersFilterEntity(contract)).toBe(contract);
    });

    it('accepte un contrat vide', () => {
        const contract = {};
        expect(usersFilterEntity(contract)).toBe(contract);
    });
});
