import { MessagingEntity } from '@cmz/communication-domain';
import { ROW_ACTION_LABEL, RowAction } from '@cmz/shared-ui';
import { MESSAGING_CHANNEL_LABEL } from '../constants/messaging-channel-label.constant';
import { MESSAGING_TARGET_LABEL } from '../constants/messaging-target-label.constant';
import { MESSAGING_TYPE_LABEL } from '../constants/messaging-type-label.constant';
import { actionItem, resolveTooltip } from './action-item.factory';
import { MessagingVmProps } from './messaging-vm-props.interface';

interface MessagingPermission {
    authorization: {
        canView: boolean;
        canEdit: boolean;
        canDelete: boolean;
        canChoose: boolean;
    };
    tooltip: {
        view: string;
        edit: string;
        delete: string;
        choose: string;
    };
}

const T = 'COMMUNICATION.MESSAGING.TOOLTIP';

/**
 * `view`/`edit`/`delete` — pas `enable`/`disable` : contrairement à `users`
 * (`status` sur l'entité), `MessagingEntity` n'expose aucun champ d'état
 * pour déterminer le sens d'une bascule activer/désactiver. Le source
 * déclarait bien `enable`/`disable` sur le repository, mais ne les
 * branchait à AUCUN bouton réel (seul `view` était un `TableAction` réel,
 * `edit` était même perpétuellement en lecture seule côté source — bug
 * d'incomplétude, pas une contrainte assumée). Reconstruit ici avec un
 * `edit` réellement fonctionnel (le backend le supporte, vérifié via les
 * DTOs/endpoints), cohérent avec l'archétype CRUD complet du reste du
 * projet — enable/disable restent au niveau repository/facade (fidélité
 * au contrat backend) sans bouton UI dédié.
 */
export class MessagingPresenter {
    constructor(private readonly t: (key: string) => string) {}

    map(item: MessagingEntity, permission: MessagingPermission): MessagingVmProps {
        const { authorization: can, tooltip } = permission;

        return {
            uniqId: item.uniqId,
            typeLabel: this.t(MESSAGING_TYPE_LABEL[item.type]),
            targetTypeLabel: this.t(MESSAGING_TARGET_LABEL[item.targetType]),
            channelsLabel: item.channels
                .map((channel) => this.t(MESSAGING_CHANNEL_LABEL[channel]))
                .join(', '),
            subject: item.subject,
            content: item.content,
            createdAt: item.createdAt,
            actionsRef: item.subject,
            dropdownActions: [
                actionItem(this.t, {
                    id: 'view',
                    label: 'COMMON.VIEW',
                    icon: 'pi pi-eye',
                    allowed: can.canView,
                    tooltipKey: `${T}.VIEW`,
                    fallbackTooltip: tooltip.view,
                }),
                actionItem(this.t, {
                    id: RowAction.EDIT,
                    label: ROW_ACTION_LABEL[RowAction.EDIT],
                    icon: 'pi pi-pencil',
                    allowed: can.canEdit,
                    tooltipKey: `${T}.EDIT`,
                    fallbackTooltip: tooltip.edit,
                }),
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
