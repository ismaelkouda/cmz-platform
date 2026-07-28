import {
    LegalNoticeStatus,
    LegalNoticeEntity,
} from '@cmz/content-management-domain';
import { ROW_ACTION_LABEL, RowAction } from '@cmz/shared-ui';
import { LEGAL_NOTICE_STATUS_LABEL } from '../constants/legal-notice-status-label.constant';
import { legalNoticeStatusStyleOf } from '../mappers/legal-notice-status-style.mapper';
import { actionItem, resolveTooltip } from './action-item.factory';
import { LegalNoticeVmProps } from './legal-notice-vm-props.interface';

interface LegalNoticePermission {
    authorization: {
        canEdit: boolean;
        canDelete: boolean;
        canPublish: boolean;
        canUnpublish: boolean;
        canChoose: boolean;
    };
    tooltip: {
        edit: string;
        delete: string;
        publish: string;
        unpublish: string;
        choose: string;
    };
}

const T = 'CONTENT_MANAGEMENT.LEGAL_NOTICE.TOOLTIP';

export class LegalNoticePresenter {
    constructor(private readonly t: (key: string) => string) {}

    map(
        item: LegalNoticeEntity,
        permission: LegalNoticePermission
    ): LegalNoticeVmProps {
        const { authorization: can, tooltip } = permission;
        const isOff = item.status === LegalNoticeStatus.UNPUBLISH;

        const toggle = isOff
            ? actionItem(this.t, {
                  id: RowAction.ENABLE,
                  label: ROW_ACTION_LABEL[RowAction.ENABLE],
                  icon: 'pi pi-check',
                  allowed: can.canPublish,
                  tooltipKey: `${T}.PUBLISH`,
                  fallbackTooltip: tooltip.publish,
              })
            : actionItem(this.t, {
                  id: RowAction.DISABLE,
                  label: ROW_ACTION_LABEL[RowAction.DISABLE],
                  icon: 'pi pi-times',
                  allowed: can.canUnpublish,
                  tooltipKey: `${T}.UNPUBLISH`,
                  fallbackTooltip: tooltip.unpublish,
              });

        return {
            uniqId: item.uniqId,
            version: item.version,
            status: item.status,
            statusLabel: this.t(LEGAL_NOTICE_STATUS_LABEL[item.status]),
            statusStyle: legalNoticeStatusStyleOf(item.status),
            updatedAt: item.updatedAt,
            actionsRef: item.version,
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
