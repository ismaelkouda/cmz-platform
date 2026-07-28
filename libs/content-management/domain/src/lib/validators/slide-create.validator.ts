import { GenericRequiredError, isTypeMedia } from '@cmz/shared-domain';
import { SlideCreateContract } from '../contracts/slide-create.contract';
import { SlideCreateValidateContract } from '../contracts/slide-create.validate-contract';
import { assertButtonPairComplete } from './assert-button-pair-complete.validator';
import { assertValidMediaPair } from './assert-valid-media-pair.validator';

export function validateSlideCreate(
    contract: SlideCreateContract
): asserts contract is SlideCreateValidateContract {
    if (!contract.timeDuration) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.SLIDE.FORM.ERROR.CREATE.TIME_DURATION_REQUIRE'
        );
    }
    if (!contract.type || !isTypeMedia(contract.type)) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.SLIDE.FORM.ERROR.CREATE.TYPE_REQUIRE'
        );
    }
    if (!contract.platforms?.length) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.SLIDE.FORM.ERROR.CREATE.PLATFORMS_REQUIRE'
        );
    }
    if (!contract.startDate) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.SLIDE.FORM.ERROR.CREATE.START_DATE_REQUIRE'
        );
    }
    if (!contract.endDate) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.SLIDE.FORM.ERROR.CREATE.END_DATE_REQUIRE'
        );
    }
    if (!contract.title) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.SLIDE.FORM.ERROR.CREATE.TITLE_REQUIRE'
        );
    }
    assertValidMediaPair(
        contract.type,
        contract.image,
        contract.video,
        'CONTENT_MANAGEMENT.SLIDE.FORM.ERROR.CREATE.IMAGE_REQUIRE',
        'CONTENT_MANAGEMENT.SLIDE.FORM.ERROR.CREATE.VIDEO_REQUIRE'
    );
    assertButtonPairComplete(
        contract.buttonLabel,
        contract.buttonUrl,
        'CONTENT_MANAGEMENT.SLIDE.FORM.ERROR.CREATE.BUTTON_URL_REQUIRE',
        'CONTENT_MANAGEMENT.SLIDE.FORM.ERROR.CREATE.BUTTON_LABEL_REQUIRE'
    );
}
