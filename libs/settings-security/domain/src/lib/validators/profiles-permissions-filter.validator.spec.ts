import { validateProfilesPermissionsFilter } from './profiles-permissions-filter.validator';

describe('validateProfilesPermissionsFilter', () => {
    it('valide un contrat vide (aucun champ requis, filtre libre)', () => {
        expect(() => validateProfilesPermissionsFilter({})).not.toThrow();
    });

    it('valide un contrat avec des facettes optionnelles renseignées', () => {
        expect(() =>
            validateProfilesPermissionsFilter({ search: 'admin' })
        ).not.toThrow();
    });
});
