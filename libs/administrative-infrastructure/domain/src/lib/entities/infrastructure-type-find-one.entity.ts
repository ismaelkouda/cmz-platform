import { InfrastructureTypeFindOneProps } from '../props/infrastructure-type-find-one.props';

export class InfrastructureTypeFindOneEntity {
    constructor(private readonly props: InfrastructureTypeFindOneProps) {}

    get uniqId(): string {
        return this.props.uniqId;
    }

    get name(): string {
        return this.props.name;
    }

    get description(): string {
        return this.props.description;
    }

    get updatedAt(): string {
        return this.props.updatedAt;
    }

    with(
        props: InfrastructureTypeFindOneProps
    ): InfrastructureTypeFindOneEntity {
        if (
            this.updatedAt === props.updatedAt &&
            this.uniqId === props.uniqId
        ) {
            return this;
        }
        return new InfrastructureTypeFindOneEntity(props);
    }
}
