import { GenericRequiredError } from '@cmz/shared-domain';
import { HomeCreateContract } from '../contracts/home-create.contract';
import { HomeCreateValidateContract } from '../contracts/home-create.validate-contract';
import { assertButtonPairComplete } from './assert-button-pair-complete.validator';

export function validateHomeCreate(
    contract: HomeCreateContract
): asserts contract is HomeCreateValidateContract {
    if (!contract.title) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.HOME.FORM.ERROR.CREATE.TITLE_REQUIRE'
        );
    }
    if (!contract.resume) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.HOME.FORM.ERROR.CREATE.RESUME_REQUIRE'
        );
    }
    if (!contract.content) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.HOME.FORM.ERROR.CREATE.CONTENT_REQUIRE'
        );
    }
    if (!contract.image) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.HOME.FORM.ERROR.CREATE.IMAGE_REQUIRE'
        );
    }
    if (!contract.platforms?.length) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.HOME.FORM.ERROR.CREATE.PLATFORMS_REQUIRE'
        );
    }
    if (!contract.startDate) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.HOME.FORM.ERROR.CREATE.START_DATE_REQUIRE'
        );
    }
    if (!contract.endDate) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.HOME.FORM.ERROR.CREATE.END_DATE_REQUIRE'
        );
    }
    assertButtonPairComplete(
        contract.buttonLabel,
        contract.buttonUrl,
        'CONTENT_MANAGEMENT.HOME.FORM.ERROR.CREATE.BUTTON_URL_REQUIRE',
        'CONTENT_MANAGEMENT.HOME.FORM.ERROR.CREATE.BUTTON_LABEL_REQUIRE'
    );
}
