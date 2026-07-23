import { InfrastructureProps } from '../props/infrastructure.props';

export class InfrastructureEntity {
    constructor(private readonly props: InfrastructureProps) {}

    get uniqId(): string {
        return this.props.uniqId;
    }

    get name(): string {
        return this.props.name;
    }

    get type(): string {
        return this.props.type;
    }

    get description(): string {
        return this.props.description;
    }

    get region(): string {
        return this.props.region;
    }

    get department(): string {
        return this.props.department;
    }

    get municipality(): string {
        return this.props.municipality;
    }

    get position(): string {
        return this.props.position;
    }

    get updatedAt(): string {
        return this.props.updatedAt;
    }

    with(props: InfrastructureProps): InfrastructureEntity {
        if (
            this.updatedAt === props.updatedAt &&
            this.uniqId === props.uniqId
        ) {
            return this;
        }
        return new InfrastructureEntity(props);
    }
}
