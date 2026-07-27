import { RadioRelayLinksEnableContract } from '../contracts/radio-relay-links-enable.contract';
import { RadioRelayLinksEnableValidateContract } from '../contracts/radio-relay-links-enable.validate-contract';
import { validateRadioRelayLinksEnable } from '../validators/radio-relay-links-enable.validator';

export function radioRelayLinksEnableVo(
    contract: RadioRelayLinksEnableContract
): RadioRelayLinksEnableValidateContract {
    validateRadioRelayLinksEnable(contract);
    return contract;
}
