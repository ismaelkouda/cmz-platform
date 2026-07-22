import { ResourcesFindOneProps } from '@pages/seos-reference/domain/interfaces/resources/resources-find-one-props.interface';

export class ResourcesFindOneEntity {
    constructor(private readonly props: ResourcesFindOneProps) {}

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
    get updatedAt(): string {
        return this.props.updatedAt;
    }

    public with(props: ResourcesFindOneProps): ResourcesFindOneEntity {
        if (
            this.updatedAt === props.updatedAt &&
            this.uniqId === props.uniqId
        ) {
            return this;
        }
        return new ResourcesFindOneEntity(props);
    }
}
