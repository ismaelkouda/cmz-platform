import { profilesPermissionsFilterVo } from './profiles-permissions-filter.vo';

describe('profilesPermissionsFilterVo', () => {
    it('retourne le contrat inchangé (aucun champ requis, filtre libre)', () => {
        const contract = { search: 'admin' };
        expect(profilesPermissionsFilterVo(contract)).toBe(contract);
    });

    it('accepte un contrat vide', () => {
        const contract = {};
        expect(profilesPermissionsFilterVo(contract)).toBe(contract);
    });
});
