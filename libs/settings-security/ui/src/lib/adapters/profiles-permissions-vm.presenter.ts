import {
    ProfilesPermissionsEntity,
    ProfilesPermissionsStatus,
} from '@cmz/settings-security-domain';
import { actionItem, resolveTooltip, ROW_ACTION_LABEL, RowAction } from '@cmz/shared-ui';
import { PROFILES_PERMISSIONS_STATUS_LABEL } from '../constants/profiles-permissions-status-label.constant';
import { profilesPermissionsStatusStyleOf } from '../mappers/profiles-permissions-status-style.mapper';
import { ProfilesPermissionsVmProps } from './profiles-permissions-vm-props.interface';

interface ProfilesPermissionsPermission {
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

const T = 'SETTINGS_SECURITY.PROFILES_PERMISSIONS.TOOLTIP';

export class ProfilesPermissionsPresenter {
    constructor(private readonly t: (key: string) => string) {}

    map(
        item: ProfilesPermissionsEntity,
        permission: ProfilesPermissionsPermission
    ): ProfilesPermissionsVmProps {
        const { authorization: can, tooltip } = permission;
        const isInactive = item.status === ProfilesPermissionsStatus.INACTIVE;

        const toggle = isInactive
            ? actionItem(this.t, {
                  id: RowAction.ENABLE,
                  label: ROW_ACTION_LABEL[RowAction.ENABLE],
                  icon: 'pi pi-check',
                  allowed: can.canEnable,
                  tooltipKey: `${T}.ENABLE`,
                  fallbackTooltip: tooltip.enable,
              })
            : actionItem(this.t, {
                  id: RowAction.DISABLE,
                  label: ROW_ACTION_LABEL[RowAction.DISABLE],
                  icon: 'pi pi-times',
                  allowed: can.canDisable,
                  tooltipKey: `${T}.DISABLE`,
                  fallbackTooltip: tooltip.disable,
              });

        return {
            uniqId: item.uniqId,
            name: item.name,
            slug: item.slug,
            description: item.description,
            usersCount: item.usersCount,
            status: item.status,
            statusLabel: this.t(PROFILES_PERMISSIONS_STATUS_LABEL[item.status]),
            statusStyle: profilesPermissionsStatusStyleOf(item.status),
            updatedAt: item.updatedAt,
            actionsRef: item.name,
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
                    allowed:
                        can.canDelete &&
                        item.status !== ProfilesPermissionsStatus.ACTIVE,
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
