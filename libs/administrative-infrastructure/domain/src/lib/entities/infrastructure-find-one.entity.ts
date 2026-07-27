import { CoordinatesProps } from '@cmz/shared-domain';
import { InfrastructureFindOneProps } from '../props/infrastructure-find-one.props';

export class InfrastructureFindOneEntity {
    constructor(private readonly props: InfrastructureFindOneProps) {}

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

    get position(): CoordinatesProps {
        return this.props.position;
    }

    get createdAt(): string {
        return this.props.createdAt;
    }

    get updatedAt(): string {
        return this.props.updatedAt;
    }

    with(props: InfrastructureFindOneProps): InfrastructureFindOneEntity {
        if (
            this.updatedAt === props.updatedAt &&
            this.uniqId === props.uniqId
        ) {
            return this;
        }
        return new InfrastructureFindOneEntity(props);
    }
}
