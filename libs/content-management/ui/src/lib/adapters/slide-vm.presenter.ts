import { SlideStatus, SlideEntity } from '@cmz/content-management-domain';
import { actionItem, resolveTooltip, ROW_ACTION_LABEL, RowAction } from '@cmz/shared-ui';
import { SLIDE_STATUS_LABEL } from '../constants/slide-status-label.constant';
import { slideStatusStyleOf } from '../mappers/slide-status-style.mapper';
import { SlideVmProps } from './slide-vm-props.interface';

interface SlidePermission {
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

const T = 'CONTENT_MANAGEMENT.SLIDE.TOOLTIP';

export class SlidePresenter {
    constructor(private readonly t: (key: string) => string) {}

    map(item: SlideEntity, permission: SlidePermission): SlideVmProps {
        const { authorization: can, tooltip } = permission;
        const isOff = item.status === SlideStatus.INACTIVE;

        const toggle = isOff
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
            title: item.title,
            subtitle: item.subtitle,
            status: item.status,
            statusLabel: this.t(SLIDE_STATUS_LABEL[item.status]),
            statusStyle: slideStatusStyleOf(item.status),
            updatedAt: item.updatedAt,
            actionsRef: item.title,
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
