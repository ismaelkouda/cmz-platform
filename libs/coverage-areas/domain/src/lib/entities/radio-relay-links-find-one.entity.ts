import { RadioRelayLinksOperator } from '../enums/radio-relay-links-operator.enum';
import { RadioRelayLinksFrequency } from '../enums/radio-relay-links-frequency.enum';
import { RadioRelayLinksFindOneProps } from '../props/radio-relay-links-find-one.props';

export class RadioRelayLinksFindOneEntity {
    constructor(private readonly props: RadioRelayLinksFindOneProps) {}

    get uniqId(): string {
        return this.props.uniqId;
    }

    get name(): string {
        return this.props.name;
    }

    get operator(): RadioRelayLinksOperator {
        return this.props.operator;
    }

    get frequency(): RadioRelayLinksFrequency {
        return this.props.frequency;
    }

    get startDate(): Date {
        return this.props.startDate;
    }

    get endDate(): Date {
        return this.props.endDate;
    }

    get updatedAt(): string {
        return this.props.updatedAt;
    }

    get geomUrl(): string | undefined {
        return this.props.geomUrl;
    }

    get geom(): object | undefined {
        return this.props.geom;
    }

    with(props: RadioRelayLinksFindOneProps): RadioRelayLinksFindOneEntity {
        if (
            this.updatedAt === props.updatedAt &&
            this.uniqId === props.uniqId
        ) {
            return this;
        }
        return new RadioRelayLinksFindOneEntity(props);
    }
}
