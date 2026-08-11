import { profilesPermissionsFilterEntity } from './profiles-permissions-filter.entity';

describe('profilesPermissionsFilterEntity', () => {
    it('projette le contrat inchangé (fonction identité)', () => {
        const contract = { search: 'admin' };
        expect(profilesPermissionsFilterEntity(contract)).toBe(contract);
    });

    it('accepte un contrat vide', () => {
        const contract = {};
        expect(profilesPermissionsFilterEntity(contract)).toBe(contract);
    });
});
