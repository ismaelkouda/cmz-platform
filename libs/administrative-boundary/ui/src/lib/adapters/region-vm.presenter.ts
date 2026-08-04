import { RegionEntity } from '@cmz/administrative-boundary-domain';
import { actionItem, resolveTooltip, ROW_ACTION_LABEL, RowAction } from '@cmz/shared-ui';
import { STATUS_LABEL } from '../constants/status-label.constant';
import { statusStyleOf } from '../mappers/status-style.mapper';
import { RegionVmProps } from './region-vm-props.interface';

interface RegionPermission {
    authorization: { canEdit: boolean; canDelete: boolean; canChoose: boolean };
    tooltip: { edit: string; delete: string; choose: string };
}

const T = 'ADMINISTRATIVE_BOUNDARY.REGION';

/**
 * Presenter (UI) : `RegionEntity` → view-model. Pas de toggle (region ne porte
 * pas d'enable/disable) : menu limité à `EDIT`/`DELETE`. `DELETE` bloqué si la
 * région a encore des départements/communes rattachés (parent hiérarchique,
 * cf. décision « delete bloqué si enfants > 0 »).
 */
export class RegionPresenter {
    constructor(private readonly t: (key: string) => string) {}

    map(item: RegionEntity, permission: RegionPermission): RegionVmProps {
        const { authorization: can, tooltip } = permission;
        const hasChildren =
            item.departmentsCount > 0 || item.municipalitiesCount > 0;

        return {
            uniqId: item.uniqId,
            code: item.code,
            name: item.name,
            description: item.description,
            populationSize: item.populationSize,
            infrastructureCount: item.infrastructureCount,
            departmentsCount: item.departmentsCount,
            municipalitiesCount: item.municipalitiesCount,
            status: item.status,
            statusLabel: this.t(STATUS_LABEL[item.status]),
            statusStyle: statusStyleOf(item.status),
            updatedAt: item.updatedAt,
            actionsRef: item.name,
            dropdownActions: [
                actionItem(this.t, {
                    id: 'view-departments',
                    label: `${T}.ACTION.VIEW_DEPARTMENTS`,
                    icon: 'pi pi-sitemap',
                    allowed: can.canChoose,
                    tooltipKey: `${T}.TOOLTIP.VIEW_DEPARTMENTS`,
                    fallbackTooltip: tooltip.choose,
                }),
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
                    allowed: can.canDelete && !hasChildren,
                    tooltipKey: hasChildren
                        ? `${T}.TOOLTIP.DELETE_HAS_CHILDREN`
                        : `${T}.TOOLTIP.DELETE`,
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
