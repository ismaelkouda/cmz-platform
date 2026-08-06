import { resolveOpenEndedEndDate } from '@cmz/shared-domain';
import { TermsUseFilterContract } from '../contracts/terms-use-filter.contract';

/**
 * `TermsUseFilterContract` a `startDate`/`endDate`, et `termsUseFilterVo` ne
 * fait déjà que valider — même cas que `legal-notice-filter.entity.ts`.
 */
export function termsUseFilterEntity(
    contract: TermsUseFilterContract
): TermsUseFilterContract {
    return {
        ...contract,
        endDate: resolveOpenEndedEndDate(contract.startDate, contract.endDate),
    };
}
