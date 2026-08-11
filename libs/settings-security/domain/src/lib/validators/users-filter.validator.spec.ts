import { validateUsersFilter } from './users-filter.validator';

describe('validateUsersFilter', () => {
    it('valide un contrat vide (aucun champ requis, filtre libre)', () => {
        expect(() => validateUsersFilter({})).not.toThrow();
    });

    it('valide un contrat avec des facettes optionnelles renseignées', () => {
        expect(() => validateUsersFilter({ search: 'jean' })).not.toThrow();
    });
});
