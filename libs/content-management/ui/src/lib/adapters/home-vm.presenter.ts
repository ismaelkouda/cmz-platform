import { HomeStatus, HomeEntity } from '@cmz/content-management-domain';
import { actionItem, resolveTooltip, ROW_ACTION_LABEL, RowAction } from '@cmz/shared-ui';
import { HOME_STATUS_LABEL } from '../constants/home-status-label.constant';
import { homeStatusStyleOf } from '../mappers/home-status-style.mapper';
import { HomeVmProps } from './home-vm-props.interface';

interface HomePermission {
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

const T = 'CONTENT_MANAGEMENT.HOME.TOOLTIP';

export class HomePresenter {
    constructor(private readonly t: (key: string) => string) {}

    map(item: HomeEntity, permission: HomePermission): HomeVmProps {
        const { authorization: can, tooltip } = permission;
        const isOff = item.status === HomeStatus.INACTIVE;

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
            resume: item.resume,
            status: item.status,
            statusLabel: this.t(HOME_STATUS_LABEL[item.status]),
            statusStyle: homeStatusStyleOf(item.status),
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
