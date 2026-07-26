import { Status } from '../enums/status.enum';
import { MunicipalitiesByDepartmentIdProps } from '../props/municipalities-by-department-id.props';

export class MunicipalitiesByDepartmentIdEntity {
    constructor(private readonly props: MunicipalitiesByDepartmentIdProps) {}

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

    get status(): Status {
        return this.props.status;
    }

    get createdAt(): string {
        return this.props.createdAt;
    }

    get updatedAt(): string {
        return this.props.updatedAt;
    }

    with(
        props: MunicipalitiesByDepartmentIdProps
    ): MunicipalitiesByDepartmentIdEntity {
        if (
            this.updatedAt === props.updatedAt &&
            this.uniqId === props.uniqId
        ) {
            return this;
        }
        return new MunicipalitiesByDepartmentIdEntity(props);
    }
}
