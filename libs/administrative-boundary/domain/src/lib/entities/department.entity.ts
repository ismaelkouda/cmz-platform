import { Status } from '../enums/status.enum';
import { DepartmentProps } from '../props/department.props';

export class DepartmentEntity {
    constructor(private readonly props: DepartmentProps) {}

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

    with(props: DepartmentProps): DepartmentEntity {
        if (
            this.updatedAt === props.updatedAt &&
            this.uniqId === props.uniqId
        ) {
            return this;
        }
        return new DepartmentEntity(props);
    }
}
