import { resolveOpenEndedEndDate } from '@cmz/shared-domain';
import { PrivacyPolicyFilterContract } from '../contracts/privacy-policy-filter.contract';

/**
 * `PrivacyPolicyFilterContract` a `startDate`/`endDate`, et
 * `privacyPolicyFilterVo` ne fait déjà que valider — même cas que
 * `home-filter.entity.ts`.
 */
export function privacyPolicyFilterEntity(
    contract: PrivacyPolicyFilterContract
): PrivacyPolicyFilterContract {
    return {
        ...contract,
        endDate: resolveOpenEndedEndDate(contract.startDate, contract.endDate),
    };
}
