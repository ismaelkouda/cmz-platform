import { Status } from '../enums/status.enum';
import { RegionProps } from '../props/region.props';

export class RegionEntity {
    constructor(private readonly props: RegionProps) {}

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

    get infrastructureCount(): number {
        return this.props.infrastructureCount;
    }

    get departmentsCount(): number {
        return this.props.departmentsCount;
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

    /** Mise à jour immuable : renvoie la même instance si rien n'a changé. */
    with(props: RegionProps): RegionEntity {
        if (
            this.updatedAt === props.updatedAt &&
            this.uniqId === props.uniqId
        ) {
            return this;
        }
        return new RegionEntity(props);
    }
}
