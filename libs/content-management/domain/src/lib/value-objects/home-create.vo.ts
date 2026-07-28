import { DatePeriod } from '@cmz/shared-domain';
import { HomeCreateContract } from '../contracts/home-create.contract';
import { HomeCreateProps } from '../props/home-create.props';
import { validateHomeCreate } from '../validators/home-create.validator';

export function homeCreateVo(contract: HomeCreateContract): HomeCreateProps {
    validateHomeCreate(contract);
    return {
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
