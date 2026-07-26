import { Status } from '../enums/status.enum';
import { MunicipalityProps } from '../props/municipality.props';

export class MunicipalityEntity {
    constructor(private readonly props: MunicipalityProps) {}

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

    with(props: MunicipalityProps): MunicipalityEntity {
        if (
            this.updatedAt === props.updatedAt &&
            this.uniqId === props.uniqId
        ) {
            return this;
        }
        return new MunicipalityEntity(props);
    }
}
