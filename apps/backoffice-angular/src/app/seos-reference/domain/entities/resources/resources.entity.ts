import { ResourcesProps } from '@pages/seos-reference/domain/interfaces/resources/resources-props.interface';

export class ResourcesEntity {
    constructor(private readonly props: ResourcesProps) {}

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
    get createdAt(): string {
        return this.props.createdAt;
    }
    get updatedAt(): string {
        return this.props.updatedAt;
    }

    public with(props: ResourcesProps): ResourcesEntity {
        if (
            this.updatedAt === props.updatedAt &&
            this.uniqId === props.uniqId
        ) {
            return this;
        }
        return new ResourcesEntity(props);
    }
}
