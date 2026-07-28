import { NewsPublishValidateContract } from '@cmz/content-management-domain';
import { NewsPublishApiDto } from '../dtos/news-publish-api.dto';

export function newsPublishMapper(
    validContract: NewsPublishValidateContract
): NewsPublishApiDto {
    return { uniq_id: validContract.uniqId };
}
