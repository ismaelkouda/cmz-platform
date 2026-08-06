import { InfrastructureEntity } from '@cmz/administrative-infrastructure-domain';
import {
    actionItem,
    resolveTooltip,
    ROW_ACTION_LABEL,
    RowAction,
} from '@cmz/shared-ui';
import { InfrastructureVmProps } from './infrastructure-vm-props.interface';

interface InfrastructurePermission {
    authorization: { canEdit: boolean; canDelete: boolean; canChoose: boolean };
    tooltip: { edit: string; delete: string; choose: string };
}

const T = 'ADMINISTRATIVE_INFRASTRUCTURE.INFRASTRUCTURE.TOOLTIP';

/**
 * Presenter (UI) : `InfrastructureEntity` → view-model enrichi. `actionsRef` est
 * dérivé ici (`item.name`) — l'entité domaine reste pure.
 */
export class InfrastructurePresenter {
    constructor(private readonly t: (key: string) => string) {}

    map(
        item: InfrastructureEntity,
        permission: InfrastructurePermission
    ): InfrastructureVmProps {
        const { authorization: can, tooltip } = permission;
        return {
            uniqId: item.uniqId,
            name: item.name,
            type: item.type,
            description: item.description,
            region: item.region,
            department: item.department,
            municipality: item.municipality,
            position: item.position,
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
                actionItem(this.t, {
                    id: RowAction.DELETE,
                    label: ROW_ACTION_LABEL[RowAction.DELETE],
                    icon: 'pi pi-trash',
                    allowed: can.canDelete,
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
