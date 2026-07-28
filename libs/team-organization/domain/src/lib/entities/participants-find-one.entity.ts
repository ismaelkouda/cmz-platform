import { Role } from '@cmz/shared-domain';
import { ParticipantsFindOneProps } from '../props/participants-find-one.props';

export class ParticipantsFindOneEntity {
    constructor(private readonly props: ParticipantsFindOneProps) {}

    get uniqId(): string {
        return this.props.uniqId;
    }

    get firstName(): string {
        return this.props.firstName;
    }

    get lastName(): string {
        return this.props.lastName;
    }

    get email(): string {
        return this.props.email;
    }

    get phone(): string {
        return this.props.phone;
    }

    get role(): Role | null {
        return this.props.role;
    }

    get team(): string | null {
        return this.props.team;
    }

    get updatedAt(): string {
        return this.props.updatedAt;
    }

    with(props: ParticipantsFindOneProps): ParticipantsFindOneEntity {
        if (
            this.updatedAt === props.updatedAt &&
            this.uniqId === props.uniqId
        ) {
            return this;
        }
        return new ParticipantsFindOneEntity(props);
    }
}
