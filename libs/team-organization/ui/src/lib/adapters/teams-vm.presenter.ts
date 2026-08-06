import { TeamsEntity, TeamsStatus } from '@cmz/team-organization-domain';
import {
    actionItem,
    resolveTooltip,
    ROW_ACTION_LABEL,
    RowAction,
} from '@cmz/shared-ui';
import { TEAMS_STATUS_LABEL } from '../constants/teams-status-label.constant';
import { teamsStatusStyleOf } from '../mappers/teams-status-style.mapper';
import { TeamsVmProps } from './teams-vm-props.interface';

interface TeamsPermission {
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

const T = 'TEAM_ORGANIZATION.TEAMS.TOOLTIP';

export class TeamsPresenter {
    constructor(private readonly t: (key: string) => string) {}

    map(item: TeamsEntity, permission: TeamsPermission): TeamsVmProps {
        const { authorization: can, tooltip } = permission;
        const isInactive = item.status === TeamsStatus.INACTIVE;

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
            code: item.code,
            name: item.name,
            description: item.description,
            membersCount: item.membersCount,
            status: item.status,
            statusLabel: this.t(TEAMS_STATUS_LABEL[item.status]),
            statusStyle: teamsStatusStyleOf(item.status),
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
                    allowed:
                        can.canDelete && item.status !== TeamsStatus.ACTIVE,
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
