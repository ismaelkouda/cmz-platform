import { InfrastructureEntity } from '@cmz/administrative-infrastructure-domain';
import { InfrastructureVmProps } from './infrastructure-vm-props.interface';

interface InfrastructurePermission {
    authorization: { canEdit: boolean; canDelete: boolean; canChoose: boolean };
    tooltip: { edit: string; delete: string; choose: string };
}

/**
 * Presenter (UI) : `InfrastructureEntity` → view-model enrichi (actions,
 * tooltips). `actionsRef` est dérivé ici (`item.name`) — l'entité domaine reste
 * pure (getter UI retiré).
 */
export class InfrastructurePresenter {
    constructor(private readonly t: (key: string) => string) {}

    map(
        item: InfrastructureEntity,
        permission: InfrastructurePermission
    ): InfrastructureVmProps {
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
                {
                    id: 'edit',
                    label: 'COMMON.EDIT',
                    icon: 'pi pi-pencil',
                    disabled: !permission.authorization.canEdit,
                    tooltip: permission.authorization.canEdit
                        ? this.t(
                              'ADMINISTRATIVE_INFRASTRUCTURE.INFRASTRUCTURE.TOOLTIP.EDIT'
                          )
                        : permission.tooltip.edit,
                },
                {
                    id: 'delete',
                    label: 'COMMON.DELETE',
                    icon: 'pi pi-trash',
                    disabled: !permission.authorization.canDelete,
                    tooltip: permission.authorization.canDelete
                        ? this.t(
                              'ADMINISTRATIVE_INFRASTRUCTURE.INFRASTRUCTURE.TOOLTIP.DELETE'
                          )
                        : permission.tooltip.delete,
                },
            ],
            disableDropdown: !permission.authorization.canChoose,
            tooltipDropdown: permission.authorization.canChoose
                ? this.t(
                      'ADMINISTRATIVE_INFRASTRUCTURE.INFRASTRUCTURE.TOOLTIP.CHOOSE'
                  )
                : permission.tooltip.choose,
        };
    }
}
