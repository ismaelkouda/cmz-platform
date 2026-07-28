import { Role } from '@cmz/shared-domain';
import { ParticipantsStatus } from '../enums/participants-status.enum';
import { ParticipantsProps } from '../props/participants.props';

export class ParticipantsEntity {
    constructor(private readonly props: ParticipantsProps) {}

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

    get status(): ParticipantsStatus {
        return this.props.status;
    }

    get updatedAt(): string {
        return this.props.updatedAt;
    }

    /** Mise à jour immuable : renvoie la même instance si rien n'a changé. */
    with(props: ParticipantsProps): ParticipantsEntity {
        if (
            this.updatedAt === props.updatedAt &&
            this.uniqId === props.uniqId
        ) {
            return this;
        }
        return new ParticipantsEntity(props);
    }
}
