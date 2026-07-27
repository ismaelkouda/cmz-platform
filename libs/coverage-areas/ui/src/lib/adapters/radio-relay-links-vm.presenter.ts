import { RadioRelayLinksEntity, Status } from '@cmz/coverage-areas-domain';
import { ROW_ACTION_LABEL, RowAction } from '@cmz/shared-ui';
import { STATUS_LABEL } from '../constants/site-group-status-label.constant';
import { statusStyleOf } from '../mappers/site-group-status-style.mapper';
import { actionItem, resolveTooltip } from './action-item.factory';
import { RadioRelayLinksVmProps } from './radio-relay-links-vm-props.interface';

interface RadioRelayLinksPermission {
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

const T = 'COVERAGE_AREAS.RADIO_RELAY_LINKS.TOOLTIP';

/**
 * Presenter (UI) : `RadioRelayLinksEntity` → view-model. Réutilise
 * `STATUS_LABEL`/`statusStyleOf` de `site-group` (Status partagé, cf.
 * `MobileNetworkPresenter`). `startDate`/`endDate` sont formatées en
 * `YYYY-MM-DD` pour l'affichage tableau.
 */
export class RadioRelayLinksPresenter {
    constructor(private readonly t: (key: string) => string) {}

    map(
        item: RadioRelayLinksEntity,
        permission: RadioRelayLinksPermission
    ): RadioRelayLinksVmProps {
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
            operator: item.operator,
            frequency: item.frequency,
            startDate: item.startDate.toISOString().slice(0, 10),
            endDate: item.endDate.toISOString().slice(0, 10),
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
