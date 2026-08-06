import { MunicipalityEntity } from '@cmz/administrative-boundary-domain';
import {
    actionItem,
    resolveTooltip,
    ROW_ACTION_LABEL,
    RowAction,
} from '@cmz/shared-ui';
import { STATUS_LABEL } from '../constants/status-label.constant';
import { statusStyleOf } from '../mappers/status-style.mapper';
import { MunicipalityVmProps } from './municipality-vm-props.interface';

interface MunicipalityPermission {
    authorization: { canEdit: boolean; canDelete: boolean; canChoose: boolean };
    tooltip: { edit: string; delete: string; choose: string };
}

const T = 'ADMINISTRATIVE_BOUNDARY.MUNICIPALITY';

/**
 * Presenter (UI) : `MunicipalityEntity` → view-model. Pas de toggle, pas de
 * drill-down (feuille du cascade, aucun enfant) : menu limité à
 * `EDIT`/`DELETE`, `DELETE` sans condition d'enfants (contrairement à
 * region/department).
 */
export class MunicipalityPresenter {
    constructor(private readonly t: (key: string) => string) {}

    map(
        item: MunicipalityEntity,
        permission: MunicipalityPermission
    ): MunicipalityVmProps {
        const { authorization: can, tooltip } = permission;

        return {
            uniqId: item.uniqId,
            code: item.code,
            name: item.name,
            description: item.description,
            regionId: item.region.id,
            regionName: item.region.name,
            departmentId: item.department.id,
            departmentName: item.department.name,
            populationSize: item.populationSize,
            infrastructureCount: item.infrastructureCount,
            status: item.status,
            statusLabel: this.t(STATUS_LABEL[item.status]),
            statusStyle: statusStyleOf(item.status),
            updatedAt: item.updatedAt,
            actionsRef: item.name,
            dropdownActions: [
                actionItem(this.t, {
                    id: RowAction.EDIT,
                    label: ROW_ACTION_LABEL[RowAction.EDIT],
                    icon: 'pi pi-pencil',
                    allowed: can.canEdit,
                    tooltipKey: `${T}.TOOLTIP.EDIT`,
                    fallbackTooltip: tooltip.edit,
                }),
                actionItem(this.t, {
                    id: RowAction.DELETE,
                    label: ROW_ACTION_LABEL[RowAction.DELETE],
                    icon: 'pi pi-trash',
                    allowed: can.canDelete,
                    tooltipKey: `${T}.TOOLTIP.DELETE`,
                    fallbackTooltip: tooltip.delete,
                }),
            ],
            disableDropdown: !can.canChoose,
            tooltipDropdown: resolveTooltip(
                this.t,
                can.canChoose,
                `${T}.TOOLTIP.CHOOSE`,
                tooltip.choose
            ),
        };
    }
}
