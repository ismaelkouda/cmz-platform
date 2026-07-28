import { Role } from '@cmz/shared-domain';
import { UsersFindOneProps } from '../props/users-find-one.props';

export class UsersFindOneEntity {
    constructor(private readonly props: UsersFindOneProps) {}

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

    get updatedAt(): string {
        return this.props.updatedAt;
    }

    with(props: UsersFindOneProps): UsersFindOneEntity {
        if (
            this.updatedAt === props.updatedAt &&
            this.uniqId === props.uniqId
        ) {
            return this;
        }
        return new UsersFindOneEntity(props);
    }
}
