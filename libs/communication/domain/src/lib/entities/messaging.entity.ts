import { MessagingChannel } from '../enums/messaging-channel.enum';
import { MessagingProps } from '../props/messaging.props';
import { MessagingTarget } from '../enums/messaging-target.enum';
import { MessagingType } from '../enums/messaging-type.enum';

/**
 * `sender`/`readAt`/`actionsRef` du source ne sont pas portés : getters
 * décoratifs vérifiés morts (grep sur tout le repo source — jamais lus
 * ailleurs que dans leur propre déclaration ; le presenter source
 * réaffecte même `actionsRef` à `createdAt` sans jamais appeler le getter
 * de l'entité). Même posture que `CategoryEntity`/`SubCategoryEntity`
 * (content-management) : code mort confirmé, non reconduit.
 */
export class MessagingEntity {
    constructor(private readonly props: MessagingProps) {}

    get uniqId(): string {
        return this.props.uniqId;
    }

    get reportId(): string {
        return this.props.reportId;
    }

    get type(): MessagingType {
        return this.props.type;
    }

    get targetType(): MessagingTarget {
        return this.props.targetType;
    }

    get region(): string {
        return this.props.region;
    }

    get department(): string {
        return this.props.department;
    }

    get municipality(): string {
        return this.props.municipality;
    }

    get channels(): MessagingChannel[] {
        return this.props.channels;
    }

    get subject(): string {
        return this.props.subject;
    }

    get content(): string {
        return this.props.content;
    }

    get createdAt(): string {
        return this.props.createdAt;
    }

    get updatedAt(): string {
        return this.props.updatedAt;
    }

    public with(props: MessagingProps): MessagingEntity {
        if (
            this.updatedAt === props.updatedAt &&
            this.uniqId === props.uniqId
        ) {
            return this;
        }
        return new MessagingEntity(props);
    }
}
