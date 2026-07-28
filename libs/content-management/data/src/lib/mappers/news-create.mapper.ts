import { NewsCreateValidateContract } from '@cmz/content-management-domain';
import { NewsCreateApiDto } from '../dtos/news-create-api.dto';

export function newsCreateMapper(
    validContract: NewsCreateValidateContract
): NewsCreateApiDto {
    const params = {} as NewsCreateApiDto;
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
