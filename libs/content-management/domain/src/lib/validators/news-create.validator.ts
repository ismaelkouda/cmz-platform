import { GenericRequiredError, isTypeMedia } from '@cmz/shared-domain';
import { NewsCreateContract } from '../contracts/news-create.contract';
import { NewsCreateValidateContract } from '../contracts/news-create.validate-contract';
import { assertValidMediaPair } from './assert-valid-media-pair.validator';

export function validateNewsCreate(
    contract: NewsCreateContract
): asserts contract is NewsCreateValidateContract {
    if (!contract.type || !isTypeMedia(contract.type)) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.NEWS.FORM.ERROR.CREATE.TYPE_REQUIRE'
        );
    }
    if (!contract.category) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.NEWS.FORM.ERROR.CREATE.CATEGORY_REQUIRE'
        );
    }
    if (!contract.title) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.NEWS.FORM.ERROR.CREATE.TITLE_REQUIRE'
        );
    }
    if (!contract.resume) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.NEWS.FORM.ERROR.CREATE.RESUME_REQUIRE'
        );
    }
    if (!contract.content) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.NEWS.FORM.ERROR.CREATE.CONTENT_REQUIRE'
        );
    }
    assertValidMediaPair(
        contract.type,
        contract.image,
        contract.video,
        'CONTENT_MANAGEMENT.NEWS.FORM.ERROR.CREATE.IMAGE_REQUIRE',
        'CONTENT_MANAGEMENT.NEWS.FORM.ERROR.CREATE.VIDEO_REQUIRE'
    );
}
