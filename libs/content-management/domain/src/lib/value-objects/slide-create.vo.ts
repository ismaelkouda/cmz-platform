import { DatePeriod } from '@cmz/shared-domain';
import { SlideCreateContract } from '../contracts/slide-create.contract';
import { SlideCreateProps } from '../props/slide-create.props';
import { validateSlideCreate } from '../validators/slide-create.validator';

export function slideCreateVo(contract: SlideCreateContract): SlideCreateProps {
    validateSlideCreate(contract);
    return {
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
