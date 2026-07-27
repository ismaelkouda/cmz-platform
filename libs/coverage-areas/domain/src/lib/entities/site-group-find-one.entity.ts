import { Status } from '../enums/status.enum';
import { SiteGroupFindOneProps } from '../props/site-group-find-one.props';

export class SiteGroupFindOneEntity {
    constructor(private readonly props: SiteGroupFindOneProps) {}

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

    get status(): Status {
        return this.props.status;
    }

    get updatedAt(): string {
        return this.props.updatedAt;
    }

    with(props: SiteGroupFindOneProps): SiteGroupFindOneEntity {
        if (
            this.updatedAt === props.updatedAt &&
            this.uniqId === props.uniqId
        ) {
            return this;
        }
        return new SiteGroupFindOneEntity(props);
    }
}
