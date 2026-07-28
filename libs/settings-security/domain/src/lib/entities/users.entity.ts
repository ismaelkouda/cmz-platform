import { Role } from '@cmz/shared-domain';
import { UsersStatus } from '../enums/users-status.enum';
import { UsersProps } from '../props/users.props';

export class UsersEntity {
    constructor(private readonly props: UsersProps) {}

    get uniqId(): string {
        return this.props.uniqId;
    }

    get lastName(): string {
        return this.props.lastName;
    }

    get firstName(): string {
        return this.props.firstName;
    }

    get email(): string {
        return this.props.email;
    }

    get phone(): string {
        return this.props.phone;
    }

    get profile(): string {
        return this.props.profile;
    }

    get role(): Role | null {
        return this.props.role;
    }

    get status(): UsersStatus {
        return this.props.status;
    }

    get updatedAt(): string {
        return this.props.updatedAt;
    }

    with(props: UsersProps): UsersEntity {
        if (
            this.updatedAt === props.updatedAt &&
            this.uniqId === props.uniqId
        ) {
            return this;
        }
        return new UsersEntity(props);
    }
}
