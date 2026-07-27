import { MobileNetworkEntity, Status } from '@cmz/coverage-areas-domain';
import { ROW_ACTION_LABEL, RowAction } from '@cmz/shared-ui';
import { STATUS_LABEL } from '../constants/site-group-status-label.constant';
import { statusStyleOf } from '../mappers/site-group-status-style.mapper';
import { actionItem, resolveTooltip } from './action-item.factory';
import { MobileNetworkVmProps } from './mobile-network-vm-props.interface';

interface MobileNetworkPermission {
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

const T = 'COVERAGE_AREAS.MOBILE_NETWORK.TOOLTIP';

/**
 * Presenter (UI) : `MobileNetworkEntity` → view-model. Réutilise
 * `STATUS_LABEL`/`statusStyleOf` de `site-group` — `Status`/`StatusStyle`
 * sont partagés au niveau de la lib `coverage-areas` (décision Phase 2), pas
 * dupliqués par entité ; seuls les noms de fichiers restent hérités du
 * premier consommateur (dette de nommage documentée, pas corrigée ici).
 */
export class MobileNetworkPresenter {
    constructor(private readonly t: (key: string) => string) {}

    map(
        item: MobileNetworkEntity,
        permission: MobileNetworkPermission
    ): MobileNetworkVmProps {
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
            siteId: item.siteId,
            siteName: item.siteName,
            towerTypeId: item.towerTypeId,
            towerTypeName: item.towerTypeName,
            towerSize: item.towerSize,
            technology: item.technology.join(', '),
            operator: item.operator,
            radius: item.radius,
            status: item.status,
            statusLabel: this.t(STATUS_LABEL[item.status]),
            statusStyle: statusStyleOf(item.status),
            updatedAt: item.updatedAt,
            actionsRef: item.siteName,
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
