import { RadioRelayLinksCreateContract } from '../contracts/radio-relay-links-create.contract';
import { RadioRelayLinksCreateValidateContract } from '../contracts/radio-relay-links-create.validate-contract';
import { validateRadioRelayLinksCreate } from '../validators/radio-relay-links-create.validator';

export function radioRelayLinksCreateVo(
    contract: RadioRelayLinksCreateContract
): RadioRelayLinksCreateValidateContract {
    validateRadioRelayLinksCreate(contract);
    return contract;
}
