import { Status } from '../enums/status.enum';
import { RadioRelayLinksOperator } from '../enums/radio-relay-links-operator.enum';
import { RadioRelayLinksFrequency } from '../enums/radio-relay-links-frequency.enum';

export interface RadioRelayLinksProps {
    uniqId: string;
    name: string;
    operator: RadioRelayLinksOperator;
    frequency: RadioRelayLinksFrequency;
    startDate: Date;
    endDate: Date;
    status: Status;
    updatedAt: string;
}
