import {
    InfrastructureTypeEntity,
    Status,
} from '@cmz/administrative-infrastructure-domain';
import { ActionDropdownItem } from '@cmz/shared-ui';
import { statusStyleOf } from '../enums/infrastructure-type-status-style.enum';
import { InfrastructureTypeVmProps } from './infrastructure-type-vm-props.interface';

interface InfrastructureTypePermission {
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

/**
 * Presenter (UI) : `InfrastructureTypeEntity` → view-model. `statusStyle` et
 * `actionsRef` sont calculés ici (`statusStyleOf`, `item.name`) — l'entité
 * domaine reste pure. Le menu d'actions dépend du statut (enable/disable).
 */
export class InfrastructureTypePresenter {
    constructor(private readonly t: (key: string) => string) {}

    map(
        item: InfrastructureTypeEntity,
        permission: InfrastructureTypePermission
    ): InfrastructureTypeVmProps {
        const toggle: ActionDropdownItem =
            item.status === Status.INACTIVE
                ? {
                      id: 'enable',
                      label: 'COMMON.ENABLE',
                      icon: 'pi pi-check',
                      disabled: !permission.authorization.canEnable,
                      tooltip: permission.authorization.canEnable
                          ? this.t(
                                'ADMINISTRATIVE_INFRASTRUCTURE.INFRASTRUCTURE_TYPE.TOOLTIP.ENABLE'
                            )
                          : permission.tooltip.enable,
                  }
                : {
                      id: 'disable',
                      label: 'COMMON.DISABLE',
                      icon: 'pi pi-times',
                      disabled: !permission.authorization.canDisable,
                      tooltip: permission.authorization.canDisable
                          ? this.t(
                                'ADMINISTRATIVE_INFRASTRUCTURE.INFRASTRUCTURE_TYPE.TOOLTIP.DISABLE'
                            )
                          : permission.tooltip.disable,
                  };

        return {
            uniqId: item.uniqId,
            name: item.name,
            description: item.description,
            status: item.status,
            statusLabel: this.t(item.status),
            statusStyle: statusStyleOf(item.status),
            updatedAt: item.updatedAt,
            actionsRef: item.name,
            dropdownActions: [
                {
                    id: 'edit',
                    label: 'COMMON.EDIT',
                    icon: 'pi pi-pencil',
                    disabled: !permission.authorization.canEdit,
                    tooltip: permission.authorization.canEdit
                        ? this.t(
                              'ADMINISTRATIVE_INFRASTRUCTURE.INFRASTRUCTURE_TYPE.TOOLTIP.EDIT'
                          )
                        : permission.tooltip.edit,
                },
                toggle,
                {
                    id: 'delete',
                    label: 'COMMON.DELETE',
                    icon: 'pi pi-trash',
                    disabled:
                        item.status === Status.ACTIVE ||
                        !permission.authorization.canDelete,
                    tooltip:
                        permission.authorization.canDelete &&
                        item.status !== Status.ACTIVE
                            ? this.t(
                                  'ADMINISTRATIVE_INFRASTRUCTURE.INFRASTRUCTURE_TYPE.TOOLTIP.DELETE'
                              )
                            : permission.tooltip.delete,
                },
            ],
            disableDropdown: !permission.authorization.canChoose,
            tooltipDropdown: permission.authorization.canChoose
                ? this.t(
                      'ADMINISTRATIVE_INFRASTRUCTURE.INFRASTRUCTURE_TYPE.TOOLTIP.CHOOSE'
                  )
                : permission.tooltip.choose,
        };
    }
}
