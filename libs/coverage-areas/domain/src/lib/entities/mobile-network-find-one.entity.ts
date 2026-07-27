import { Operator } from '../enums/mobile-network-operator.enum';
import { Technology } from '../enums/mobile-network-technology.enum';
import { MobileNetworkFindOneProps } from '../props/mobile-network-find-one.props';

export class MobileNetworkFindOneEntity {
    constructor(private readonly props: MobileNetworkFindOneProps) {}

    get uniqId(): string {
        return this.props.uniqId;
    }

    get siteId(): string {
        return this.props.siteId;
    }

    get siteName(): string {
        return this.props.siteName;
    }

    get infrastructureType(): string {
        return this.props.infrastructureType;
    }

    get towerTypeId(): string {
        return this.props.towerTypeId;
    }

    get towerTypeName(): string {
        return this.props.towerTypeName;
    }

    get towerSize(): number {
        return this.props.towerSize;
    }

    get technology(): Technology[] {
        return this.props.technology;
    }

    get operator(): Operator {
        return this.props.operator;
    }

    get radius(): number | undefined {
        return this.props.radius;
    }

    get updatedAt(): string {
        return this.props.updatedAt;
    }

    with(props: MobileNetworkFindOneProps): MobileNetworkFindOneEntity {
        if (
            this.updatedAt === props.updatedAt &&
            this.uniqId === props.uniqId
        ) {
            return this;
        }
        return new MobileNetworkFindOneEntity(props);
    }
}
