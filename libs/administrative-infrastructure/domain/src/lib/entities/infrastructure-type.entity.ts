import { Status } from '../enums/infrastructure-type-status.enum';
import { InfrastructureTypeProps } from '../props/infrastructure-type.props';

export class InfrastructureTypeEntity {
    constructor(private readonly props: InfrastructureTypeProps) {}

    get uniqId(): string {
        return this.props.uniqId;
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
    with(props: InfrastructureTypeProps): InfrastructureTypeEntity {
        if (
            this.updatedAt === props.updatedAt &&
            this.uniqId === props.uniqId
        ) {
            return this;
        }
        return new InfrastructureTypeEntity(props);
    }
}
