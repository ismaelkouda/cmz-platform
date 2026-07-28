import { TeamsStatus } from '../enums/teams-status.enum';
import { TeamsProps } from '../props/teams.props';

export class TeamsEntity {
    constructor(private readonly props: TeamsProps) {}

    get uniqId(): string {
        return this.props.uniqId;
    }

    get code(): string {
        return this.props.code;
    }

    get name(): string {
        return this.props.name;
    }

    get description(): string {
        return this.props.description;
    }

    get status(): TeamsStatus {
        return this.props.status;
    }

    get membersCount(): string {
        return this.props.membersCount;
    }

    get updatedAt(): string {
        return this.props.updatedAt;
    }

    with(props: TeamsProps): TeamsEntity {
        if (
            this.updatedAt === props.updatedAt &&
            this.uniqId === props.uniqId
        ) {
            return this;
        }
        return new TeamsEntity(props);
    }
}
