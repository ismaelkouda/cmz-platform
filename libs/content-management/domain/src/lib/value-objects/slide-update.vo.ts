import { DatePeriod } from '@cmz/shared-domain';
import { SlideUpdateContract } from '../contracts/slide-update.contract';
import { SlideUpdateProps } from '../props/slide-update.props';
import { validateSlideUpdate } from '../validators/slide-update.validator';

export function slideUpdateVo(contract: SlideUpdateContract): SlideUpdateProps {
    validateSlideUpdate(contract);
    return {
        uniqId: contract.uniqId,
        timeDuration: contract.timeDuration,
        type: contract.type,
        image: contract.image ?? null,
        video: contract.video ?? null,
        platforms: contract.platforms,
        period: DatePeriod.create(contract.startDate, contract.endDate),
        title: contract.title,
        subtitle: contract.subtitle ?? '',
        content: contract.content ?? '',
        buttonLabel: contract.buttonLabel,
        buttonUrl: contract.buttonUrl,
    };
}
