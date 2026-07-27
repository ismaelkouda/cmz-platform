import { RadioRelayLinksOperator } from '../enums/radio-relay-links-operator.enum';
import { RadioRelayLinksFrequency } from '../enums/radio-relay-links-frequency.enum';

export interface RadioRelayLinksCreateValidateContract {
    name: string;
    operator: RadioRelayLinksOperator;
    frequency: RadioRelayLinksFrequency;
    startDate: Date;
    endDate: Date;
}
