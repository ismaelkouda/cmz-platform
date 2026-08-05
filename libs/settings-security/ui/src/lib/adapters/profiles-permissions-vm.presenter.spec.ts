import {
    ProfilesPermissionsEntity,
    ProfilesPermissionsStatus,
} from '@cmz/settings-security-domain';
import { RowAction } from '@cmz/shared-ui';
import { ProfilesPermissionsPresenter } from './profiles-permissions-vm.presenter';

describe('ProfilesPermissionsPresenter', () => {
    const mockT = (key: string) => `translated:${key}`;
    let presenter: ProfilesPermissionsPresenter;

    const mockItem: ProfilesPermissionsEntity = {
        uniqId: 'prof-1',
        name: 'Administrateur Système',
        slug: 'admin-sys',
        description: 'Profil super utilisateur',
        usersCount: 5,
        status: ProfilesPermissionsStatus.ACTIVE,
        updatedAt: '2026-08-05T10:00:00Z',
    };

    const mockPermission = {
        authorization: {
            canEdit: true,
            canDelete: true,
            canEnable: true,
            canDisable: true,
            canChoose: true,
        },
        tooltip: {
            edit: '',
            delete: '',
            enable: '',
            disable: '',
            choose: '',
        },
    };

    beforeEach(() => {
        presenter = new ProfilesPermissionsPresenter(mockT);
    });

    it('mappe correctement ProfilesPermissionsEntity vers ProfilesPermissionsVmProps', () => {
        const vm = presenter.map(mockItem, mockPermission);

        expect(vm.uniqId).toBe('prof-1');
        expect(vm.name).toBe('Administrateur Système');
        expect(vm.usersCount).toBe(5);
        expect(vm.status).toBe(ProfilesPermissionsStatus.ACTIVE);
        expect(vm.statusStyle).toBe('COMMON.ACTIVE_STYLE');
        expect(vm.dropdownActions).toHaveLength(3);

        const toggleAction = vm.dropdownActions.find(
            (a) => a.id === RowAction.DISABLE
        );
        expect(toggleAction).toBeDefined();
        expect(toggleAction?.disabled).toBe(false);
    });

    it('propose l action ENABLE pour un profil INACTIVE', () => {
        const inactiveItem = {
            ...mockItem,
            status: ProfilesPermissionsStatus.INACTIVE,
        };
        const vm = presenter.map(inactiveItem, mockPermission);

        const toggleAction = vm.dropdownActions.find(
            (a) => a.id === RowAction.ENABLE
        );
        expect(toggleAction).toBeDefined();
        expect(toggleAction?.disabled).toBe(false);
    });

    it('interdit la suppression pour un profil ACTIVE', () => {
        const vm = presenter.map(mockItem, mockPermission);
        const deleteAction = vm.dropdownActions.find(
            (a) => a.id === RowAction.DELETE
        );

        expect(deleteAction?.disabled).toBe(true);
    });
});
