import { SlideEnableValidateContract } from '@cmz/content-management-domain';
import { SlideEnableApiDto } from '../dtos/slide-enable-api.dto';

export function slideEnableMapper(
    validContract: SlideEnableValidateContract
): SlideEnableApiDto {
    return { uniq_id: validContract.uniqId };
}
