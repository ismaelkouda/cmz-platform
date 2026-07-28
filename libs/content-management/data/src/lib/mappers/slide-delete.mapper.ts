import { SlideDeleteValidateContract } from '@cmz/content-management-domain';
import { SlideDeleteApiDto } from '../dtos/slide-delete-api.dto';

export function slideDeleteMapper(
    validContract: SlideDeleteValidateContract
): SlideDeleteApiDto {
    return { uniq_id: validContract.uniqId };
}
