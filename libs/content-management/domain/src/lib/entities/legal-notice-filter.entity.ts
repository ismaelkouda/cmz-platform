import { resolveOpenEndedEndDate } from '@cmz/shared-domain';
import { LegalNoticeFilterContract } from '../contracts/legal-notice-filter.contract';

/**
 * `LegalNoticeFilterContract` a `startDate`/`endDate`, et `legalNoticeFilterVo`
 * ne fait déjà que valider — reproduction directe du pattern de référence,
 * même cas que `home-filter.entity.ts` dans ce même module.
 */
export function legalNoticeFilterEntity(
    contract: LegalNoticeFilterContract
): LegalNoticeFilterContract {
    return {
        ...contract,
        endDate: resolveOpenEndedEndDate(contract.startDate, contract.endDate),
    };
}
