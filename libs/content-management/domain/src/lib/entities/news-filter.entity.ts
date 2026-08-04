import { resolveOpenEndedEndDate } from '@cmz/shared-domain';
import { NewsFilterContract } from '../contracts/news-filter.contract';

/**
 * `NewsFilterContract` a `startDate`/`endDate`, et `newsFilterVo` ne fait
 * déjà que valider — même cas que `home-filter.entity.ts`.
 */
export function newsFilterEntity(
    contract: NewsFilterContract
): NewsFilterContract {
    return {
        ...contract,
        endDate: resolveOpenEndedEndDate(contract.startDate, contract.endDate),
    };
}
