import { Status } from '../enums/status.enum';
import { DepartmentFindOneProps } from '../props/department-find-one.props';

export class DepartmentFindOneEntity {
    constructor(private readonly props: DepartmentFindOneProps) {}

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

    get populationSize(): number {
        return this.props.populationSize;
    }

    get infrastructureCount(): number {
        return this.props.infrastructureCount;
    }

    get municipalitiesCount(): number {
        return this.props.municipalitiesCount;
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

    with(props: DepartmentFindOneProps): DepartmentFindOneEntity {
        if (
            this.updatedAt === props.updatedAt &&
            this.uniqId === props.uniqId
        ) {
            return this;
        }
        return new DepartmentFindOneEntity(props);
    }
}
