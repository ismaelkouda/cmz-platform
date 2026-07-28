import { NewsUnpublishValidateContract } from '@cmz/content-management-domain';
import { NewsUnpublishApiDto } from '../dtos/news-unpublish-api.dto';

export function newsUnpublishMapper(
    validContract: NewsUnpublishValidateContract
): NewsUnpublishApiDto {
    return { uniq_id: validContract.uniqId };
}
