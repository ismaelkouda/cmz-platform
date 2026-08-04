import { resolveOpenEndedEndDate } from '@cmz/shared-domain';
import { SlideFilterContract } from '../contracts/slide-filter.contract';

/**
 * `SlideFilterContract` a `startDate`/`endDate`, et `slideFilterVo` ne fait
 * déjà que valider — même cas que `home-filter.entity.ts`.
 */
export function slideFilterEntity(
    contract: SlideFilterContract
): SlideFilterContract {
    return {
        ...contract,
        endDate: resolveOpenEndedEndDate(contract.startDate, contract.endDate),
    };
}
