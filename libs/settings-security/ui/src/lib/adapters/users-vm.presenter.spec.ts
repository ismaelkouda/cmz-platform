import { UsersEntity, UsersStatus } from '@cmz/settings-security-domain';
import { Role } from '@cmz/shared-domain';
import { RowAction } from '@cmz/shared-ui';
import { UsersPresenter } from './users-vm.presenter';

describe('UsersPresenter', () => {
    const mockT = (key: string) => `translated:${key}`;
    let presenter: UsersPresenter;

    const mockItem: UsersEntity = {
        uniqId: 'usr-1',
        firstName: 'Jean',
        lastName: 'Dupont',
        email: 'jean.dupont@example.com',
        phone: '+22507000000',
        role: Role.SUPER_ADMIN,
        profile: 'Administrateur',
        status: UsersStatus.ACTIVE,
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
        presenter = new UsersPresenter(mockT);
    });

    it('mappe correctement une UsersEntity active vers UsersVmProps', () => {
        const vm = presenter.map(mockItem, mockPermission);

        expect(vm.uniqId).toBe('usr-1');
        expect(vm.actionsRef).toBe('Jean Dupont');
        expect(vm.status).toBe(UsersStatus.ACTIVE);
        expect(vm.statusStyle).toBe('COMMON.ACTIVE_STYLE');
        expect(vm.dropdownActions).toHaveLength(3);

        const toggleAction = vm.dropdownActions.find(
            (a) => a.id === RowAction.DISABLE
        );
        expect(toggleAction).toBeDefined();
        expect(toggleAction?.disabled).toBe(false);
    });

    it('propose l action ENABLE lorsque le statut n est pas ACTIVE', () => {
        const inactiveItem = { ...mockItem, status: UsersStatus.INACTIVE };
        const vm = presenter.map(inactiveItem, mockPermission);

        const toggleAction = vm.dropdownActions.find(
            (a) => a.id === RowAction.ENABLE
        );
        expect(toggleAction).toBeDefined();
        expect(toggleAction?.disabled).toBe(false);
    });

    it('interdit la suppression si l utilisateur est actif', () => {
        const vm = presenter.map(mockItem, mockPermission);
        const deleteAction = vm.dropdownActions.find(
            (a) => a.id === RowAction.DELETE
        );

        expect(deleteAction?.disabled).toBe(true);
    });
});
