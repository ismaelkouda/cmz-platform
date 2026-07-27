import { Status } from '../enums/status.enum';
import { Operator } from '../enums/mobile-network-operator.enum';
import { FiberType } from '../enums/optical-fiber-network-type.enum';
import { OpticalFiberNetworkProps } from '../props/optical-fiber-network.props';

export class OpticalFiberNetworkEntity {
    constructor(private readonly props: OpticalFiberNetworkProps) {}

    get uniqId(): string {
        return this.props.uniqId;
    }

    get actionsRef(): string {
        return this.props.name;
    }

    get name(): string {
        return this.props.name;
    }

    get operator(): Operator {
        return this.props.operator;
    }

    get fiberConstructorId(): string {
        return this.props.fiberConstructorId;
    }

    get fiberConstructorName(): string {
        return this.props.fiberConstructorName;
    }

    get type(): FiberType {
        return this.props.type;
    }

    get status(): Status {
        return this.props.status;
    }

    get updatedAt(): string {
        return this.props.updatedAt;
    }

    with(props: OpticalFiberNetworkProps): OpticalFiberNetworkEntity {
        if (
            this.updatedAt === props.updatedAt &&
            this.uniqId === props.uniqId
        ) {
            return this;
        }
        return new OpticalFiberNetworkEntity(props);
    }
}
