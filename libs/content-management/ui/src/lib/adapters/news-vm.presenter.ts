import { NewsStatus, NewsEntity } from '@cmz/content-management-domain';
import {
    actionItem,
    resolveTooltip,
    ROW_ACTION_LABEL,
    RowAction,
} from '@cmz/shared-ui';
import { NEWS_STATUS_LABEL } from '../constants/news-status-label.constant';
import { newsStatusStyleOf } from '../mappers/news-status-style.mapper';
import { NewsVmProps } from './news-vm-props.interface';

interface NewsPermission {
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

const T = 'CONTENT_MANAGEMENT.NEWS.TOOLTIP';

export class NewsPresenter {
    constructor(private readonly t: (key: string) => string) {}

    map(item: NewsEntity, permission: NewsPermission): NewsVmProps {
        const { authorization: can, tooltip } = permission;
        const isOff = item.status === NewsStatus.UNPUBLISH;

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
            title: item.title,
            category: item.category,
            subCategory: item.subCategory,
            status: item.status,
            statusLabel: this.t(NEWS_STATUS_LABEL[item.status]),
            statusStyle: newsStatusStyleOf(item.status),
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
