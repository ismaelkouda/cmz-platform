import {
    ParticipantsEntity,
    ParticipantsStatus,
} from '@cmz/team-organization-domain';
import { ROLE_LABEL, ROW_ACTION_LABEL, RowAction } from '@cmz/shared-ui';
import { PARTICIPANTS_STATUS_LABEL } from '../constants/participants-status-label.constant';
import { participantsStatusStyleOf } from '../mappers/participants-status-style.mapper';
import { actionItem, resolveTooltip } from './action-item.factory';
import { ParticipantsVmProps } from './participants-vm-props.interface';

interface ParticipantsPermission {
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

const T = 'TEAM_ORGANIZATION.PARTICIPANTS.TOOLTIP';

/**
 * Presenter (UI) : `ParticipantsEntity` → view-model. Le menu dépend du
 * statut : `enable` proposé pour tout statut ≠ `ACTIVE` (4 valeurs
 * possibles ici, contrairement au binaire actif/inactif de `site-group`).
 */
export class ParticipantsPresenter {
    constructor(private readonly t: (key: string) => string) {}

    map(
        item: ParticipantsEntity,
        permission: ParticipantsPermission
    ): ParticipantsVmProps {
        const { authorization: can, tooltip } = permission;
        const isActive = item.status === ParticipantsStatus.ACTIVE;

        const toggle = isActive
            ? actionItem(this.t, {
                  id: RowAction.DISABLE,
                  label: ROW_ACTION_LABEL[RowAction.DISABLE],
                  icon: 'pi pi-times',
                  allowed: can.canDisable,
                  tooltipKey: `${T}.DISABLE`,
                  fallbackTooltip: tooltip.disable,
              })
            : actionItem(this.t, {
                  id: RowAction.ENABLE,
                  label: ROW_ACTION_LABEL[RowAction.ENABLE],
                  icon: 'pi pi-check',
                  allowed: can.canEnable,
                  tooltipKey: `${T}.ENABLE`,
                  fallbackTooltip: tooltip.enable,
              });

        return {
            uniqId: item.uniqId,
            firstName: item.firstName,
            lastName: item.lastName,
            email: item.email,
            phone: item.phone,
            role: item.role,
            roleLabel: item.role ? this.t(ROLE_LABEL[item.role]) : '',
            team: item.team,
            status: item.status,
            statusLabel: this.t(PARTICIPANTS_STATUS_LABEL[item.status]),
            statusStyle: participantsStatusStyleOf(item.status),
            updatedAt: item.updatedAt,
            actionsRef: `${item.firstName} ${item.lastName}`,
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
                    allowed: can.canDelete && !isActive,
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
