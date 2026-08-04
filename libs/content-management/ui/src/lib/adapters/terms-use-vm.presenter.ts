import { TermsUseStatus, TermsUseEntity } from '@cmz/content-management-domain';
import { actionItem, resolveTooltip, ROW_ACTION_LABEL, RowAction } from '@cmz/shared-ui';
import { TERMS_USE_STATUS_LABEL } from '../constants/terms-use-status-label.constant';
import { termsUseStatusStyleOf } from '../mappers/terms-use-status-style.mapper';
import { TermsUseVmProps } from './terms-use-vm-props.interface';

interface TermsUsePermission {
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

const T = 'CONTENT_MANAGEMENT.TERMS_USE.TOOLTIP';

export class TermsUsePresenter {
    constructor(private readonly t: (key: string) => string) {}

    map(item: TermsUseEntity, permission: TermsUsePermission): TermsUseVmProps {
        const { authorization: can, tooltip } = permission;
        const isOff = item.status === TermsUseStatus.UNPUBLISH;

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
            statusLabel: this.t(TERMS_USE_STATUS_LABEL[item.status]),
            statusStyle: termsUseStatusStyleOf(item.status),
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
