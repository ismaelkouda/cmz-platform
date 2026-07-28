import { GenericRequiredError, isTypeMedia } from '@cmz/shared-domain';
import { SlideUpdateContract } from '../contracts/slide-update.contract';
import { SlideUpdateValidateContract } from '../contracts/slide-update.validate-contract';
import { assertButtonPairComplete } from './assert-button-pair-complete.validator';
import { assertValidMediaPair } from './assert-valid-media-pair.validator';

export function validateSlideUpdate(
    contract: SlideUpdateContract
): asserts contract is SlideUpdateValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.SLIDE.FORM.ERROR.UPDATE.UNIQ_ID_REQUIRE'
        );
    }
    if (!contract.timeDuration) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.SLIDE.FORM.ERROR.UPDATE.TIME_DURATION_REQUIRE'
        );
    }
    if (!contract.type || !isTypeMedia(contract.type)) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.SLIDE.FORM.ERROR.UPDATE.TYPE_REQUIRE'
        );
    }
    if (!contract.platforms?.length) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.SLIDE.FORM.ERROR.UPDATE.PLATFORMS_REQUIRE'
        );
    }
    if (!contract.startDate) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.SLIDE.FORM.ERROR.UPDATE.START_DATE_REQUIRE'
        );
    }
    if (!contract.endDate) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.SLIDE.FORM.ERROR.UPDATE.END_DATE_REQUIRE'
        );
    }
    if (!contract.title) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.SLIDE.FORM.ERROR.UPDATE.TITLE_REQUIRE'
        );
    }
    assertValidMediaPair(
        contract.type,
        contract.image,
        contract.video,
        'CONTENT_MANAGEMENT.SLIDE.FORM.ERROR.UPDATE.IMAGE_REQUIRE',
        'CONTENT_MANAGEMENT.SLIDE.FORM.ERROR.UPDATE.VIDEO_REQUIRE'
    );
    assertButtonPairComplete(
        contract.buttonLabel,
        contract.buttonUrl,
        'CONTENT_MANAGEMENT.SLIDE.FORM.ERROR.UPDATE.BUTTON_URL_REQUIRE',
        'CONTENT_MANAGEMENT.SLIDE.FORM.ERROR.UPDATE.BUTTON_LABEL_REQUIRE'
    );
}
