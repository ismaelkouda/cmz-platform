import { ProfilesPermissionsStatus } from '../enums/profiles-permissions-status.enum';
import { ProfilesPermissionsProps } from '../props/profiles-permissions.props';

export class ProfilesPermissionsEntity {
    constructor(private readonly props: ProfilesPermissionsProps) {}

    get uniqId(): string {
        return this.props.uniqId;
    }

    get name(): string {
        return this.props.name;
    }

    get slug(): string {
        return this.props.slug;
    }

    get description(): string {
        return this.props.description;
    }

    get usersCount(): number {
        return this.props.usersCount;
    }

    get status(): ProfilesPermissionsStatus {
        return this.props.status;
    }

    get createdAt(): string {
        return this.props.createdAt;
    }

    get updatedAt(): string {
        return this.props.updatedAt;
    }

    with(props: ProfilesPermissionsProps): ProfilesPermissionsEntity {
        if (
            this.updatedAt === props.updatedAt &&
            this.uniqId === props.uniqId
        ) {
            return this;
        }
        return new ProfilesPermissionsEntity(props);
    }
}
