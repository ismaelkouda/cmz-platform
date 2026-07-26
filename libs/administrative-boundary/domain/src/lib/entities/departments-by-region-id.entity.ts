import { Status } from '../enums/status.enum';
import { DepartmentsByRegionIdProps } from '../props/departments-by-region-id.props';

export class DepartmentsByRegionIdEntity {
    constructor(private readonly props: DepartmentsByRegionIdProps) {}

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

    get populationSize(): number {
        return this.props.populationSize;
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

    with(props: DepartmentsByRegionIdProps): DepartmentsByRegionIdEntity {
        if (
            this.updatedAt === props.updatedAt &&
            this.uniqId === props.uniqId
        ) {
            return this;
        }
        return new DepartmentsByRegionIdEntity(props);
    }
}
