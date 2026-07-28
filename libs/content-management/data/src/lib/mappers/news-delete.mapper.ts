import { NewsDeleteValidateContract } from '@cmz/content-management-domain';
import { NewsDeleteApiDto } from '../dtos/news-delete-api.dto';

export function newsDeleteMapper(
    validContract: NewsDeleteValidateContract
): NewsDeleteApiDto {
    return { uniq_id: validContract.uniqId };
}
