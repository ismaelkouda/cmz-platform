import { Status } from '../enums/status.enum';
import { MunicipalityFindOneProps } from '../props/municipality-find-one.props';

export class MunicipalityFindOneEntity {
    constructor(private readonly props: MunicipalityFindOneProps) {}

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

    get region(): { id: string; name: string } {
        return this.props.region;
    }

    get department(): { id: string; name: string } {
        return this.props.department;
    }

    get populationSize(): number {
        return this.props.populationSize;
    }

    get infrastructureCount(): number {
        return this.props.infrastructureCount;
    }

    get status(): Status {
        return this.props.status;
    }

    get createdAt(): string {
        return this.props.createdAt;
    }

    get updatedAt(): string {
        return this.props.updatedAt;
    }

    with(props: MunicipalityFindOneProps): MunicipalityFindOneEntity {
        if (
            this.updatedAt === props.updatedAt &&
            this.uniqId === props.uniqId
        ) {
            return this;
        }
        return new MunicipalityFindOneEntity(props);
    }
}
