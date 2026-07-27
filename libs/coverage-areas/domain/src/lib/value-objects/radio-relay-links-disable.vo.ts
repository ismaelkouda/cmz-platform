import { RadioRelayLinksDisableContract } from '../contracts/radio-relay-links-disable.contract';
import { RadioRelayLinksDisableValidateContract } from '../contracts/radio-relay-links-disable.validate-contract';
import { validateRadioRelayLinksDisable } from '../validators/radio-relay-links-disable.validator';

export function radioRelayLinksDisableVo(
    contract: RadioRelayLinksDisableContract
): RadioRelayLinksDisableValidateContract {
    validateRadioRelayLinksDisable(contract);
    return contract;
}
