import { NewsUpdateValidateContract } from '@cmz/content-management-domain';
import { NewsUpdateApiDto } from '../dtos/news-update-api.dto';

export function newsUpdateMapper(
    validContract: NewsUpdateValidateContract
): NewsUpdateApiDto {
    const params = {} as NewsUpdateApiDto;
    params.id = validContract.uniqId;
    params.type = validContract.type;
    params.image_file = validContract.image ?? undefined;
    params.video_url = validContract.video ?? undefined;
    params.category_id = validContract.category;
    if (validContract.subCategory) {
        params.sub_category_id = validContract.subCategory;
    }
    if (validContract.hashtags?.length) {
        params.hashtags = validContract.hashtags;
    }
    params.title = validContract.title;
    params.resume = validContract.resume;
    params.content = validContract.content;
    return params;
}
