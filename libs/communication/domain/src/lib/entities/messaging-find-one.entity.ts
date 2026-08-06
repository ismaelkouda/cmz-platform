import { MessagingChannel } from '../enums/messaging-channel.enum';
import { MessagingFindOneProps } from '../props/messaging-find-one.props';
import { MessagingTarget } from '../enums/messaging-target.enum';
import { MessagingType } from '../enums/messaging-type.enum';

export class MessagingFindOneEntity {
    constructor(private readonly props: MessagingFindOneProps) {}

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

    public with(props: MessagingFindOneProps): MessagingFindOneEntity {
        if (
            this.updatedAt === props.updatedAt &&
            this.uniqId === props.uniqId
        ) {
            return this;
        }
        return new MessagingFindOneEntity(props);
    }
}
