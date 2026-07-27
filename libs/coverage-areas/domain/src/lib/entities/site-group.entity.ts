import { Status } from '../enums/status.enum';
import { SiteGroupProps } from '../props/site-group.props';

export class SiteGroupEntity {
    constructor(private readonly props: SiteGroupProps) {}

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

    /** Mise à jour immuable : renvoie la même instance si rien n'a changé. */
    with(props: SiteGroupProps): SiteGroupEntity {
        if (
            this.updatedAt === props.updatedAt &&
            this.uniqId === props.uniqId
        ) {
            return this;
        }
        return new SiteGroupEntity(props);
    }
}
