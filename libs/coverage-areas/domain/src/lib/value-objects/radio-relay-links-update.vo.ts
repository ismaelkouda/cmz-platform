import { RadioRelayLinksUpdateContract } from '../contracts/radio-relay-links-update.contract';
import { RadioRelayLinksUpdateValidateContract } from '../contracts/radio-relay-links-update.validate-contract';
import { validateRadioRelayLinksUpdate } from '../validators/radio-relay-links-update.validator';

export function radioRelayLinksUpdateVo(
    contract: RadioRelayLinksUpdateContract
): RadioRelayLinksUpdateValidateContract {
    validateRadioRelayLinksUpdate(contract);
    return contract;
}
