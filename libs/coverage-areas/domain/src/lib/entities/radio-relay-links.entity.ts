import { Status } from '../enums/status.enum';
import { RadioRelayLinksOperator } from '../enums/radio-relay-links-operator.enum';
import { RadioRelayLinksFrequency } from '../enums/radio-relay-links-frequency.enum';
import { RadioRelayLinksProps } from '../props/radio-relay-links.props';

export class RadioRelayLinksEntity {
    constructor(private readonly props: RadioRelayLinksProps) {}

    get uniqId(): string {
        return this.props.uniqId;
    }

    get actionsRef(): string {
        return this.props.name;
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

    get status(): Status {
        return this.props.status;
    }

    get updatedAt(): string {
        return this.props.updatedAt;
    }

    with(props: RadioRelayLinksProps): RadioRelayLinksEntity {
        if (
            this.updatedAt === props.updatedAt &&
            this.uniqId === props.uniqId
        ) {
            return this;
        }
        return new RadioRelayLinksEntity(props);
    }
}
