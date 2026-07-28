import { SlideDisableValidateContract } from '@cmz/content-management-domain';
import { SlideDisableApiDto } from '../dtos/slide-disable-api.dto';

export function slideDisableMapper(
    validContract: SlideDisableValidateContract
): SlideDisableApiDto {
    return { uniq_id: validContract.uniqId };
}
