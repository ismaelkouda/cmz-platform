import { RadioRelayLinksDeleteContract } from '../contracts/radio-relay-links-delete.contract';
import { RadioRelayLinksDeleteValidateContract } from '../contracts/radio-relay-links-delete.validate-contract';
import { validateRadioRelayLinksDelete } from '../validators/radio-relay-links-delete.validator';

export function radioRelayLinksDeleteVo(
    contract: RadioRelayLinksDeleteContract
): RadioRelayLinksDeleteValidateContract {
    validateRadioRelayLinksDelete(contract);
    return contract;
}
