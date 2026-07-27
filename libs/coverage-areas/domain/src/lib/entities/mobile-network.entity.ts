import { Status } from '../enums/status.enum';
import { Operator } from '../enums/mobile-network-operator.enum';
import { Technology } from '../enums/mobile-network-technology.enum';
import { MobileNetworkProps } from '../props/mobile-network.props';

export class MobileNetworkEntity {
    constructor(private readonly props: MobileNetworkProps) {}

    get uniqId(): string {
        return this.props.uniqId;
    }

    get siteId(): string {
        return this.props.siteId;
    }

    get siteName(): string {
        return this.props.siteName;
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

    get status(): Status {
        return this.props.status;
    }

    get updatedAt(): string {
        return this.props.updatedAt;
    }

    with(props: MobileNetworkProps): MobileNetworkEntity {
        if (
            this.updatedAt === props.updatedAt &&
            this.uniqId === props.uniqId
        ) {
            return this;
        }
        return new MobileNetworkEntity(props);
    }
}
