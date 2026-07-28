import { GenericRequiredError, isTypeMedia } from '@cmz/shared-domain';
import { NewsUpdateContract } from '../contracts/news-update.contract';
import { NewsUpdateValidateContract } from '../contracts/news-update.validate-contract';
import { assertValidMediaPair } from './assert-valid-media-pair.validator';

export function validateNewsUpdate(
    contract: NewsUpdateContract
): asserts contract is NewsUpdateValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.NEWS.FORM.ERROR.UPDATE.UNIQ_ID_REQUIRE'
        );
    }
    if (!contract.type || !isTypeMedia(contract.type)) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.NEWS.FORM.ERROR.UPDATE.TYPE_REQUIRE'
        );
    }
    if (!contract.category) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.NEWS.FORM.ERROR.UPDATE.CATEGORY_REQUIRE'
        );
    }
    if (!contract.title) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.NEWS.FORM.ERROR.UPDATE.TITLE_REQUIRE'
        );
    }
    if (!contract.resume) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.NEWS.FORM.ERROR.UPDATE.RESUME_REQUIRE'
        );
    }
    if (!contract.content) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.NEWS.FORM.ERROR.UPDATE.CONTENT_REQUIRE'
        );
    }
    assertValidMediaPair(
        contract.type,
        contract.image,
        contract.video,
        'CONTENT_MANAGEMENT.NEWS.FORM.ERROR.UPDATE.IMAGE_REQUIRE',
        'CONTENT_MANAGEMENT.NEWS.FORM.ERROR.UPDATE.VIDEO_REQUIRE'
    );
}
