import { PermissionTreeNode } from '../props/permission-tree-node.props';
import { ProfilesPermissionsFindOneProps } from '../props/profiles-permissions-find-one.props';

export class ProfilesPermissionsFindOneEntity {
    constructor(private readonly props: ProfilesPermissionsFindOneProps) {}

    get uniqId(): string {
        return this.props.uniqId;
    }

    get name(): string {
        return this.props.name;
    }

    get description(): string {
        return this.props.description;
    }

    get permissions(): PermissionTreeNode[] {
        return this.props.permissions;
    }

    with(
        props: ProfilesPermissionsFindOneProps
    ): ProfilesPermissionsFindOneEntity {
        if (this.uniqId === props.uniqId) {
            return this;
        }
        return new ProfilesPermissionsFindOneEntity(props);
    }
}
