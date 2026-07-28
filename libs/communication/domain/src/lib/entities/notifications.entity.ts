import { TypeReport } from '@cmz/shared-domain';
import { NotificationsProps } from '../interfaces/notifications-props.interface';
import { NotificationsStatus } from '../enums/notifications-status.enum';

/**
 * `statusStyle()` du source (mapping statut → style) n'est pas porté ici :
 * même convention que le reste du projet, le style/label vit dans un
 * mapper UI dédié (`notifications-status-style.mapper.ts`), pas sur
 * l'entité domaine.
 */
export class NotificationsEntity {
    constructor(private readonly props: NotificationsProps) {}

    get uniqId(): string {
        return this.props.uniqId;
    }

    get reference(): string {
        return this.props.reference;
    }

    get title(): string {
        return this.props.title;
    }

    get type(): TypeReport {
        return this.props.type;
    }

    get message(): string {
        return this.props.message;
    }

    get status(): NotificationsStatus {
        return this.props.status;
    }

    get sendAt(): string {
        return this.props.sendAt;
    }

    get updatedAt(): string {
        return this.props.updatedAt;
    }

    public with(props: NotificationsProps): NotificationsEntity {
        if (
            this.updatedAt === props.updatedAt &&
            this.uniqId === props.uniqId
        ) {
            return this;
        }
        return new NotificationsEntity(props);
    }
}
