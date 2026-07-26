import {
    InfrastructureTypeEntity,
    Status,
} from '@cmz/administrative-infrastructure-domain';
import { ROW_ACTION_LABEL, RowAction } from '@cmz/shared-ui';
import { statusStyleOf } from '../mappers/infrastructure-type-status-style.mapper';
import { actionItem, resolveTooltip } from './action-item.factory';
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

const T = 'ADMINISTRATIVE_INFRASTRUCTURE.INFRASTRUCTURE_TYPE.TOOLTIP';

/**
 * Presenter (UI) : `InfrastructureTypeEntity` → view-model. `statusStyle` et
 * `actionsRef` sont calculés ici (`statusStyleOf`, `item.name`) — l'entité
 * domaine reste pure. Le menu dépend du statut (enable/disable, delete inactif
 * quand actif).
 */
export class InfrastructureTypePresenter {
    constructor(private readonly t: (key: string) => string) {}

    map(
        item: InfrastructureTypeEntity,
        permission: InfrastructureTypePermission
    ): InfrastructureTypeVmProps {
        const { authorization: can, tooltip } = permission;
        const isInactive = item.status === Status.INACTIVE;

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
            description: item.description,
            status: item.status,
            statusLabel: this.t(item.status),
            statusStyle: statusStyleOf(item.status),
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
                    allowed: can.canDelete && item.status !== Status.ACTIVE,
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
