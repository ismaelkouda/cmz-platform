import { NewsFindOneFilterValidateContract } from '@cmz/content-management-domain';
import { NewsFindOneFilterApiDto } from '../dtos/news-find-one-filter-api.dto';

export function newsFindOneFilterMapper(
    validContract: NewsFindOneFilterValidateContract
): NewsFindOneFilterApiDto {
    return { id: validContract.uniqId };
}
