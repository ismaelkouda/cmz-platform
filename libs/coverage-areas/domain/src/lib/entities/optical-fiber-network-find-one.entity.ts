import { Operator } from '../enums/mobile-network-operator.enum';
import { FiberType } from '../enums/optical-fiber-network-type.enum';
import { OpticalFiberNetworkFindOneProps } from '../props/optical-fiber-network-find-one.props';

export class OpticalFiberNetworkFindOneEntity {
    constructor(private readonly props: OpticalFiberNetworkFindOneProps) {}

    get uniqId(): string {
        return this.props.uniqId;
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

    get geomUrl(): string | undefined {
        return this.props.geomUrl;
    }

    get geom(): object | undefined {
        return this.props.geom;
    }

    get updatedAt(): string {
        return this.props.updatedAt;
    }

    with(
        props: OpticalFiberNetworkFindOneProps
    ): OpticalFiberNetworkFindOneEntity {
        if (
            this.updatedAt === props.updatedAt &&
            this.uniqId === props.uniqId
        ) {
            return this;
        }
        return new OpticalFiberNetworkFindOneEntity(props);
    }
}
