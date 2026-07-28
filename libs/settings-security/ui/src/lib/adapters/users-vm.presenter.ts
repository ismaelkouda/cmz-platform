import { UsersEntity, UsersStatus } from '@cmz/settings-security-domain';
import { ROLE_LABEL, ROW_ACTION_LABEL, RowAction } from '@cmz/shared-ui';
import { USERS_STATUS_LABEL } from '../constants/users-status-label.constant';
import { usersStatusStyleOf } from '../mappers/users-status-style.mapper';
import { actionItem, resolveTooltip } from './action-item.factory';
import { UsersVmProps } from './users-vm-props.interface';

interface UsersPermission {
    authorization: {
        canEdit: boolean;
        canDelete: boolean;
        canEnable: boolean;
        canDisable: boolean;
        canChoose: boolean;
    };
    tooltip: {
        edit: string;
        delete: string;
        enable: string;
        disable: string;
        choose: string;
    };
}

const T = 'SETTINGS_SECURITY.USERS.TOOLTIP';

/**
 * Presenter (UI) : `UsersEntity` → view-model. Menu dépendant du statut,
 * même pattern que `team-organization/participants` (4 états, `enable`
 * proposé pour tout statut ≠ `ACTIVE`).
 */
export class UsersPresenter {
    constructor(private readonly t: (key: string) => string) {}

    map(item: UsersEntity, permission: UsersPermission): UsersVmProps {
        const { authorization: can, tooltip } = permission;
        const isActive = item.status === UsersStatus.ACTIVE;

        const toggle = isActive
            ? actionItem(this.t, {
                  id: RowAction.DISABLE,
                  label: ROW_ACTION_LABEL[RowAction.DISABLE],
                  icon: 'pi pi-times',
                  allowed: can.canDisable,
                  tooltipKey: `${T}.DISABLE`,
                  fallbackTooltip: tooltip.disable,
              })
            : actionItem(this.t, {
                  id: RowAction.ENABLE,
                  label: ROW_ACTION_LABEL[RowAction.ENABLE],
                  icon: 'pi pi-check',
                  allowed: can.canEnable,
                  tooltipKey: `${T}.ENABLE`,
                  fallbackTooltip: tooltip.enable,
              });

        return {
            uniqId: item.uniqId,
            firstName: item.firstName,
            lastName: item.lastName,
            email: item.email,
            phone: item.phone,
            role: item.role,
            roleLabel: item.role ? this.t(ROLE_LABEL[item.role]) : '',
            profile: item.profile,
            status: item.status,
            statusLabel: this.t(USERS_STATUS_LABEL[item.status]),
            statusStyle: usersStatusStyleOf(item.status),
            updatedAt: item.updatedAt,
            actionsRef: `${item.firstName} ${item.lastName}`,
            dropdownActions: [
                actionItem(this.t, {
                    id: RowAction.EDIT,
                    label: ROW_ACTION_LABEL[RowAction.EDIT],
                    icon: 'pi pi-pencil',
                    allowed: can.canEdit,
                    tooltipKey: `${T}.EDIT`,
                    fallbackTooltip: tooltip.edit,
                }),
                toggle,
                actionItem(this.t, {
                    id: RowAction.DELETE,
                    label: ROW_ACTION_LABEL[RowAction.DELETE],
                    icon: 'pi pi-trash',
                    allowed: can.canDelete && !isActive,
                    tooltipKey: `${T}.DELETE`,
                    fallbackTooltip: tooltip.delete,
                }),
            ],
            disableDropdown: !can.canChoose,
            tooltipDropdown: resolveTooltip(
                this.t,
                can.canChoose,
                `${T}.CHOOSE`,
                tooltip.choose
            ),
        };
    }
}
