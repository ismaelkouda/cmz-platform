import { DatePeriod } from '@cmz/shared-domain';
import { HomeUpdateContract } from '../contracts/home-update.contract';
import { HomeUpdateProps } from '../props/home-update.props';
import { validateHomeUpdate } from '../validators/home-update.validator';

export function homeUpdateVo(contract: HomeUpdateContract): HomeUpdateProps {
    validateHomeUpdate(contract);
    return {
        uniqId: contract.uniqId,
        title: contract.title,
        resume: contract.resume,
        content: contract.content,
        image: contract.image,
        platforms: contract.platforms,
        period: DatePeriod.create(contract.startDate, contract.endDate),
        buttonLabel: contract.buttonLabel,
        buttonUrl: contract.buttonUrl,
    };
}
